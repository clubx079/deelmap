// Small, safe markdown renderer for community posts and comments.
//
// Supports the same syntax the composer toolbar produces:
//   **bold**        — Bold button
//   _italic_        — Italic button (also *italic* for pasted markdown)
//   > quote         — Quote line-prefix
//   [label](url)    — Link button
//   ![alt](url)     — Image button (allowed via allowImages flag)
//   bare https://…  — autolinked
//   blank line      — paragraph break
//   single newline  — <br/>
//
// Output is React elements only — never raw HTML, never dangerouslySetInnerHTML.

import React from 'react'
import Link from 'next/link'
import { UserHoverCard } from '@/components/community/UserHoverCard'

// Allow only http(s) and relative paths. Refuses javascript:, data:, etc.
function safeHref(href) {
  const trimmed = String(href || '').trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  if (trimmed.startsWith('#')) return trimmed
  return null
}

// Tokenize one logical line of inline content.
function tokenizeInline(text) {
  if (!text) return []
  // Order matters: longer / more-specific tokens first. Mention is last so it
  // never grabs an @ inside a URL (the url alternative consumes those first).
  const re = /(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(_[^_\n]+_)|(\*[^*\s][^*\n]*[^*\s]\*)|(\[[^\]\n]+\]\([^)\s]+\))|(\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?])|((?<![\w@])@([a-z0-9_]{3,24}))/g

  const tokens = []
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) })

    if (m[1])       tokens.push({ type: 'bold',   value: m[1].slice(2, -2) })
    else if (m[2])  tokens.push({ type: 'bold',   value: m[2].slice(2, -2) })
    else if (m[3])  tokens.push({ type: 'italic', value: m[3].slice(1, -1) })
    else if (m[4])  tokens.push({ type: 'italic', value: m[4].slice(1, -1) })
    else if (m[5]) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(m[5])
      if (linkMatch) {
        const href = safeHref(linkMatch[2])
        if (href) tokens.push({ type: 'link', label: linkMatch[1], href })
        else      tokens.push({ type: 'text', value: m[5] })
      }
    }
    else if (m[6]) {
      const href = safeHref(m[6])
      if (href) tokens.push({ type: 'link', label: m[6], href })
      else      tokens.push({ type: 'text', value: m[6] })
    }
    else if (m[7]) tokens.push({ type: 'mention', handle: m[8] })

    last = re.lastIndex
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

function renderTokens(tokens, keyPrefix = 't', { hoverMentions = false } = {}) {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`
    switch (t.type) {
      case 'bold':
        return <strong key={key} className="font-semibold text-[#1A1816]">{t.value}</strong>
      case 'italic':
        return <em key={key} className="italic">{t.value}</em>
      case 'mention': {
        const link = (
          <Link
            href={`/community/u/${t.handle}`}
            className="text-[#D03839] font-semibold hover:underline"
          >
            @{t.handle}
          </Link>
        )
        return hoverMentions
          ? <UserHoverCard key={key} handle={t.handle}>{link}</UserHoverCard>
          : <React.Fragment key={key}>{link}</React.Fragment>
      }
      case 'link':
        return (
          <a
            key={key}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#D03839] hover:underline break-all"
          >
            {t.label}
          </a>
        )
      default:
        return <span key={key}>{t.value}</span>
    }
  })
}

// Inline-only — for feed previews / top-comment teasers. No paragraphs, no images, no blockquotes.
// Strips leading "> " on each line so blockquotes don't look weird inside a one-line preview.
export function renderInline(text) {
  if (!text) return null
  const cleaned = String(text).replace(/^>\s?/gm, '')
  return renderTokens(tokenizeInline(cleaned), 'i')
}

// Full body renderer — paragraphs, line breaks, blockquotes, bold/italic/links, optional images.
export function renderRichBody(text, { allowImages = true } = {}) {
  if (!text) return null
  const paragraphs = String(text).split(/\n{2,}/)

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n')

    // Image-only paragraph: ![alt](url)
    if (allowImages) {
      const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(para.trim())
      if (imgMatch) {
        const href = safeHref(imgMatch[2])
        if (href) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`p-${pIdx}`}
              src={href}
              alt={imgMatch[1] || ''}
              className="max-w-full h-auto rounded-lg border border-[#E8E8E4] my-3"
              loading="lazy"
            />
          )
        }
      }
    }

    // Blockquote: every line begins with "> "
    if (lines.every(l => l.trim().startsWith('>'))) {
      return (
        <blockquote
          key={`p-${pIdx}`}
          className="border-l-[3px] border-[#D03839]/40 pl-3.5 my-3 text-[#737370] italic"
        >
          {lines.map((l, lIdx) => {
            const stripped = l.replace(/^\s*>\s?/, '')
            return (
              <span key={`l-${pIdx}-${lIdx}`}>
                {renderTokens(tokenizeInline(stripped), `q-${pIdx}-${lIdx}`, { hoverMentions: true })}
                {lIdx < lines.length - 1 && <br />}
              </span>
            )
          })}
        </blockquote>
      )
    }

    // Normal paragraph — preserve single-line breaks as <br/>
    return (
      <p key={`p-${pIdx}`} className="mb-3 last:mb-0 leading-relaxed break-words">
        {lines.map((l, lIdx) => (
          <span key={`l-${pIdx}-${lIdx}`}>
            {renderTokens(tokenizeInline(l), `p-${pIdx}-${lIdx}`, { hoverMentions: true })}
            {lIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  })
}
