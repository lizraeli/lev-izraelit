import React, { useState } from "react"
import CodeEditor from "../../components/react-live/CodeEditor"

function useCounter() {
  const [sum, setSum] = useState(0)
  const addToSum = (num: number) => {
    setSum(sum + num)
  }
  return { sum, addToSum }
}

const code = `
const App = () => {
  const { sum, addToSum } = useCounter()

  return (
    <div>
        <div> sum: {sum} </div>
        <button onClick={() => addToSum(1)}>+</button>
        <button onClick={() => addToSum(-1)}>-</button>
    </div>
  )
 }

render(<App />)
`

const App = () => {
  return <CodeEditor code={code} scope={{ useCounter }} />
}

export default App
