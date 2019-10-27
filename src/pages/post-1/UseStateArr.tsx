import React from "react"
import CodeEditor from "../../components/react-live/CodeEditor"

const code = `
const MyReact = {
    stateHolderArr: [],
    currentStateIndex: 0,
    component: null,
    useState(initialValue) {
      const { currentStateIndex, stateHolderArr } = MyReact;
      console.log("useState: ")
      console.log("stateHolderArr: ", stateHolderArr)
      console.log("currentStateIndex: ", currentStateIndex)

      let stateHolder;
      if (currentStateIndex === stateHolderArr.length) {
        stateHolder = {
          state: initialValue,
          setState(newValue)  {
            console.log("setState")
            stateHolder.state = newValue
            MyReact.currentStateIndex = 0;
            render(MyReact.component)
          }
        }
        stateHolderArr.push(stateHolder)
        console.log("created new stateHolder:", stateHolder)
      } else {
        stateHolder = stateHolderArr[currentStateIndex]
        console.log("get existing stateHolder:", stateHolder)
      }
      
      MyReact.currentStateIndex += 1;
      return [stateHolder.state, stateHolder.setState]
    },
    render(component) {
      MyReact.component = component
      render(MyReact.component);
    }
}

const Counter = () => {
    const [count1, setCount1] = MyReact.useState(0)
    const [count2, setCount2] = MyReact.useState(0)

    const increment1 = () => {
        setCount1(count1 + 1);
    };
    const increment2 = () => {
        setCount2(count2 + 1);
    };

    return (
        <>
            <div>{count1}</div>
            <button onClick={increment1}>+</button>
            <div>{count2}</div>
            <button onClick={increment2}>+</button>
        </>
    )
}

MyReact.render(Counter)
`

const App = () => {
  return <CodeEditor code={code} scope={{}} />
}

export default App
