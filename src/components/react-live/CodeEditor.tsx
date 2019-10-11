import React, { FunctionComponent } from "react"
import styled, { css } from "styled-components"
import * as polished from "polished"
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live"
import { reactLiveTheme } from "./theme"
import { lightGrey } from "./styles"

const StyledProvider = styled(LiveProvider)`
  border-radius: ${polished.rem(3)};
  box-shadow: 1px 1px 20px rgba(20, 20, 20, 0.27);
  overflow: overlay;
  margin-bottom: ${polished.rem(100)};
  flex-grow: 1;
  border: none;
  margin: 0;
  padding: 0;
`

const column = css`
  /* flex-basis: 50%; */
  width: 100%;
  /* max-width: 50%; */
  @media (max-width: 600px) {
    flex-basis: auto;
    width: 100%;
    max-width: 100%;
  }
`

const StyledEditor = styled.div`
  background: ${lightGrey};
  font-family: "Source Code Pro", monospace;
  font-size: ${polished.rem(16)};
  /* height: ${polished.rem(350)}; 
  max-height: ${polished.rem(350)}; */
  overflow: overlay;
  ${column};
  * > textarea:focus {
    outline: none;
  }
`

const LiveWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  height: 100%;
  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const StyledPreview = styled(LivePreview)`
  /* position: relative; */
  padding: 0.5rem;
  background: white;
  color: black;
  height: auto;
  overflow: hidden;
  /* ${column}; */
`

// const StyledCodeEd
interface CodeEditorProps {
  code: string
  scope: { [key: string]: any }
}

const CodeEditor: FunctionComponent<CodeEditorProps> = ({ code, scope }) => (
  <StyledProvider
    code={code}
    noInline={true}
    theme={reactLiveTheme}
    scope={scope}
  >
    <LiveWrapper>
      <StyledEditor>
        <LiveEditor />
      </StyledEditor>
      <StyledPreview />
    </LiveWrapper>
    <LiveError />
  </StyledProvider>
)

export default CodeEditor
