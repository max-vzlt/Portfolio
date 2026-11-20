// en/llms.txt: Markdown summary of the site for AI tools (generated from the back-office content)
export default defineEventHandler(async (event) => {
  const db = await getDB()
  return sendMarkdown(event, siteMarkdown(db, 'en', siteOrigin(event), false), 'text/plain')
})
