import React from "react"
import CodeEditor from "../../components/react-live/CodeEditor"
import axios from "axios"


function useRequest(timeIntervalMs: number) {
  let timeoutId: number
  let currentUrl: string

  async function makeRequest(url: string, callback: (data: any) => void) {  
    // clear pending timeouts
    clearTimeout(timeoutId)
    currentUrl = url

    // Make the network request
    const response = await axios.get(url)
    
    // Do something with the response data
    callback(response.data)

    // Url may have changed while awaiting the request
    if (url !== currentUrl) {
      return;
    }

    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url, callback), timeIntervalMs)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    timeoutId = 0;
  }

  return { start: makeRequest, stop }
}

const code = `
const TIME_INTERVAL_MS = 2000
const { start, stop } = useRequest(TIME_INTERVAL_MS)

const App = () => {
  handleInputChange = (e) => {
    const { value } = e.target;
    if (value === "") {
      stop();
      return;
    }
    const url = \`http://numbersapi.com/\${value}\`
    start(url, data => console.log(data))
  }

  return (
    <>
      <div> Number Facts </div>
      <input type="number" onChange={handleInputChange} />
      <button onClick={stop}> stop </button>
    </>
  )
 }

render(<App />)
`

const App = () => {
  return <CodeEditor code={code} scope={{ useRequest }} />
}

export default App
