---
title: "Closures"
date: "2019-10-20"
draft: false
path: "/blog/closures"
---


We _can_ achieve statefulness without using global variables by using a [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures). A closure is a function within a function, where the inner function has access to variables defined within the outer function. Here's an example of a closure that allows us to get and set the value of a number:


```js
function useNumber() {
  let number = 0;

  const getNumber = () => number;

  const setNumber = (newValue) => {
    number = newValue;
  };

  return { getNumber, setNumber }
}
```

In the example above, the **useNumber** function returns an object with property names **getNumber** and **setNumber**, each having the value of the same-named function. Both functions have access to the interal variable **number**. We can use **useNumber** like this:

```js
const { getNumber, setNumber } = useNumber();
console.log(getNumber())
// => 0
setNumber(2)
console.log(getNumber())
// => 2
```

## On the independence of functions

Above we use [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) to have access to each of the returned functions individually. We could use group them together:

```js
const statefulNumber = useNumber();
console.log(statefulNumber.getNumber())
// => 0
statefulNumber.setNumber(2)
console.log(statefulNumber.getNumber())
// => 2
```

But it is useful to think of these functions as separate entities, that can be grouped and un-grouped, packed and un-packed, as desired. We could even return the functions from **useNumber** within another structure, such an array:

```js
function useNumber() {
  let number = 0;

  const getNumber = () => number;

  const setNumber = (newValue) => {
    number = newValue;
  };

  return [ getNumber, setNumber ]
}
```

And then destructure the array when invoking **useNumber**:

```js
const [getNumber, setNumber] = useNumber();
```

### Just the number, please!

Importantly, we will *not* have the up to date value of the number available if we simply return it in from **useNumber**:

```js
function useNumber() {
  let number = 0;

  const setNumber = (newValue) => {
    number = newValue;
  };

  return { number, setNumber }
}

const { number, setNumber } = useNumber();
console.log(number)
// => 0
setNumber(2)
console.log(number)
// => 0
```

This is because we get not the actual [number] variable back from the function, but the value of it copied into a *new* variable. Both when being passed into a function and returned from a function, a variable that contains a number is [passed by value](https://courses.washington.edu/css342/zander/css332/passby.html). If we did want to always have access to the up to date value, we could wrap it in an object, and return the containg object:

```js
function useNumber() {
  const container = {
    number: 0
  }

  const setNumber(num) {
    container.number = num;
  }

  return { numContainer, addToSum }
}

const { numContainer, addToSum } = useNumber();
console.log(numContainer)
// => { number: 0 }
setNumber(2)
console.log(numContainer)
// => { number: 2 }
```

The above works because object in javascript are always passed by reference. Rather than copying the values of the object, a _pointer_ is returned to the object's location in memory. So any update will change the _same_ object. This means, however, that we can update the container's values outside of **useNumber**

```js
const { numContainer, addToSum } = useNumber();
numContainer.number = 2;
console.log(numContainer)
// { number: 2 }
```

Which makes this version of `useNumber` much less reliable.


## Passing the value

One addition I would make to the `useNumber` function is to allow passing to it the initial value:

```js
function useNumber(initialValue) {
  let number = initialValue;

  const getNumber = () => number;

  const setNumber = (newValue) => {
    number = newValue;
  };

  return { getNumber, setNumber }
}
```

This way, we will have clear expectation of what the value would be when calling `getNumber` for the first time:

```js
const { getNumber, setNumber } = useNumber(4);
console.log(getNumber())
// => 4
```

### Closures in a React Component

So now the question is - how would we use any of this in a react component? Simply 

<iframe class="code-editor" src="../post-1/closures-functional-component" style="overflow: auto;"></iframe>


### Closures within closures

We are not limited with closures to go one level deep. That is, we can use closures to enhance other closures. For example, we can employ the **useNumber** function within a new **useSum** function:

```js
function useSum(initialValue) {
  const { getNumber: getSum, setNumber: setSum } = useNumber(initialValue);

  const addToSum = (num) => {
    setSum(sum + num)
  }

  return { sum, addToSum }
}
```

Above, when we not only destructure the values returned by **useNumber**, we also rename them. This means that we only be able to access them by the new names we have defined for them. In the case above, we rename **getNumber** to **getSum**, and **setNumber** to **setSum**. The advantage we get from calling **useNumber**, is that we don't have to redefine how **getNumber** and **setNumber** work. In this case it may be trivial to do so, but this would be very useful in case these were complex functions.

We can now use **useSum**:


```js
const { getSum, addToSum } = useSum(0);
console.log(getSum())
// => 0
addToSum(2);
console.log(getSum());
// => 2
addToSum(3);
console.log(getSum());
// => 5
```

Since **addToSum** performs the addition internally all we have to do is pass the value we want to add, and we will then have the new sum available when calling **getSum**.

```js
function makeCounter() {
  let sum = 0
  const getSum = () => {
    return sum;
  }
  const addToSum(num) {
    sum += num;
  }

  return { getSum, addToSum }
}
```

In the example above, both functions return by **makeCounter** have access to the same interal variable **sum**. We can use **makeCounter** like this:

```js
const { getSum, addToSum } = makeCounter();

console.log(getSum())
// => 0
addToSum(2)
console.log(getSum())
// => 2
```

Above we use [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) to have access to each of the returned functions individually. We could instead group them:

```js
const counter = makeCounter();
console.log(counter.getSum())
// => 0
addToSum(2)
console.log(getSum())
// => 2
```

But we could also return the two functions in an array:

```js
function makeCounter() {
  let sum = 0
  function getSum() {
    return sum;
  }
  function addToSum(num) {
    sum += num;
  }

  return [ getSum, addToSum ]
}

const [ getSum, addToSum ] = makeCounter();
```

The above may begin looking like a hook, except that hooks are infused with extra power that can make them seem magical. To achieve the above with hooks we can do:

```js
import { useState } from 'react';

function useCounter() {
  const [sum, setSum] = useState(0)
  const addToSum = (num) => {
    setSum(sum + num)
  }
  return { sum, addToSum }
}
```

When defining **useCounter**, we use a react hook called [useState](https://reactjs.org/docs/hooks-state.html). The **useState** hook is given as argument an initial value, returns an array with two elements: the current value, and a function to set the value. 
One difference is that we no longer need a **getSum** function - we simply return the sum. For this to work, hooks were conceived with the limitation that they can only be used within other hooks or within functional components. Here's an example component that will use the **useCounter** hook we created above:

<iframe class="code-editor" src="../post-1/post-1-code-1" style="overflow: auto;"></iframe>