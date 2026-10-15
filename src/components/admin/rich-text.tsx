'use client'

import dynamic from 'next/dynamic'

// The editor only makes sense in the browser (and Tiptap uses Math.random
// while rendering), so it is never server-rendered. The placeholder keeps the
// same footprint so the page doesn't jump when it loads.
export const RichText = dynamic(() => import('./rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="rich-text" aria-busy="true">
      <div className="rich-text-toolbar" />
      <div className="rich-text-content h-24 text-neutral-400">Loading editor…</div>
    </div>
  ),
})
