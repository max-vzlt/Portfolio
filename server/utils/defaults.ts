import type { Database, Settings } from '#shared/types'

const t = (fr: string, en: string) => ({ fr, en })

export function defaultSettings(): Settings {
  return {
    name: 'Maxime Verzeletti',
    role: t('Développeur web & designer', 'Web developer & designer'),
    hero: {
      kicker: t('Portfolio', 'Portfolio'),
      title: t('Créer des expériences numériques', 'Crafting digital experiences'),
      intro: t('', ''),
      imageId: null,
      effect: 'dots',
      tabs: [],
    },
    about: {
      title: t('Qui suis-je ?', 'Who am I?'),
      body: t('', ''),
      imageId: null,
      effect: 'none',
      facts: [],
    },
    skills: { title: t('Compétences', 'Skills'), groups: [] },
    contact: {
      title: t('Travaillons ensemble', "Let's work together"),
      text: t('', ''),
      email: '',
    },
    socials: [],
    cvId: null,
    seo: { description: t('', '') },
  }
}

export function emptyDatabase(): Database {
  return { version: 1, settings: defaultSettings(), categories: [], projects: [], media: [] }
}
