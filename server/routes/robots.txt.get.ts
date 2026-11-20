/**
 * robots.txt — every search engine and AI crawler may read the public site.
 * NUXT_AI_TRAINING=false keeps the AI search / assistant bots (they cite the site
 * with a link) but blocks the crawlers that only collect data to train models.
 */
const AI_SEARCH = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'DuckAssistBot', 'MistralAI-User']
const AI_TRAINING = ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Bytespider', 'cohere-ai']

export default defineEventHandler((event) => {
  const origin = siteOrigin(event)
  const training = String(useRuntimeConfig().aiTraining) !== 'false'
  const block = (agents: string[], allow: boolean) =>
    agents.map((a) => `User-agent: ${a}`).join('\n') + (allow ? '\nAllow: /\nDisallow: /admin\nDisallow: /api/\n' : '\nDisallow: /\n')

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return [
    '# Portfolio — lisible par les moteurs de recherche et les IA',
    `# Résumé pour les IA : ${origin}/llms.txt (tout le contenu : ${origin}/llms-full.txt)`,
    '# Chaque page existe aussi en Markdown : ajouter .md à son adresse (ex. /work/<projet>.md, /index.md)',
    '',
    'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n',
    '# Assistants et moteurs de recherche IA',
    block(AI_SEARCH, true),
    `# Robots d'entraînement des modèles${training ? '' : ' (bloqués : NUXT_AI_TRAINING=false)'}`,
    block(AI_TRAINING, training),
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
})
