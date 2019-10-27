import React from "react"
import CodeEditor from "../../components/react-live/CodeEditor"


const code = `
let count = 0;

function useNumber() {
    let number = 0
  
    const setNumber = (newValue) => {
        number = newValue;
    }

    const getNumber = () => {
        return number;
    }
  
    return { getNumber, setNumber }
  }

const Counter = () => {
    const { getNumber, setNumber} = useNumber()
    const increment = () => {
        setNumber(getNumber() + 1)
    }

    return (
        <>
            <div>{getNumber()}</div>
            <button onClick={increment}>+</button>
        </>
    )
}
render(<Counter />)
`

const App = () => {
  return <CodeEditor code={code} scope={{ }} />
}

export default App
