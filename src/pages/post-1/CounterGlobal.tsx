import React from "react"
import CodeEditor from "../../components/react-live/CodeEditor"

let count = 0

function increment() {
  count++
}

const Counter = () => (
  <>
    <div>{count}</div>
    <button onClick={increment}>+</button>
  </>
)

const code = `
    render(<Counter />)
`

const App = () => {
  return <CodeEditor code={code} scope={{ Counter, count, increment }} />
}

export default App
