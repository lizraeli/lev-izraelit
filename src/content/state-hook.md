---
title: "Implementing the useState Hook"
date: "2019-11-06"
draft: false
path: "/blog/state-hook"
---


### Introduction

I felt uneasy the first time I read about [hooks](https://reactjs.org/docs/hooks-intro.html) in React. Their inner workings seemed too magical. I remember looking at a simple example, and trying to make sense of how hooks worked:


```jsx
function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
        The count is: {count}
        <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}
```


So **setCount** was updating the **count** variable, but who was storing the current value of the count, and where? And how was the component being re-rendered whenever **setCount** was called? Even as I adoped hooks into my codebases I had few answers. So I started searching for sources that described how hooks work under the hood. These helped, but still I lacked an intuitive understanding of hooks. Finally I decided to try and re-implement some of the core hooks myself.

This post details my process of re-implementing the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. This implementation need not match the real one. The goal is to gain a deeper understanding into of how something like **useState** _can_ be implemented.

### What is state

Generally speaking, [state](https://en.wikipedia.org/wiki/State_(computer_science)) includes any value that changes over time, when that value needs to be _remembered_ by the program for later use. When a component stores a value locally and modifies this becomes the state of that component. 

### Stateful classses

In react classes, the concept of state is translated directly into the **state** variable. We create initial values inside the **state** object, and then modify these values indirectly by calling the **setState** method:


```jsx
class Counter extends React.Component {
    // shorthand to using a consturctor
    state = {
      count: 0
    }

    increment = () => {
      this.setState({
        count: this.state.count + 1
      }) 
    }

    render() {
      return (
        <>
          <div>count: {this.state.count}</div>
          <button onClick={this.increment}>+</button>
        </>
      )
    }
}
```

The inherited state method recreates the component's state by merging the existing state object with the new object that was passed. If I were to implement the base  **setState**, it would look something like this:

```js
class BaseReactComponent {
  setState(newPartialState) {
    this.state = {
      ...this.state,
      ...newPartialState
    }
    // later this component will be re-rendered
  }
}

```

### Functions without State

Unlike the object or class, a function cannot internally maintain state. In react prior to hooks, a functional component and a _stateless_ function component were the same thing. Intuitively this makes sense - when we think about a simple function, given the same input, it would return the same output every time:

```js
const add = (x, y) => x + y
```

In React before hooks, I'd come to expect a functional component to work the same way as a simple **add** function. This made functional components very easy to understand - the only changes we could make would be to state that passed to the function, via a callback that is also passed to the function:

```jsx
const Counter = ({ count, increment }) =>  (
  <>
    <div>count: {count}</div>
    <button onClick={increment}>+</button>
  </>
)
```

### Functions _with_ State

So I decided to try and make a functional react component that directly modifies state. As a first attempt, I tried defining a global **count** variable, and modifying this variable within the component.

```jsx
let count = 0;

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => count++}>+</button>
  </>
)
```

This didn't quite work. Even though value of **count** was chaing, the **Counter** component did not re-render to show it. I stil need something similar to a **setState** call, so that I could rerender the component whenever the state  was changed. So I made a **setCount** function that did just that:


```jsx
let count = 0

function setCount(newCount) {
  count = newCount
  ReactDOM.render(<Counter />)
}

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => setCount(count++)}>+</button>
  </>
)
```

This worked! To ensure **count** and **setCount** were used together, I made them into properties of the an object. I called this object **MyReact**:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDOM.render(<Counter />)
  }
}
```

I could then use **MyReact** within the **Counter** component by destructuring its properties:

```jsx

const Counter = () => {
  const { count, setCount } = MyReact
  return (
    <>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </>
  )
}
```

To make this even cleaner, I added a function called **useCount** to **MyReact**, that returned  both **count** and **setCount** together, as the only two elements of an array:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDom.render(<Counter />)
  },
  useCount() {
    return [count, setCount]
  }
}

const Counter = () => {
  const [count, setCount] = MyReact.useCount()
  ...
}
```

Next, I wanted to pass an initial value when calling **useCount**, instead of having **useCount** decide what it is. This presented me with a challenge - I only needed to set the passed-in value the first time **useCount** was called. After several attempts, I decided on adding a property to **MyReact** called `stateInitialized` which defaults to false, and is set to **true** the first time **useCount** is called, after the **count** had been initialized.

```jsx
const MyReact = {
  state: null,
  stateInitialized: false,
  setCount(newCount) {
    MyReact.count = newCount;
    ReactDOM.render(<Counter />, rootElement);
  },
  useCount(initialValue) {
    if (!MyReact.stateInitialized) {
      MyReact.count = initialValue;
      MyReact.stateInitialized = true;
    }
    return [MyReact.count, MyReact.setCount];
  }
};

const Counter = () => {
  const [count, setCount] = MyReact.useCount(0)
  return (
    <>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </>
  )
}
```


Next, I wanted to make **MyReact** more reusable. The **count** and **setCount** variables were too specific to the needs of the **Counter** components. So I changed the name of **count** to **state**, and the method names to **useState** and  **setState**. I also added a **render** method to **MyReact**, in order to save the component that was being rendered.


```js
const MyReact = {
  state: null,
  stateInitialized: false,
  component: null,
  setState(newState) {
    MyReact.state = newState;
    ReactDOM.render(<MyReact.component/>, rootElement);
  },
  useState(initialValue) {
    if (!MyReact.stateInitialized) {
      MyReact.stateInitialized = true;
      MyReact.state = initialValue;
    }
    return [MyReact.state, MyReact.setState];
  },
  render(component) {
    MyReact.component = component;
    ReactDOM.render(<MyReact.component />, rootElement);
  }
};
```

### Multiple state variables

The above was working, and seemed like I was going in the right direction. But my implementation still had a number of things missing. For one, I was only able to use **MyReact.useState** for a single variable. Any subsequent call to **MyReact.useState** were overwriting the variable that was defined before. In order to allow **MyReact** to manage multiple state variables, I decidedto store these in an array. Now I needed some way to know, each time **setState** was being called, *which* state variable was the one that I needed to change. I did that by  by relying on the call order to **useState**. Take, for example, the two subsequent calls below:

```jsx
const MyCounter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
}
```

The **MyReact.useState** methods would always be executed in the same order, first returning the values of **count1**, **setCount1**, and then returning the values of **count2**, **setCount2**. As long as **MyReact.useState(0)** is not called in a conditional block, the two calls would always happen in these order. 

Now I also needed each state variable to have its own **setState** method. To do this, I made an array of objects, each storing the **state** value *and* the corresponding **setState** calls. I gave each of these objects the name **stateHolder**. Combined together, these formed **stateHolderArr**.

I also added a  **currentStateIndex** variable to store store the index of the latest **stateHolder** that was refrenced. The **currentStateIndex** would be reset to **0** whenver *any* **setState** was called. When the value of **currentStateIndex** became equal to the length of the array, that meant that a new **stateHolder** needed to be created.

```js
const MyReact = {
    stateHolderArr: [],
    currentStateIndex: 0,
    component: null,
    useState(initialValue) {
      const { currentStateIndex, stateHolderArr } = MyReact;

      let stateHolder;
      // if we reached beyond the last element of the array
      // We will need 
      if (currentStateIndex === stateHolderArr.length){
        stateHolder = {
          state: initialValue,
          setState(newValue) {
            stateHolder.state = newValue
            MyReact.currentStateIndex = 0;
            ReactDom.render(<MyReact.component />)
          }
        }
        stateHolderArr.push(stateHolder)
      } else {
        stateHolder = stateHolderArr[currentStateIndex]
      }
  
      MyReact.currentStateIndex += 1;
      return [stateHolder.state, stateHolder.setState]
    },
    render(component) {
      MyReact.component = component
      ReactDom.render(<MyReact.component />);
    }
}
```

Here's an example using the updated **MyReact**:

<iframe class="code-editor" src="../post-1/use-state-arr" style="overflow: auto;"></iframe>

To follow how this all works, you can open the browser's devtools and look at the **console.log** log output from inside **useState**. On each render of the component, **useState** will be called twice. On the initial render, two **stateHolder** objects will be creating. When we click on either of the **+** buttons, **setState** is called once, which leads to the currentIndex to be reset to 0, and to the component being re-rendered.

### Conclusion

So, I arrived at something pretty similar to React's **useState** hook. I cannot say if this process has made me a better React developer, but I do feel like this has helped me think more deeply about coding in general. It's important to remember that while we may be using hooks now, we are not _bound_ to be using them forever.