---
title: "Continuos HTTP requests with hooks"
date: "2019-10-06"
draft: false
path: "/blog/continuous-network-requests-with-hooks"
---

##

Continuous network requests can be a useful to emulate [push technology](https://en.wikipedia.org/wiki/Push_technology). Push technology works similarly to aradio - there is a station broadcasting waves of some sort, and you simply need to tune to the right frequecy. For websites, frequently pull technology is the only one available. The client - in this case the web browser, makes a request to some server to get the content of a website, and the server responds. Often this response contains not just a static HTML but also javascript files, which can both build-up the display and initiate futher requests to the server to get more content. These further requests are mostly done on page load or as a response to some user interaction, such as clicking on a button. Any event that triggers a single request can also trigger multiple or continous network requests. This can be implemented in javascript by using the [setInterval](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval) method to repeatedly call a function that executes the network request.

```ts
async function makeNetworkRequest() {
  // Make the network request
  const response = await fetch(SOME_URL)
  const data = await response.json()
  // Do something with the response data
  // ...
}

// Will call the above function every 5 second
const TIME_INTERVAL_MS = 5000
setInterval(makeNetworkRequest, TIME_INTERVAL_MS)
```

One problem with the above approach does not account for how long the network
request will take each time. The request may usually take 1 second 
to complete, but occasionaly can take a whole 6 seconds, in which case we may start the next request before the previous one even completed. One way to account for that is to use [setTimeOut](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout) to set a single interval at the end of each execusion of `makeNetworkRequest`:

```ts
async function makeNetworkRequest() {
  // Make the network request
  const response = await fetch(SOME_URL)
  const data = await response.json()
  // Do something with the response data
  // ...
  // Set timeout for the next request
  setTimeOut(makeNetworkRequest, TIME_INTERVAL_MS)
}

function onLoad() {
  makeNetworkRequest()
}
```



