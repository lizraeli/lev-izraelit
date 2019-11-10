---
title: "Implementing the useState Hook"
date: "2019-11-09"
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


It was clear what the example was _doing_. You click the **+** button, and the count is incremented. But where was the value of `count` being stored, and how were we getting the correct value, even though `0` was passed every time? Even as I started incorporating hooks into my apps, I had few clear answers. So I started searching for sources that described how hooks work under the hood. Finally, I decided to try and reimplement some of the core hooks myself.

This post details my process of reimplementing the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. For me, the goal was never to exactly  match the real implementation. The goal was to gain some insight into how some like `useState` _can_ be implemented.

### Classes and state

Generally speaking, [state](https://en.wikipedia.org/wiki/State_(computer_science)) includes any value that changes over time, when that value needs to be remembered  by the program. For React class components, the concept of state is translated directly into the `state` object. The idea is to encapsulate all (or at least most) of the changing values in one place. We initialized the `state` object with some default values when the class is created, and then modify these values indirectly by calling the `setState` method:


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

The `setState` method recreates the component's state by merging the existing state  with the new object that was passed as an argument. If we were to implement the base  **setState**, it would look something like this:

```js
  setState(newPartialState) {
    this.state = {
      ...this.state,
      ...newPartialState
    }
    // rerender the component
  }
```

### Functions and State

Unlike an object or class, a function cannot internally maintain state. This is the reason, in React, that a functional component is also called a _stateless_ functional component. So I'd come to expect a functional component to work the same way as a simple **add** function - given the same input, I would expect to always get the same output. If I needed state, I would have to create a parent class component, and have _that_ component pass down the state:

```jsx
// The Counter functional component will receive 
// the count and a setCount function 
// from a parent class component
const Counter = ({ count, setCount }) => (
  <>
    <div>count: {count}</div>
    <button onClick={() => setCount(count + 1)}>+</button>
  </>
)

class CounterContainer extends React.Component {
  // shorthand for using a constructor
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

In a sense, the `useState` hook gives us a way to _tell_ React that we need something like that parent class component, without having to create it ourselves. We simply tell React that we want to _use_ state, and React will create that state for us.

### Functions that use state

As a first attempt around creating a parent class component, we could try and have a function component directly modify a global variable:

```jsx
let count = 0;

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => count++}>+</button>
  </>
)
```

This, however, doesn't quite work. Even though value of `count` is changing, the `Counter` component does not re-render to show the new value. We stil need something similar to a `setState` call, which would rerender the component when the value of `count` changes. We can make a `setCount` function that does just that:


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

This works! To ensure `count` and `setCount` are always used together, we can put them inside an object. Let's call this object `MyReact`:

```jsx
const MyReact = {
  count: 0,
  setCount(newCount) {
    this.count = newCount;
    ReactDOM.render(<Counter />)
  }
}
```

To make things even clearer, let's create a `useCount` function that returns an object with  `count` and `setCount`:

```jsx
  useCount() {
    return { 
      count: this.count,
      setCount: this.setCount
    }
  }
```

Next, we would want to allow the caller of `useCount` to pass an initial value. This presented us with a problem.  we only need to set the initial value on the very first time that `useCount` is called. On any subsequent call, we would want use the existing value of `useCount`. One solution is adding a `stateInitialized` variable. We'll initially set it to `false`, and set it to `true` on the first time that  `useCount` is called:

```jsx
  stateInitialized: false,
  useCount(initialValue) {
    if (!this.stateInitialized) {
      this.count = initialValue;
      this.stateInitialized = true;
    }
    // ...
  }
```
 
Now that we got the basics working, we can make `MyReact` more general by renaming the `count` variable to `state`, and the method names to `useState` and  `setState`. Also, we'll return `state` and `setState` in an array, to allow for easy renaming: 


```js
const MyReact = {
  state: null,
  stateInitialized: false,
  setState(newState) {
    this.state = newState;
    ReactDOM.render(<Counter/>, rootElement);
  },
  useState(initialValue) {
    if (!this.stateInitialized) {
      this.stateInitialized = true;
      this.state = initialValue;
    }
    return [this.state, this.setState];
  }
};

const Counter = () => {
  const [count, setCount] = MyReact.useState(0)
  // ...
}
```

We can also added a `render` method to `MyReact`, and call this method instead of calling `ReactDOM.render`. This will allow us to save the `Counter` component as part of `MyReact`:

```jsx
  // ...
  setState(newState) {
    this.state = newState;
    ReactDOM.render(<this.component/>, this.rootElement);
  },
  // ...
  render(component, rootElement) {
    this.component = component;
    this.rootElement = rootElement;
    ReactDOM.render(<this.component/>, this.rootElement);
  }
  // ..

// later 
MyReact.render(Counter)
```

### Multiple state variables

The next step is to enable `MyReact` to manage multiple variables. The first step is to replace the single `state` variable with an array of state variables. Now we would need some way to know, each time `setState` was being called, *which* state variable is the one that needs to change. We can achieve this by relying on the call order to `useState`. Take, for example, the two subsequent calls below:

```jsx
const MyCounter = () => {
  const [count, setCount] = MyReact.useState(0);
  const [name, setName] = MyReact.useState("");
}
```

The `MyReact.useState` methods would always be executed in the same order, first returning the values of `count1`, `setCount1`, and then returning the values of `name`, `setName`. This will be the case as as long as `MyReact.useState` is _not_ called inside conditional block, where the condition isn't always true or false. 

Now, since we have two or more state variables, each state variable will need to have a corresponding `setState` method. We can achieve this by using an array of objects, where object stores the `state` value *and* the corresponding `setState` method. We can call each of the objects a `statePair` and the arrays that holds them `stateArray`.

```jsx
[{ value: count, setCount }, { value: name, setName }, ...]
```

We now need a way to track which element of the array is being used at any given time. For example, having the two calls to `MyReact.useState` above, the first call should return the `[count, setCount]` and the second call should return `[name, setName]`. We can use a variable to track this value. Let's call this variable `currentStateIndex`.


 The `currentStateIndex` will be reset to `0` whenever *any* `setState` is called. When the value of `currentStateIndex` becomes equal to the length of the array, we will create a new pair of `state` an `setState`.

```js
const MyReact = {
  stateArr: [],
  currentStateIndex: 0,
  component: null,
  useState(initialValue) {
    // if we reached beyond the last element of the array
    // We will need create a new state
    if (this.currentStateIndex === this.stateArr.length) {
      const statePair = {
        value: initialValue,
        setState(newValue) {
          statePair.value = newValue;
          MyReact.currentStateIndex = 0;
          ReactDOM.render(<MyReact.component />, rootElement);
        }
      };

      this.stateArr.push(statePair);
    }
    // get the current state and setState before incrementing the index
    const currentStatePair = this.stateArr[this.currentStateIndex];
    this.currentStateIndex += 1;
    return [currentStatePair.value, currentStatePair.setState];
  },
  render(component, rootElement) {
    this.component = component;
    this.rootElement = rootElement;
    ReactDOM.render(<this.component />, this.rootElement);
  }
};
```

### Example

Given the above implementation, let's try and follow an example of a component that uses two state variables:

```jsx
const Counter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
  return (
    <>
      <div>
        The first count is: {count1}
        <button onClick={() => setCount1(count1 + 1)}>+</button>
      </div>
      <div>
        The second count is: {count2}
        <button onClick={() => setCount2(count2 + 1)}>+</button>
      </div>
    </>
  )
}

MyReact.render(Counter)
```

Below is a sandbox with `MyReact` and the `Counter` component:

<iframe
     src="https://codesandbox.io/embed/amazing-goldwasser-t6nb5?fontsize=14&hidenavigation=1"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="setState-impl"
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
   ></iframe>


Following the example, these would be the inital values of `MyReact`:

```jsx
MyReact {  
  stateArr: [],
  currentStateIndex: 0,
  component: null,
}
```

_After_ the first call to `useState`:

```jsx
const Counter = () => {
  const [count1, setCount1] = MyReact.useState(0); // <--
```

```jsx
MyReact {  
  stateArr: [{ value: 0, setState: fn() }],
  currentStateIndex: 1,
  component: Counter,
}
```

_After_ the second call to `useState`:

```jsx
const Counter = () => {
  const [count1, setCount1] = MyReact.useState(0); 
  const [count1, setCount1] = MyReact.useState(0); // <--
```

```jsx
MyReact {  
  stateArr: [{ value: 0, setState: fn() }, { value: 0, setState: fn() }],
  currentStateIndex: 2,
  component: Counter,
}
```

Now, if the first **+** button is pressed, the values of `MyReact` would become:

```jsx
MyReact {  
  stateArr: [{ value: 1, setState: fn() }, { value: 0, setState: fn() }],
  currentStateIndex: 0,
  component: Counter,
}
```

Which would lead to `Counter` being rendered again. On the subsequent calls to `useState`, only the `currentStateIndex` will be incremented, while the existing elements of `stateArr` will be returned.

### Conclusion

So, we've arrived at something pretty similar to React's `useState` hook. I cannot say if this process has made me a better React developer, but I do feel that this has helped me think more deeply about programming in general. It can be worthwhile understanding how abstractions can be implemented - this can help us better understand the ones that have already been made, and to make new abstractions of our own.

