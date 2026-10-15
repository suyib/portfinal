'use client'

import { Markdown } from '@tiptap/markdown'
import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState } from 'react'

/**
 * WYSIWYG editor that reads and writes Markdown, so stored content (and the
 * public Markdown renderer) stays the same. The value is submitted through a
 * hidden input named `name`, so it works inside any <form>.
 * Client-only: import RichText from ./rich-text instead.
 */
export default function RichTextEditor({
  name,
  defaultValue = '',
  label,
  placeholder,
  minRows = 4,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
  minRows?: number
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false, // avoid SSR hydration mismatches
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false, // no Markdown equivalent
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
      }),
      Markdown,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: defaultValue,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'prose rich-text-content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        style: `min-height: ${minRows * 1.5}rem`,
      },
    },
    onUpdate: ({ editor }) => setValue(editor.isEmpty ? '' : tidy(editor.getMarkdown())),
  })

  // Clear back to the saved value when the surrounding form resets
  // (e.g. after "Add section" succeeds).
  useEffect(() => {
    const form = inputRef.current?.form
    if (!form || !editor) return
    const onReset = () => {
      editor.commands.setContent(defaultValue, { contentType: 'markdown' })
      setValue(defaultValue)
    }
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
  }, [editor, defaultValue])

  return (
    <div className="rich-text">
      <input ref={inputRef} type="hidden" name={name} value={value} />
      {editor ? <Toolbar editor={editor} /> : <div className="rich-text-toolbar" aria-hidden />}
      <EditorContent editor={editor} />
    </div>
  )
}

/** Drop empty paragraphs (serialised as &nbsp;) and surplus blank lines. */
function tidy(markdown: string) {
  return markdown
    .replace(/^\s*&nbsp;\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  function toggleLink() {
    if (s.link) return chain().unsetLink().run()
    const url = window.prompt('Link URL (https://…)')
    if (!url) return
    if (!/^(https?:|mailto:)/i.test(url)) return window.alert('Use a full URL starting with https://')
    chain().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting">
      <Btn label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <i>I</i>
      </Btn>
      <Sep />
      <Btn label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H2
      </Btn>
      <Btn label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        H3
      </Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        • List
      </Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        1. List
      </Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        “ Quote
      </Btn>
      <Btn label={s.link ? 'Remove link' : 'Add link'} active={s.link} onClick={toggleLink}>
        Link
      </Btn>
      <Sep />
      <Btn label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        ↶
      </Btn>
      <Btn label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        ↷
      </Btn>
    </div>
  )
}

function Btn({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      className="rich-text-btn"
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 w-px self-stretch bg-neutral-200" aria-hidden />
