---
title: "Implementing the useState Hook"
date: "2019-10-18"
draft: false
path: "/blog/state-hook"
---


### Introduction

This post features an implementation from the ground-up of the [useState](https://reactjs.org/docs/hooks-overview.html#state-hook) hook. This implementation is not nescesarilly equivalent to the official one - the goal is to understand better how to implement something that works *like* **useState**. Understanding _this_, or any, implementation of a library is not a requirement to using it. However, I do feel that this depth of understanding is useful - with any abstraction, there are advantages to understanding how it is constructed.

### From stateful classes to stateful functions

When we think of [state](https://en.wikipedia.org/wiki/State_(computer_science)), classes are usualy the first thing that springs to mind. We can easily define properties on a [class](https://en.wikipedia.org/wiki/Class_(computer_programming)) and change these over time. This translates directly to class components in React, in which we define and access state variables via [this](https://en.wikipedia.org/wiki/This_(computer_programming)):

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


When it comes to functions, their being stateless is natural. A function has an input an output, and usually we strive to keep a function [pure](https://en.wikipedia.org/wiki/Pure_function), so that given the same input it would always return the same output:

```js
const add = (x, y) => x + y
```

In React, we've compe to expect a stateless functional component to works the same way as the **add** function, always rendering the same thing given the same **props**:

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

But this does not work in React. Even though value of **count** changes, the **Counter** component does not re-render to show it. Some front-end frameworks _do_ use this use of global variables - [svelte](https://svelte.dev/repl/417dd8f8a0e84341be3cd08e2f2b394a?version=3.12.1) being one example.

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


Now this is beginning to work, at least in the above example. We still have an object that keeps state, but this is happenning behind the scenes. The main thing we needed to do was to join the rendering and state management, so that we are able to re-render whenever the state changes. 

Next, we will want to achieve something more general than **useCount**. We'll change variable name from **count** to **state**, and the method names to **useState** and  **setState**. Also, instead of having **MyReact** determine the initial value of the state, we will have the caller pass it as an argument:

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

We will also want **MyReact** to be able to create more than a single state variable. Currently, Any subsequent call to **MyReact.useState** will overwrite the initially defined variable. We can achieve this by having **MyReact** store an array of state variables. But now we'll need some way to know, each time **setState** is being called, *which* state variable is the one we want to change. We can do this by relying on the call order to **useState**:

```jsx
const MyCounter = () => {
  const [count1, setCount1] = MyReact.useState(0);
  const [count2, setCount2] = MyReact.useState(0);
}
```

As long as the **MyReact.useState** methods are *not* called inside a conditional block, the two calls will always be executed in the same order. 

We will use an array to store pairs  of the **state** value *and* the corresponding **setState** calls. We'll call these **stateHolder**s.

We will also store an index indicating the latest state holder we have refrenced, which we will be reset to **0** whenver *any* **setState** is called.

*note:* the code bellow gets a bit dense. It is followed by an explanation and an example.

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

Here's an example using the updated **MyReact**:

<iframe class="code-editor" src="../post-1/use-state-arr" style="overflow: auto;"></iframe>

One illuminating aspect of the above can be gleaned by opening the devtools and observing the output of the **console.log** statements inside **useState**. On each render of the component, **useState** will be called twice. On the initial render, two **stateHolder** objects will be creating. When we click on either of the **+** buttons, **setState** is called once, which leads to the currentIndex to be reset to 0, and to the component being re-rendered.

### Conclusion

We've achieved a working version of a **useState** hook build from the ground up. The next steps would be to see how we can make this work not just for a single component, but for any number of them. 