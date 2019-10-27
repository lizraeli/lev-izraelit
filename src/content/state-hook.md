---
title: "Implementing the useState Hook"
date: "2019-10-18"
draft: false
path: "/blog/state-hook"
---


### Introduction

This post feature an implementation from the ground-up of the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. This implementation is not nescesarilly equivalent to the official one - The goal is to understand better how to implement something that works like **useState**. Understanding _this_, or any, implementation of a library is not a requirement to using it. However, I do feel that this depth of understanding is useful - with any abstraction, the are advantages to understanding how it is constructed to begin with.

### From stateful classes to stateful functions

When we think of [state](https://en.wikipedia.org/wiki/State_(computer_science)), classes are usualy the first thing that springs to mind, since a [class](https://en.wikipedia.org/wiki/Class_(computer_programming)) can have properties that change over time. This translates directly to class components in React, in which we define and access state variables via [this](https://en.wikipedia.org/wiki/This_(computer_programming)):

```jsx
class Counter {
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


When it comes to functions, their being stateless seems to be natural. A function has an input an output, and usually we strive to keep a function [pure](https://en.wikipedia.org/wiki/Pure_function), so that given the same input to would always return the same output:

```js
const add = (x, y) => x + y
```

In React, we expect a stateless functional component to works the same way as the `add` function, always rendering the same thing given the same **props**:

```jsx
const CountDisplay = ({ count }) => <div>{count}</div>
```

But what if we did want a function to have access to state that is not being passed via **props**? We can begin to achieve this is by giving the function access some global state. For example, we could define a global **count** variable, and modify this variable from within the component.

```jsx
let count = 0;

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={() => count++}>+</button>
  </>
)
```

<iframe class="code-editor" src="../post-1/counter-global" style="overflow: auto;"></iframe>

But this does not work in React. Even though value of **count** changes, the **Counter** component does not re-render to show it - no props are changed, and **Counter** does not get called again. Some frameworks _do_ support this use of global variables - [svelte](https://svelte.dev/repl/417dd8f8a0e84341be3cd08e2f2b394a?version=3.12.1) being one example.

### From parent components to hooks

Since our functional component cannot re-render itself on changes to external state, we need someone who would both manage the state and re-render the component when the state changes. We already have that ability when using a parent class component, by passing a callback as a prop. But in this case, we are trying to go a different route - we want the state to be managed for us in the background. And we will allow the functional component to trigger the state management by calling a function. Let's start by implementing one specific to the **count** we've been using above. 
We will make a custom **MyReact** object that will provide a **useCount** method and a **render** method, to be used like so:


```jsx
const Counter = () => {
  const [count, increment] = MyReact.useCount()
  return (
    <>
      <div>{count}</div>
      <button onClick={increment}>+</button>
    </>
  )
}

MyReact.render(Counter)
```

Above, **MyReact.useCount** returns an array with two elements, the latest value of **count**, and a function to call in order to increment the count. The magic lies in the facts that we go full circle by connecting both the state management and the rendering under one roof. Let's have a look at one way of implementing this:


```js
const MyReact = {
  count: 0,
  component: null,
  increment() {
    this.count += 1;
    ReactDom.render(MyReact.component)
  },
  useCount() {
    return [this.count, this.increment]
  },
  render(component) {
    MyReact.component = component
    ReactDom.render(MyReact.component);
  }
}
```

Going over the above methods:
- When **MyReact.render** is called, the component is registered, and the real **ReactDom.render** method is called with the given component. 
- **useCount** simply returns a reference to **MyReact**'s count variable and its **increment** method.
- The **increment** method updates the count, and calls **ReactDom** to re-render the component.


<iframe class="code-editor" src="../post-1/use-count" style="overflow: auto;"></iframe>


Now this is beginning to work, at least in the above example. We still have an object that keeps state, but this can happen "behind the scenes". The main thing we needed to do was to join the rendering and state management, so that we are able to re-render whenever the state changes. 

Next, we will want to get to something more general than **useCount**. The first step to achieving this is by changing the variable name from **count** to state, and the method names to **useState** and  **setState**. Also, instead of having **MyReact** determine the initial value of the state, we will have the caller pass it as an argument:

```js
const MyReact = {
  state: 0,
  component: null,
  setState(newValue) {
    this.state = newValue;
    ReactDom.render(component)
  },
  useState() {
    return [this.state, this.setState]
  },
  render(component) {
    this.component = component
    ReactDom.render(component);
  }
}
```

Now it will be the **Counter** component who will pass the inital value and determine how the state will be used:

```jsx
const Counter = () => {
  const [count, setCount] = MyReact.useState(0);
  const increment = () => {
    setCount(count + 1);
  }
  return (
    <>
      <div> {count} </div>
      <button onClick={increment}>+</button>
    </>
  )
}
```

A second issue is that **MyReact** currently allows creating only a single state variable. Any subsequent call to **MyReact.useState** will overwrite the single **state** variable. This can be resolved by having **MyReact** store an array of state variables rather than a single one. But now we need some way to know, whenever **setState** is being called, which state variable is the one we want to change. We can do that by relying on the call order:

```jsx
const MyCounter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
}
```

As long as the **MyReact.useState** methods are not called inside a conditional block, the two calls would always be executed in the same order. . But now we will also need to store not only state values, but also the related **setState** calls. We'll transform the single **state** value into an array of **stateHolder**s - each state holder being an object with a state value and a **setState** method. We will also need to store an index indicating the latest state holder we have refrenced, which we will be reset to **0** whenver any **setState** is being called. Feel free to jump to the example and explanation below.

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
            ReactDom.render(MyReact.component)
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
      ReactDom.render(MyReact.component);
    }
}
```

Heres an example using the updated **MyReact**:

<iframe class="code-editor" src="../post-1/use-state-arr" style="overflow: auto;"></iframe>

One illuminating aspect of the above can be gleaned by opening the devtools and observing the output of the **console.log** statements inside **useState**. On each render of the component, **useState** will be called twice. On the initial render, two **stateHolder** objects will be creating. When we click on either of the **+** buttons, **setState** is called once, which leads to the currentIndex to be reset to 0, and to the component being re-rendered.