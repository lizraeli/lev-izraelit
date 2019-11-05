---
title: "Implementing the useState Hook"
date: "2019-10-18"
draft: false
path: "/blog/state-hook"
---


### Introduction

I felt uneasy the first time I saw [hooks](https://reactjs.org/docs/hooks-intro.html) in React. They seemed a bit too magical. I remember looking at my first simple example that was using hooks, and thinking that it didn't make sense:


```js
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


So **setCount** was updating the **count** variable, but who was storing the latest value, and where. And how was the component magically re-rendered whenever **setCount** was called? I'll admit that I had only few answers even as I was using hooks in my daily development. A few time I tried to read about hooks under the hood. Some of these [articles](https://medium.com/the-guild/under-the-hood-of-reacts-hooks-system-eb59638c9dba) described the react source and talked about why call order mattered. But at the time these seemed to go over my head. Finally I decided to try and re-implement some hooks from the ground up. This post represents one such effort.

In this post, we will be creating our own implementation of the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. The goal is not to reproduce the offical implementation, but to gain a deeper understanding of how something _like_ **useState** can be implemented. A personal benefit of this post for me, (besides the act of sharing my endless sea of knowledge with the world) is to decrease my sense of discomfort at using technology who'se implementation I cannot begin to understand. 

### What is state

Generally speaking, [state](https://en.wikipedia.org/wiki/State_(computer_science)) includes any value that changes over time, when that value needs to be _remembered_ (i.e. stored in a variable) by the program for later use. If a component needs to remember value locally, this becomes the state of that component. 

### Stateful classses

In react, when working with class components, we define most changing variables on the **state** property of the class. We then modify those variables indirectly by calling the inherited **setState** method:


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

The inherited state method recreates the component's state by merging the existing state object with the new partial state object that that was pass. We can think about it like this:  


```js
class Component {
  setState(newPartialState) {
    this.state = {
      ...this.state,
      ...newPartialState
    }
    // rerender the component
  }
}

```


### Stateless function

A function cannot internally maintain state. A function usually relies on its input and output, so that given the same input, it would always return the same output:

```js
const add = (x, y) => x + y
```

In React, we've come to expect a stateless functional component to works the same way as the **add** function above, always rendering the same thing given the same **props**:

```jsx
const CountDisplay = ({ count }) => <div>{count}</div>
```

We can get closer to the class idea of state, by defining variables outside of the function. As a first try, we could define a global **count** variable, and modify this variable from within the component.

```jsx
let count = 0;

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => count++}>+</button>
  </>
)
```

But this does not quite work. Even though value of **count** changes, the **Counter** component does not re-render to show it. We stil need something similar to a `setState` call, so that we can rerender the component whenver the state is changed:


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

To ensure **count** and **setCount** are used together, we can the two into properties of the an object. We'll call this object **MyReact**:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDOM.redner(<Counter />)
  }
}

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

To make the above even cleaner, we'll add a function called **useCount** to **MyReact**, that will return  both **count** and **setCount**:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDom.redner(<Counter />)
  },
  useCount() {
    return [count, setCount]
  }
}

const Counter = () => {
  const [count, setCount] = MyReact.useCount()
  return (
    <>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </>
  )
}
```

Now, what if we want an initial value that's not zero. We can make this possible by having the caller of **useCount** pass a variable that sets the initial value.

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
      MyReact.stateInitialized = true;
      MyReact.count = initialValue;
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

In order to know if the **count** variable needs to be initialized, we store a **stateInitialized** variable with the initial value of **false**. On the first call to **useCount**, we initialize the count variable, and set **stateInitialized** to **true**. 

Next, we will want to make **MyReacy** more  generic (i.e. reusable). We'll change variable name from **count** to **state**, and the method names to **useState** and  **setState**. We will also add a **render** method to **MyReact**, that will save the component being rendered. We will then be able to use the locally stored component when rerendering.


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


const Counter = () => {
  const [count, setCount] = MyReact.useState(0)
  return (
    <>
      <div>{count}</div>
      <button onClick={() => setCount(count + 1)}>+</button>
    </>
  )
}

MyReact.render(Counter)
```

Above, the **setState** method is only meanigful if **useState** was previously called. To enforce this in the code level, we can create the **setState** function on the fly when **useState** is called:


```jsx
const MyReact = {
  state: null,
  stateInitialized: false,
  component: null,
  useState(initialValue) {
    if (!MyReact.stateInitialized) {
      MyReact.stateInitialized = true;
      MyReact.state = initialValue;
    }

    const setState = (newState) => {
      MyReact.state = newState;
      ReactDOM.render(<MyReact.component />, rootElement);
    }

    return [MyReact.state,setState];
  },
  render(component) {
    MyReact.component = component;
    ReactDOM.render(<MyReact.component />, rootElement);
  }
};
```

### Multiple state variables

Currently, Any subsequent call to **MyReact.useState** will overwrite the initially defined variable. In order to allow **MyReact** to manage multiple state variables,  we will have it store them in an array of state variables. But now we'll need some way to know, each time **setState** is being called, *which* state variable is the one we want to change. We can do this by relying on the call order to **useState**. Take, for example, the two subsequent calls below:

```jsx
const MyCounter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
}
```

As long as the **MyReact.useState** methods are *not* called inside a conditional block, the two calls will always be executed in the same order. 

Now we will also need each state variable to have its own **setState** method. To do this, will use an array to store pairs of the **state** value *and* the corresponding **setState** calls. We'll call these **stateHolder**s.

We will create a variable **currentStateIndex** that will store an index indicating the latest **stateHolder** we have refrenced. The **currentStateIndex** will be reset to **0** whenver *any* **setState** is called. When the value of **currentStateIndex** is equal to the length of the array, this means that a new **stateHolder** needs to be created.



```js
const MyReact = {
    stateHolderArr: [],
    currentStateIndex: 0,
    component: null,
    useState(initialValue) {
      const { currentStateIndex, stateHolderArr } = MyReact;
      let stateHolder;
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

One illuminating aspect of the above can be gleaned by opening the devtools and observing the output of the **console.log** statements inside **useState**. On each render of the component, **useState** will be called twice. On the initial render, two **stateHolder** objects will be creating. When we click on either of the **+** buttons, **setState** is called once, which leads to the currentIndex to be reset to 0, and to the component being re-rendered.

### Conclusion

We've achieved a working version of a **useState** hook built from the ground up. The next steps would be to see how we can make this work for any number of components.