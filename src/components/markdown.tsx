import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders admin-authored Markdown. Raw HTML is not rendered. */
export function Markdown({ children }: { children: string }) {
  if (!children.trim()) return null
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
