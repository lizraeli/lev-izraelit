import React from "react"
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live"

export const App = () => {
  return <div> hello </div>
}

const scope = { App }

const code = `
 const App = () => <div> hello </div>
 render(App)
  `
export const Provider = () => (
  <LiveProvider 
  code={code} 
  noInline={true} 
  >
    <LiveEditor />
    <LiveError />
    <LivePreview />
  </LiveProvider>
)
