import { HOME_SECTIONS, type Database, type HomeSettings, type Settings } from '#shared/types'

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
    method: defaultMethod(),
    services: defaultServices(),
    home: defaultHome(),
    profile: defaultProfile(),
  }
}

export function defaultProfile(): Settings['profile'] {
  return {
    givenName: 'Maxime',
    familyName: 'Verzeletti',
    location: t('Troyes, France', 'Troyes, France'),
    school: 'IUT de Troyes',
    studies: t("BUT MMI — Métiers du Multimédia et de l'Internet", 'BUT MMI — Multimedia & Internet degree'),
    availability: t('Ouvert aux stages, alternances et projets', 'Open to internships, work-study positions and projects'),
    expertise: ['Développement web', "Design d'interface", "Intégration de l'IA", 'Prototypage', 'Modélisation 3D (Blender)', 'Game dev (Unity)', 'Voxel art', 'Photographie', 'Stratégie de communication'],
  }
}

export function defaultMethod(): Settings['method'] {
  return {
    title: t("Ma méthode avec l'IA", 'How I work with AI'),
    intro: t(
      "L'IA accélère chaque étape de mes projets, mais les choix restent les miens : je l'utilise comme un assistant, pas comme un pilote automatique.",
      'AI speeds up every step of my projects, but the decisions stay mine: I use it as an assistant, not as an autopilot.',
    ),
    steps: [
      {
        title: t('Explorer', 'Explore'),
        me: t("Je cadre le besoin, le public et l'intention du projet.", 'I frame the need, the audience and the intent of the project.'),
        ai: t('Recherche, reformulation du brief, premières pistes et moodboards.', 'Research, rewording the brief, first leads and moodboards.'),
        tools: ['Claude'],
      },
      {
        title: t('Prototyper', 'Prototype'),
        me: t("Je choisis l'architecture et les technologies, et je découpe le travail.", 'I pick the architecture and the technologies, and break the work down.'),
        ai: t('Code assisté, maquettes rapides, essais de plusieurs approches.', 'Assisted coding, quick mock-ups, trying out several approaches.'),
        tools: ['Claude Code'],
      },
      {
        title: t('Produire', 'Produce'),
        me: t('Je fixe la direction artistique et je soigne les finitions.', 'I set the art direction and polish the details.'),
        ai: t('Variantes visuelles, textures, contenus et traductions.', 'Visual variations, textures, content and translations.'),
        tools: ['Blender'],
      },
      {
        title: t('Vérifier', 'Check'),
        me: t('Je relis, je teste et je ne garde que ce qui est juste.', 'I review, I test and I only keep what is right.'),
        ai: t('Relecture du code, accessibilité, détection des oublis.', 'Code review, accessibility, spotting what was missed.'),
        tools: [],
      },
    ],
  }
}

export function defaultServices(): Settings['services'] {
  return {
    title: t('Ce que je peux faire', 'What I can do'),
    intro: t("Des résultats concrets plutôt qu'une liste de langages.", 'Concrete results rather than a list of languages.'),
    items: [
      {
        title: t('Prototyper une app ou un site web', 'Prototype a web app or a website'),
        text: t('Du besoin à une version en ligne, avec base de données et back-office si nécessaire.', 'From the need to a live version, with a database and a back-office when needed.'),
        ai: t("L'IA accélère le code et les tests, je garde la main sur la structure et la qualité.", 'AI speeds up code and tests, I stay in charge of structure and quality.'),
      },
      {
        title: t('Créer une identité et des visuels', 'Create an identity and visuals'),
        text: t('Direction artistique, interfaces, visuels pour le web et les réseaux.', 'Art direction, interfaces, visuals for the web and social media.'),
        ai: t('Exploration rapide de pistes avant de dessiner la version finale.', 'Fast exploration of ideas before designing the final version.'),
      },
      {
        title: t('Produire de la 3D et des prototypes de jeu', 'Make 3D and game prototypes'),
        text: t('Scènes Blender, voxel art, prototypes jouables sous Unity.', 'Blender scenes, voxel art, playable prototypes in Unity.'),
        ai: t('Textures, variantes et scripts générés, puis retravaillés à la main.', 'Generated textures, variations and scripts, then reworked by hand.'),
      },
      {
        title: t('Communiquer et automatiser', 'Communicate and automate'),
        text: t('Stratégie de communication, contenus, traduction et petites automatisations du quotidien.', 'Communication strategy, content, translation and small everyday automations.'),
        ai: t('Rédaction et traduction assistées, scripts pour les tâches répétitives.', 'Assisted writing and translation, scripts for repetitive tasks.'),
      },
    ],
  }
}

export function defaultHome(): HomeSettings {
  return {
    // "Compétences" is kept but hidden: the AI sections replace it
    sections: HOME_SECTIONS.map((id) => ({ id, visible: id !== 'skills' })),
    work: { title: t('Réalisations', 'Selected work'), intro: t('', ''), filters: true },
  }
}

export function emptyDatabase(): Database {
  return { version: 1, settings: defaultSettings(), categories: [], projects: [], media: [] }
}
