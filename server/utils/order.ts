import type { Database, Project } from '#shared/types'

/**
 * Order of the projects on the site: highlighted ones first (by rank),
 * then the others in the order set by drag & drop in the back-office.
 */
export function publicOrder(projects: Project[]): Project[] {
  const visible = projects.filter((p) => p.visible)
  const featured = visible.filter((p) => p.featured).sort((a, b) => a.featuredRank - b.featuredRank)
  const rest = visible.filter((p) => !p.featured).sort((a, b) => a.order - b.order)
  return [...featured, ...rest]
}

/** Ranks of highlighted projects become 1..n (new ones go last), 0 for the others. */
export function normalizeRanks(db: Database) {
  const featured = db.projects
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredRank || Infinity) - (b.featuredRank || Infinity) || a.order - b.order)
  featured.forEach((p, i) => (p.featuredRank = i + 1))
  for (const p of db.projects) if (!p.featured) p.featuredRank = 0
}
