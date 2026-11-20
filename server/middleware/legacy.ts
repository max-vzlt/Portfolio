// Addresses of the previous site that may still be shared (LinkedIn, applications…).
const LEGACY: Record<string, string> = {
  '/CV - Verzeletti Maxime.pdf': '/cv',
  '/index.html': '/',
}

export default defineEventHandler((event) => {
  let path = event.path.split('?')[0]!
  try {
    path = decodeURIComponent(path)
  } catch {
    return
  }
  const to = LEGACY[path]
  if (to) return sendRedirect(event, to, 301)
})
