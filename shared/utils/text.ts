import type { I18nText } from '../types'

export function emptyText(fr = '', en = ''): I18nText {
  return { fr, en }
}

export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]!)
}

function safeUrl(url: string): string | null {
  const u = url.trim()
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith('/') || u.startsWith('#')) return u
  return null
}

function inline(src: string): string {
  let s = escapeHtml(src)
  // [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeUrl(url.replace(/&amp;/g, '&'))
    if (!href) return label
    const ext = /^https?:/i.test(href)
    return `<a href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`
  })
  // **bold** then *italic*
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return s.replace(/\n/g, '<br>')
}

/**
 * Tiny, safe "markdown": paragraphs (blank line), **bold**, *italic*,
 * [link](https://…) and "- " bullet lists. All HTML is escaped first.
 */
export function renderRich(src?: string | null): string {
  if (!src) return ''
  return src
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const lines = para.split('\n')
      if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`
      }
      return `<p>${inline(para)}</p>`
    })
    .join('')
}

/** Plain text version (for meta descriptions, alt fallbacks…) */
export function plainText(src?: string | null): string {
  if (!src) return ''
  return src
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}
