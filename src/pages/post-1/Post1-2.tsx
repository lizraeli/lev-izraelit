import React, { useState } from "react"
import CodeEditor from "../../components/react-live/CodeEditor"
import axios from "axios"
import styled from "styled-components"

function useRequest(timeIntervalMs: number) {
  let timeoutId: number = 0
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
      return
    }

    // Set timeout for the next request
    timeoutId = setTimeout(() => makeRequest(url, callback), timeIntervalMs)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    timeoutId = 0
  }

  return { start: makeRequest, stop }
}

const Container = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;
`

const NumberFactContainer = styled.div`
  width: 200px;
`

const TIME_INTERVAL_MS = 2000

const code = `
const { start, stop } = useRequest(TIME_INTERVAL_MS)

const App = () => {
  const [numberFact, setNumberFact] = useState("")
  handleInputChange = (e) => {
    const { value } = e.target;
    if (value === ""){
        stop();
        return;
    }
    const url = \`http://numbersapi.com/\${value}\`
    start(url, data => setNumberFact(data))
  }

  return (
    <Container>
        <div> Number Facts: </div>
        <div>
        <input type="number" onChange={handleInputChange} />
        <button onClick={stop}> stop </button>
        </div>
        <NumberFactContainer> 
        {numberFact} 
        </NumberFactContainer>
    </Container>
  )
 }

render(<App />)
`

const App = () => {
  return (
    <CodeEditor
      code={code}
      scope={{
        useState,
        useRequest,
        Container,
        NumberFactContainer,
        TIME_INTERVAL_MS,
      }}
    />
  )
}

export default App
