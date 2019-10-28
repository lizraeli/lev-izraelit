---
title: "HTTP polling with React Hooks"
date: "2019-10-06"
draft: false
path: "/blog/repeated-network-requests-with-hooks"
---

```tsx
function MyComponent() {
  const {
    data,
    isFetching,
    isMakingRequests,
    fetchingError,
    startMakingRequests,
    stopMakingRequests
  } = usePollingRequests(apiCall, intervalMs);
  ...
}
```

We will pass the api call and the interval between requests in miliseconds, and get back:

- the response data (if any)
- the fetching error (if any)
- a function to call in order to start making requests
- a function to call in order to stop making request
- an indicator whether the hook is currently fetching
- an indicator whether the hook is making periodic requests

When we pass a new apiCall or timeout to the hook, it will automatically start making requests. This can be changed of course. We will also have the ability to stop restart the periodic request any number of times.

You can experiment with sample app built with this hook below:

<iframe src="https://codesandbox.io/embed/busy-worker-tqt1p?fontsize=14" title="busy-worker-tqt1p" allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>

## Background

Repeated network requests can be a useful to emulate [push technology](https://en.wikipedia.org/wiki/Push_technology). Push technology is similar to using a radio - you simply need to tune to the frequency of the desired station. For websites, however, frequently [pull technology](https://en.wikipedia.org/wiki/Pull_technology) is the only one available. The client - in this case the web browser, needs to makes a request to a server and wait for the server's response. This response can contain any kind of data, including javascript files, which can both build-up the display and initiate futher requests to the server. Network requests are often triggered either on page load, or as a response to an event, such as a user's click. A network request can be repeated by setting up a timer. Javascript offers two such timers,  [setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout) and  [setInterval](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval) , both of which need to be provided with a [callback function](https://developer.mozilla.org/en-US/docs/Glossary/Callback_function) and a quantity of time in miliseconts. The difference between the two is that **setTimeout** will invoke the callback once once the time elapses, while **setInterval** will invoke the callback repeatedly, restarting the timer every time. Both methods return an id that can be used to cancel the timer. This is done by passing the id to [clearTimeout](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout) to cancel a **setTimeout** or to [clearInterval](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/clearInterval) to cancel a **setInterval**.


## Initial implementation

Let's begin setting a repeated network erquest using **setInterval**. We will use the [axios](https://github.com/axios/axios) library to simplify the process of making the network requests.

```ts
async function makeNetworkRequest() {
  // Make the network request
  const response = await axios.get(SOME_URL)
  // Do something with the response data
  // ...
}

// Will call the above function every 5 second
const TIME_INTERVAL_MS = 5000
setInterval(makeNetworkRequest, TIME_INTERVAL_MS)
```

One problem I see with this initial above approach is that we're not accounting for how long each network request will take. A response may usually arrive in 1 second, but occasionaly can take signifincaly longer, possibly even longer than the time interval we have set. There are different way to account for this - we could possibly make the requests more frequently, store the responses in an array, and take the last element from that array on every interval.
But right now we will take a simpler approach by using **setTiemout** a the end of the **makeNetworkRequest** function to set a new timer:

```ts
async function makeNetworkRequest() {
  // Make the network request
  const response = await axios.get(SOME_URL)
  // Do something with the response data
  // Set timeout for the next request
  setTimeout(makeNetworkRequest, TIME_INTERVAL_MS)
}
```

We can make this function reusable by passing in the url, and passing it again in each following `setTimeout`:


```ts
async function makeNetworkRequest(url) {
  // Make the network request
  const response = await axios.get(url)
  // Do something with the response data
  
  // Set timeout for the next request
  setTimeout(() => makeNetworkRequest(url), TIME_INTERVAL_MS)
}
```

Next we want to be able to cancel the request. We'll start by saving each the return value of `setTimeout` to a `timeoutId` variable:

```ts
let timeoutId

async function makeNetworkRequest(url) {
  // Make the network request
  const response = await axios.get(url)
  // Do something with the response data
 
  // Set timeout for the next request
  timeoutId = setTimeout(() => makeNetworkRequest(url), TIME_INTERVAL_MS)
}
```

Having these parts in place, we want to allow the initial caller of `makeNetworkRequest` to access the response data of each request. We can do this by having `makeNetworkRequest` take a callback as a second variable, and invoking it with the response data:

```ts
async function makeNetworkRequest(url, callback) {
  // Make the network request
  const response = await axios.get(url)
  // Invoke the callback with the response data
  callback(respose)
  // Set timeout for the next request
  timeoutId = setTimeout(() => makeNetworkRequest(url), TIME_INTERVAL_MS)
}
```

But this puts `timeoutId` in the global scope. Instead we want 
 One way to do this while avoiding global scope is via closures. We will have an out function called `useRequest` which will define a `timeoutId` variable. On every call to `setTimeout`, we will assign the timeout's id to this variable. 

```ts
function useRequest(timeInterval) {
  let timeoutId;
  
  async function makeRequest(url) {
    // Make the network request
    const response = await axios.get(url)
    // Do something with the response data
    console.log(response.data)
    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url), timeInterval)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    console.log("stopped")
  }

  return { start: makeRequest, stop }
}
```

A second issue is that we have no external access to the data. This can be solved by having `makeRequest` take a callback as a second paramter:
```ts
  async function makeRequest(url, callback) {
    // Make the network request
    const response = await axios.get(url)
    // Do something with the response data
    callback(response.data)
    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url, callback), TIME_INTERVAL_MS)
  }
```

<iframe height="600px" width="100%" src="https://repl.it/@lizraeli/AssuredImpossibleVideogame?lite=true" scrolling="no" frameborder="no" allowtransparency="true" allowfullscreen="true" sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>

We can already start trying to use this code in a functional React component. We will be making network calls to the [numbers api](http://numbersapi.com/) to fetch facts about a number entered by the user.
Without hooks, we can trigger the network request, but we have no good way of handling the returned data. So for now, we will just log it.

<iframe class="code-editor" src="../post-1/post-1-code-1" style="overflow: auto;">
</iframe>

This makes a third issue become apparent. When changing a number without manually stopping, both the new url _and_ the old url will continue being called. The first thing to do to resolve this is, at the beginning of the `makeRequest` function, call `clearTimeout` with the current timeout id. This will clear a request that may be potentially waiting in the queue for the timout to elapse.

```ts
  async function makeRequest(url, callback) {
    // clear potenialy pending timeout
    clearInterval(intervalId)
    ...
  } 
```

But there still exists another possibility, which can be demonstrated by slowing the network request done to 3G or lower. The **makeRequest** function can be called while an existing one is waiting for a response from the network request. Let's call these **makeRequest-1** and **makeRequest-2**. While **makeRequest-1** is waiting on this line:
```ts
  const response = await axios.get(url)
```

And when **makeRequest-2** will get to the same line above, **makeRequest-1** might already receive the response, and continue to setting a new timeout. This results in **makeRequest-1** jumping ahead of **makeRequest-2**, which is the opposite of the desired behavior. To alleviate this, we will add another variable to the outer scope to keep the current url in memory. When a response is received from the network request, `makeRequest` will only proceed if the url passed to it is still the current url:

```ts
function useRequest(timeIntervalMs: number) {
  let timeoutId: number
  let currentUrl: string

  async function makeRequest(url: string, callback: (data: any) => void) {  
    // clear pending timeouts
    clearTimeout(timeoutId)
    currentUrl = url

    // Make the network request
    const response = await axios.get(url)
    
    // The current url may have changed while awaiting the request
    if (url !== currentUrl) {
      return;
    }

    // Do something with the response data
    callback(response.data)

    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url, callback), timeIntervalMs)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    timeoutId = 0;
  }

  return { start: makeRequest, stop }
}
```


# Now with Hooks

We'll start by adding a `useState` hook to the example above, in order to store and display the value returned by each api call.


<iframe class="code-editor" src="../post-1/post-1-code-2" style="overflow: auto;">
</iframe>

But this presents a problem - when we switch

But we can do even better. We can using hooks _within_ the `useRequest` function, making `useRequest` itself a custom hook. Rather than passing a callback, we will have `userRequest` store and return the data received from the most recent request:

```ts
function useRequest(timeIntervalMs: number) {
  const [data, setData] = useState(null)

  let timeoutId: number
  let currentUrl: number

  async function makeRequest(url: string) {
    // clear pending timeouts
    clearTimeout(timeoutId)
    currentUrl = url

    // Make the network request
    const response = await axios.get<T>(url)

    // set the data
    setData(response.data);

    // Url may have changed while awaiting the request
    if (url !== currentUrl) {
      return
    }

    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url), timeIntervalMs)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    console.log("stopped")
  }

  return { start: makeRequest, stop, data }
}
```

Now we can call `useRequest` as a custom hook within our component:


<iframe class="code-editor" src="../post-1/post-1-code-3" style="overflow: auto;">
</iframe>