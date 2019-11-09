---
title: "Implementing the useState Hook"
date: "2019-11-06"
draft: false
path: "/blog/state-hook"
---


### Introduction

I felt uneasy the first time I read about [hooks](https://reactjs.org/docs/hooks-intro.html) in React. Their inner workings seemed too magical. I remember looking at a simple example and trying to make sense of how it worked under the hood:


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


It was clear what the example was _doing_. You click on the **+** button, and the count is incremented. Calling `setCount` resulted in the `count` variable being updated, but where was the value of `count` being stored? And how was the component being re-rendered whenever `setCount` was called? Even as I was making apps that used hooks, I still did not clear answers. So I started searching for sources that described how hooks work under the hood. Some of these helped, but still, I lacked an intuitive understanding, like I had with classes. Finally, I decided to try and reimplement some of the core hooks myself.

This post details my process of reimplementing the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. For me, the goal was never to exactly  match the real implementation. The goal was to gain some insight into how some like `useState` _can_ be implemented.

### Classes and state

Generally speaking, [state](https://en.wikipedia.org/wiki/State_(computer_science)) includes any value that changes over time, when that value needs to be remembered  by the program. For React class components, the concept of state was translated directly to the `state` object. The idea of this was to encapsulate all (or at least most) of the changing values in one place. We initialized the `state` object with some default values when the class is created, and then modify these values indirectly by calling the `setState` method:


```jsx
class Counter extends React.Component {
    constructor() {
      this.state = {
        count: 0
      }
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

The `setState` method recreates the component's state by merging the existing state object with the new object that was passed to it. If we were to implement the base  **setState**, it would look something like this:

```js
  ...
  setState(newPartialState) {
    this.state = {
      ...this.state,
      ...newPartialState
    }
    // later this component will be re-rendered
  }
  ...
```

### Functions and State

Unlike an object or class, a function cannot internally maintain state. In React prior to hooks, a functional component and a _stateless_ function component were the same thing. So I'd come to expect a functional component to work the same way as a simple **add** function - given the same input, I would expect to get the same output. If I needed state, I would create a parent class component, and have that component pass the state, and a callback to change the state:

```jsx
const Counter = ({ count, setCount }) => (
  <>
    <div>count: {count}</div>
    <button onClick={() => setCount(count + 1)}>+</button>
  </>
)

class CounterCountainer extends React.Component {
  // shorthand to using a constructor
  state = {
    count: 0
  }

  setCount = (newCount) => {
    this.setState({
      count: newCount
    }) 
  }

  render() {
    return (
      <Counter count={this.state.count} setCount={this.setCount}>
    )
  }
}
```

In a sense, the `useState` hook gives us a way to "tell" React that we need something _like_ that parent class component, without having to create it ourselves. We simply tell React that we want to _use_ state, and React will create that state for us.

### Functions that use State

Before beginning to reimplement `useState` I tried to have a functional React component that directly modifies a variable. I defined a global `count` variable, and tried modifying this variable inside the component.

```jsx
let count = 0;

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => count++}>+</button>
  </>
)
```

This didn't quite work. Even though value of `count` was chaing, the `Counter` component did not re-render to show it. I stil need something similar to a `setState` call, so that I could rerender the component whenever the state  was changed. So I made a `setCount` function that did just that:


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

This worked! To ensure `count` and `setCount` were always used together, I made them into properties of an object. I called this object `MyReact`:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDOM.render(<Counter />)
  }
}
```

To make things even clearer, I wanted to have a single function return both  a  `count` and `setCount`. I added a function called `useCount` to `MyReact`, and had it return an object with `count` and `setCount` as properties.

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDom.render(<Counter />)
  },
  useCount() {
    return { 
      count: MyReact.count,
      setCount: MyReact.setCount
    }
  }
}

const Counter = () => {
  const { count, setCount } = MyReact.useCount()
  ...
}
```

Next, I wanted to pass an initial value when calling `useCount`, instead of having `useCount` decide what this value should be. This presented me with a challenge - we only need to set `count` to the passed-in value the first time `useCount` is called. My solution was adding a `stateInitialized` variale - it would initially be set to `false`, and is set to `true` the first time `useCount` is called, after the `count` had been set to the intial value.

```jsx
const MyReact = {
  count: null,
  stateInitialized: false,
  // ...
  // ...
  // ...
  useCount(initialValue) {
    if (!MyReact.stateInitialized) {
      MyReact.count = initialValue;
      MyReact.stateInitialized = true;
    }
    return { 
      count: MyReact.count,
      setCount: MyReact.setCount
    }
  }
};

const Counter = () => {
  const { 
      count,
      setCount,
    } = MyReact.useCount(0)
  // ...
}
```

Next, I wanted to make `MyReact` more generic and reusable. The `count` and `setCount` variables were too specific to the needs of the `Counter` components. So I changed the name of `count` to `state`, and the method names to `useState` and  `setState`.


```js
const MyReact = {
  state: null,
  stateInitialized: false,
  component: null,
  setState(newState) {
    MyReact.state = newState;
    ReactDOM.render(<Counters/>, rootElement);
  },
  useState(initialValue) {
    if (!MyReact.stateInitialized) {
      MyReact.stateInitialized = true;
      MyReact.state = initialValue;
    }
    return [MyReact.state, MyReact.setState];
  }
};
```

I also added a `render` method to `MyReact`, in order to save the component that was being rendered.

```jsx
const MyReact = {
  ...
  setState(newState) {
    MyReact.state = newState;
    ReactDOM.render(<Counters/>, rootElement);
  },
  ...
  render() {

  }
};
```



### Multiple state variables

The above was working, and seemed like I was going in the right direction. But my implementation still had a number of things missing. For one, I was only able to use `MyReact.useState` for a single variable. Any subsequent call to `MyReact.useState` were overwriting the variable that was defined before. In order to allow `MyReact` to manage multiple state variables, I decidedto store these in an array. Now I needed some way to know, each time `setState` was being called, *which* state variable was the one that I needed to change. I did that by  by relying on the call order to `useState`. Take, for example, the two subsequent calls below:

```jsx
const MyCounter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
}
```

The `MyReact.useState` methods would always be executed in the same order, first returning the values of `count1`, `setCount1`, and then returning the values of `count2`, `setCount2`. As long as `MyReact.useState(0)` is not called in a conditional block, the two calls would always happen in these order. 

Now I also needed each state variable to have its own `setState` method. To do this, I made an array of objects, each storing the `state` value *and* the corresponding `setState` calls. I gave each of these objects the name `stateHolder`. Combined together, these formed `stateHolderArr`.

I also added a  `currentStateIndex` variable to store store the index of the latest `stateHolder` that was refrenced. The `currentStateIndex` would be reset to `0` whenver *any* `setState` was called. When the value of `currentStateIndex` became equal to the length of the array, that meant that a new `stateHolder` needed to be created.

```js
const MyReact = {
    stateHolderArr: [],
    currentStateIndex: 0,
    component: null,
    useState(initialValue) {
      const { currentStateIndex, stateHolderArr } = MyReact;

      let stateHolder;
      // if we reached beyond the last element of the array
      // We will need create a new state holder
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

Here's an example using the updated `MyReact`:

<iframe class="code-editor" src="../post-1/use-state-arr" style="overflow: auto;"></iframe>

To follow how this all works, you can open the browser's devtools and look at the `console.log` log output from inside `useState`. On each render of the component, `useState` will be called twice. On the initial render, two `stateHolder` objects will be creating. When we click on either of the `+` buttons, `setState` is called once, which leads to the currentIndex to be reset to 0, and to the component being re-rendered.

### Conclusion

So, I arrived at something pretty similar to React's `useState` hook. I cannot say if this process has made me a better React developer, but I do feel like this has helped me think more deeply about coding in general. It's important to remember that while we may be using hooks now, we are not _bound_ to be using them forever.