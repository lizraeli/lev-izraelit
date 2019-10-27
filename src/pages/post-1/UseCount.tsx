import React from "react"
import CodeEditor from "../../components/react-live/CodeEditor"

const code = `
const MyReact = {
    count: 0,
    component: null,
    increment () {
        MyReact.count += 1;
        render(MyReact.component)
    },
    useCount() {
        return [MyReact.count, MyReact.increment]
    },
    render: (component) => {
        MyReact.component = component;
        render(MyReact.component)
    }
}
  
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
`

const App = () => {
  return <CodeEditor code={code} scope={{}} />
}

export default App
