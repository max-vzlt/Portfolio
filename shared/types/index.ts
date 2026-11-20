export type Lang = 'fr' | 'en'
export const LANGS: Lang[] = ['fr', 'en']

/** A text that exists in French and English. */
export interface I18nText {
  fr: string
  en: string
}

/**
 * How an image is rendered on the site:
 * - none: as uploaded (e.g. your Blender renders, already blue & white)
 * - duotone: any picture turned into blue & white
 * - dots: blue & white "round pixels" (halftone) generated in the browser
 */
export type ImageEffect = 'none' | 'duotone' | 'dots'

export type MediaKind = 'image' | 'video' | 'file'

export interface MediaVariant {
  width: number
  height: number
  file: string
}

export interface Media {
  id: string
  kind: MediaKind
  mime: string
  /** File name of the original inside uploads/<id>/ */
  file: string
  originalName: string
  size: number
  width?: number
  height?: number
  /** Resized webp copies (raster images only) */
  variants?: MediaVariant[]
  alt: I18nText
  createdAt: string
}

/** What the public site receives for a media. */
export interface PublicMedia {
  id: string
  kind: MediaKind
  mime: string
  url: string
  srcset?: string
  width?: number
  height?: number
  alt: I18nText
}

export type BlockType = 'heading' | 'text' | 'image' | 'video' | 'link' | 'quote' | 'divider'
export type Span = 1 | 2 | 3
export type RowSpan = 1 | 2 | 3 | 4

export interface Block {
  id: string
  type: BlockType
  /** Width in columns (1 → 3) */
  col: Span
  /** Height in rows (1 → 4) */
  row: RowSpan
  visible: boolean
  /** heading / text / quote / link label */
  text?: I18nText
  /** heading level */
  level?: 2 | 3
  /** text style */
  variant?: 'body' | 'lead'
  /** image / video */
  mediaId?: string | null
  effect?: ImageEffect
  fit?: 'cover' | 'contain'
  caption?: I18nText
  /** video: autoplay muted loop */
  autoplay?: boolean
  /** link */
  url?: string
}

export interface Category {
  id: string
  slug: string
  name: I18nText
  order: number
}

export interface Project {
  id: string
  slug: string
  title: I18nText
  summary: I18nText
  categoryIds: string[]
  year: string
  tools: string[]
  coverId: string | null
  coverEffect: ImageEffect
  /** Size of the card on the home page grid */
  card: { col: Span; row: 1 | 2 }
  link: { url: string; label: I18nText }
  visible: boolean
  /** Highlighted work: shown first on the site, ranked by featuredRank (1 = best) */
  featured: boolean
  featuredRank: number
  order: number
  blocks: Block[]
  createdAt: string
  updatedAt: string
}

export interface HeroTab {
  label: I18nText
  line: I18nText
}

export interface Fact {
  label: I18nText
  value: I18nText
}

export interface SkillGroup {
  title: I18nText
  items: string[]
}

export interface Social {
  label: string
  url: string
}

export interface Settings {
  name: string
  role: I18nText
  hero: {
    kicker: I18nText
    title: I18nText
    intro: I18nText
    imageId: string | null
    effect: ImageEffect
    tabs: HeroTab[]
  }
  about: {
    title: I18nText
    body: I18nText
    imageId: string | null
    effect: ImageEffect
    facts: Fact[]
  }
  skills: {
    title: I18nText
    groups: SkillGroup[]
  }
  contact: {
    title: I18nText
    text: I18nText
    email: string
  }
  socials: Social[]
  cvId: string | null
  seo: { description: I18nText }
  /** "Ma méthode avec l'IA": steps of the process */
  method: { title: I18nText; intro: I18nText; steps: MethodStep[] }
  /** "Ce que je peux faire": outcomes rather than languages */
  services: { title: I18nText; intro: I18nText; items: ServiceItem[] }
  /** Home page: order / visibility of the sections + work section texts */
  home: HomeSettings
}

export interface MethodStep {
  title: I18nText
  /** what I do */
  me: I18nText
  /** what the AI does */
  ai: I18nText
  tools: string[]
}

export interface ServiceItem {
  title: I18nText
  text: I18nText
  /** how AI speeds it up */
  ai: I18nText
}

export type HomeSectionId = 'work' | 'about' | 'method' | 'services' | 'skills' | 'contact'
export const HOME_SECTIONS: HomeSectionId[] = ['work', 'about', 'method', 'services', 'skills', 'contact']

export interface HomeSettings {
  sections: { id: HomeSectionId; visible: boolean }[]
  work: { title: I18nText; intro: I18nText; filters: boolean }
}

export interface Database {
  version: 1
  settings: Settings
  categories: Category[]
  projects: Project[]
  media: Media[]
}

/* ---------- API payloads ---------- */

export type MediaMap = Record<string, PublicMedia>

export interface ProjectCard {
  id: string
  slug: string
  title: I18nText
  summary: I18nText
  categoryIds: string[]
  year: string
  tools: string[]
  coverId: string | null
  coverEffect: ImageEffect
  card: Project['card']
  /** 0 = not highlighted, otherwise its place in the ranking */
  rank: number
}

export interface SitePayload {
  settings: Settings
  categories: Category[]
  projects: ProjectCard[]
  media: MediaMap
}

export interface ProjectPayload {
  project: Project
  categories: Category[]
  media: MediaMap
  prev: { slug: string; title: I18nText } | null
  next: { slug: string; title: I18nText; coverId: string | null; coverEffect: ImageEffect } | null
}
