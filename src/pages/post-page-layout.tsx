import React from "react"
import { MDXRenderer } from "gatsby-plugin-mdx"

export default function PageTemplate({ data: { mdx } }) {
  return (
    <div>
      <h1>{mdx.frontmatter.title}</h1>
      <MDXRenderer>{mdx.body}</MDXRenderer>
    </div>
  )
}