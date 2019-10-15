import React, { useState, useEffect } from "react"
import CodeEditor from "../../components/react-live/CodeEditor"
import axios from "axios"
import styled from "styled-components"

function useRequest<T>(timeIntervalMs: number) {
  const [data, setData] = useState<T | null>(null)
  const [url, setUrl] = useState<string>("")
  console.log("useRequest url: ", url)

  let timeoutId: number

  useEffect(() => {
    if (!url) {
      return
    }
    console.log("useEffect")
    let cancelled = false

    async function makeRequest(url: string) {
      try {
        // Make the network request
        const response = await axios.get<T>(url)
        
        // Request may have been cancelled
        if (cancelled) {
          return
        }
        console.log("setting response: ", response.data)
        // set the data
        setData(response.data)
      } catch (err) {}
      // Set timeout for the next request
      timeoutId = setTimeout(() => {
          if (cancelled){
            console.log("cancelled after timeout")
            return;
          }
          makeRequest(url)
      }, timeIntervalMs)
    }

    makeRequest(url)

    return () => {
      console.log("Cancelled")
      cancelled = true
      clearInterval(timeoutId)
    }
  }, [url])

  const start = (url: string) => {
    setUrl(url)
  }

  const stop = () => {
    clearTimeout(timeoutId)
    timeoutId = 0
  }

  return { start, stop, data }
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
const App = () => {
    const { start, stop, data: numberFact } = useRequest(TIME_INTERVAL_MS)
    const [count, setCount] = useState(0)

    const handleInputChange = e => {
        const { value } = e.target
        if (value === "") {
            stop();
            return;
        }
        const url =  \`http://numbersapi.com/\${value}\`
        start(url)
    }

    return (
        <Container>
        <div> Number Facts: </div>
        <div>
            <input type="number" onChange={handleInputChange} />
            <button onClick={stop}> stop </button>
        </div>
        <div>
           count: {count}
           <button onClick={() => setCount(count + 1)}> Increment </button>
        </div>
        {numberFact && <NumberFactContainer>{numberFact}</NumberFactContainer>}
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
