#!/usr/bin/env node
/**
 * Builds /seed (starter content) from the previous portfolio (mverzeletti.com):
 * texts (French, lightly proof-read, + English translation), images, videos, CV.
 *
 *   node scripts/import-legacy.mjs                  # downloads from https://mverzeletti.com
 *   node scripts/import-legacy.mjs --from ./old-site  # uses a local copy of the old site
 *
 * On first start the server copies /seed into /data (see server/utils/db.ts).
 * Delete /data to start again from the seed.
 */
import { promises as fs, existsSync } from 'node:fs'
import { join, extname, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'

const args = process.argv.slice(2)
const arg = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const ORIGIN = 'https://mverzeletti.com'
const OUT = resolve(arg('--out') || 'seed')
let FROM = arg('--from') ? resolve(arg('--from')) : null

const t = (fr, en) => ({ fr, en })
const now = new Date().toISOString()

/* ------------------------------------------------------------------ files */
async function fetchTo(rel, dest) {
  const url = `${ORIGIN}/${rel.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  await fs.mkdir(dirname(dest), { recursive: true })
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
}
async function source(rel) {
  const local = join(FROM, rel)
  if (!existsSync(local)) await fetchTo(rel, local)
  return local
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.pdf': 'application/pdf' }
const media = []

async function addMedia(id, rel, alt = t('', '')) {
  const file = await source(rel)
  const data = await fs.readFile(file)
  const ext = extname(rel).toLowerCase()
  const mime = MIME[ext]
  const dir = join(OUT, 'uploads', id)
  await fs.mkdir(dir, { recursive: true })
  const name = `original${ext === '.jpeg' ? '.jpg' : ext}`
  await fs.writeFile(join(dir, name), data)
  const m = {
    id,
    kind: mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file',
    mime,
    file: name,
    originalName: rel.split('/').pop(),
    size: data.length,
    alt,
    createdAt: now,
  }
  if (mime === 'image/png' || mime === 'image/jpeg') {
    const meta = await sharp(data).metadata()
    m.width = meta.width
    m.height = meta.height
    const targets = [480, 960, 1600, 2400].filter((w) => w < meta.width)
    targets.push(Math.min(meta.width, 2880))
    m.variants = []
    for (const w of [...new Set(targets)]) {
      const out = `w${w}.webp`
      const info = await sharp(data).rotate().resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 88, smartSubsample: true, effort: 5 }).toFile(join(dir, out))
      m.variants.push({ width: info.width, height: info.height, file: out })
    }
  } else if (mime === 'image/svg+xml') {
    const meta = await sharp(data).metadata().catch(() => null)
    if (meta) {
      m.width = meta.width
      m.height = meta.height
    }
  }
  media.push(m)
  process.stdout.write('.')
  return id
}

/* ----------------------------------------------------------------- blocks */
let bid = 0
const B = (type, col, row, extra = {}) => ({ id: `b_seed${++bid}`, type, col, row, visible: true, ...extra })
const text = (fr, en, col = 2, extra = {}) => B('text', col, 1, { text: t(fr, en), variant: 'body', ...extra })
const lead = (fr, en, col = 2) => text(fr, en, col, { variant: 'lead' })
const h2 = (fr, en, col = 3) => B('heading', col, 1, { text: t(fr, en), level: 2 })
const h3 = (fr, en, col = 1) => B('heading', col, 1, { text: t(fr, en), level: 3 })
const img = (mediaId, col = 1, row = 1, extra = {}) =>
  B('image', col, row, { mediaId, effect: 'duotone', fit: 'cover', caption: t('', ''), ...extra })
const vid = (mediaId, col = 3, row = 3, extra = {}) =>
  B('video', col, row, { mediaId, effect: 'duotone', fit: 'cover', caption: t('', ''), autoplay: true, ...extra })
const divider = () => B('divider', 3, 1)
const link = (url, fr, en, col = 1) => B('link', col, 1, { url, text: t(fr, en) })

/* ------------------------------------------------------------------- main */
async function main() {
  if (!FROM) {
    FROM = join(tmpdir(), 'mverzeletti-legacy')
    await fs.mkdir(FROM, { recursive: true })
    console.log(`Downloading the previous site into ${FROM}`)
  }
  await fs.rm(OUT, { recursive: true, force: true })
  await fs.mkdir(join(OUT, 'uploads'), { recursive: true })

  const shot = (fr = "Capture d'écran", en = 'Screenshot') => t(fr, en)

  // ---------- shared media
  const avatar = await addMedia('m_avatar', 'style/images/Profil.svg', t('Portrait dessiné de Maxime', 'Drawn portrait of Maxime'))
  const cv = await addMedia('m_cv', 'CV - Verzeletti Maxime.pdf', t('CV de Maxime Verzeletti', 'Resume of Maxime Verzeletti'))

  // ---------- categories
  const categories = [
    { id: 'c_gamedev', slug: 'game-dev', name: t('Game Dev', 'Game dev'), order: 0 },
    { id: 'c_web', slug: 'developpement-web', name: t('Développement web', 'Web development'), order: 1 },
    { id: 'c_crea', slug: 'crea-numerique', name: t('Créa numérique', 'Digital art'), order: 2 },
    { id: 'c_photo', slug: 'photographie', name: t('Photographie', 'Photography'), order: 3 },
    { id: 'c_other', slug: 'autre', name: t('Autre', 'Other'), order: 4 },
  ]

  // ---------- 1. Unity prototype
  const u = (n) => `traces/trace-1/${n}`
  const unityAlt = shot("Capture d'écran du prototype Unity", 'Screenshot of the Unity prototype')
  const unity = {
    id: 'p_unity',
    slug: 'prototype-unity',
    title: t('Prototype Unity', 'Unity prototype'),
    summary: t(
      'Mes premiers pas avec le moteur **Unity** et le langage **C#** : une petite scène 3D jouable dans le navigateur.',
      'My first steps with the **Unity** engine and **C#**: a small 3D scene you can play in the browser.',
    ),
    categoryIds: ['c_gamedev'],
    year: '',
    tools: ['Unity', 'C#', 'WebGL'],
    coverId: await addMedia('m_t1cover', u('minia.png'), unityAlt),
    coverEffect: 'dots',
    card: { col: 2, row: 1 },
    link: { url: 'http://mmi24h10.mmi-troyes.fr/games/mov/', label: t('Jouer au prototype', 'Play the prototype') },
    visible: true,
    order: 0,
    blocks: [
      lead(
        "**Unity** est un **moteur de jeu** multiplateforme (smartphone, ordinateur, consoles de jeux vidéo et Web) développé par Unity Technologies. Il a la particularité de proposer une licence gratuite dite « Personal », avec quelques limitations de technologies avancées au niveau de l'éditeur, mais sans limitation au niveau du moteur.",
        '**Unity** is a cross-platform **game engine** (smartphone, computer, consoles and web) developed by Unity Technologies. It offers a free “Personal” licence, with a few limitations on advanced editor features but none on the engine itself.',
      ),
      text(
        "C'est **l'un des deux moteurs les plus répandus dans l'industrie** du jeu vidéo, aussi bien chez les **grands studios** que chez les **indépendants**. Par rapport à son principal concurrent, Unreal Engine, Unity est réputé pour son interface plus accessible et mieux adaptée aux créations indépendantes.",
        'It is **one of the two most widely used engines in the industry**, by **big studios** and **indie developers** alike. Compared with its main competitor, Unreal Engine, Unity is known for a more approachable interface that suits independent productions.',
        1,
      ),
      h2('Démarche', 'Process', 1),
      text(
        "Dans un cadre universitaire et pour mon avenir professionnel, j'ai commencé l'apprentissage du moteur de jeu Unity et du langage C#.",
        'As part of my degree, and with my future career in mind, I started learning the Unity engine and the C# language.',
        2,
        { variant: 'lead' },
      ),
      h3('Première étape', 'Step one'),
      text(
        "Pour expérimenter avec le moteur, j'ai réalisé un petit projet sans prétention afin de découvrir le système d'herbe. J'ai d'abord créé une petite scène que j'ai sculptée pour y ajouter des bosses, de la complexité et de la vie. J'ai ensuite ajouté de l'herbe avec le système intégré à Unity, ainsi qu'une capsule qui servira plus tard de joueur.\n\n*Dans les moteurs de jeu, on représente souvent un humain par une capsule : c'est une forme simple et stable qui gère bien les collisions, les déplacements et les marches sans se coincer dans le décor.*",
        "To experiment with the engine, I built a small, unpretentious project to discover the grass system. I first created a little scene that I sculpted to add bumps, complexity and life. I then added grass with Unity's built-in system, plus a capsule that would later become the player.\n\n*Game engines often use a capsule to represent a human: it is a simple, stable shape that handles collisions, movement and stairs without getting stuck in the scenery.*",
      ),
      img(await addMedia('m_t1p1', u('pic1.png'), unityAlt)),
      img(await addMedia('m_t1p2', u('pic2.png'), unityAlt)),
      img(await addMedia('m_t1p3', u('pic3.png'), unityAlt)),
      vid(await addMedia('m_t1v1', u('mov1.mp4'), unityAlt)),
      h3('Deuxième étape', 'Step two'),
      text(
        "J'ai ensuite enrichi la scène avec des arbres et des pierres. Pour cela, j'ai installé des *prefabs* depuis une bibliothèque en ligne (un prefab est un modèle d'objet déjà configuré, avec ses composants et ses réglages, que l'on peut réutiliser facilement dans son jeu). J'ai aussi ajouté de gros rochers pour délimiter la zone de jeu et éviter que le joueur ne sorte de la carte et tombe dans le vide.",
        "Next, I enriched the scene with trees and rocks. To do so, I installed *prefabs* from an online library (a prefab is a pre-configured object template, with its components and settings, that can easily be reused across a game). I also added large boulders to fence in the play area so the player can't leave the map and fall into the void.",
      ),
      img(await addMedia('m_t1p4', u('pic4.png'), unityAlt)),
      img(await addMedia('m_t1p5', u('pic5.png'), unityAlt)),
      img(await addMedia('m_t1p6', u('pic6.png'), unityAlt)),
      vid(await addMedia('m_t1v2', u('mov2.mp4'), unityAlt)),
      h3('Troisième étape', 'Step three'),
      text(
        "J'ai ensuite ajouté le système de déplacement du joueur et le mouvement de la caméra à la souris.",
        "Then I added the player's movement system and the mouse-controlled camera.",
      ),
      vid(await addMedia('m_t1v3', u('mov3.mp4'), unityAlt), 2, 2),
      vid(await addMedia('m_t1v4', u('mov4.mp4'), unityAlt), 1, 1),
      text(
        "**Dernière étape**\n\nPour finir, j'ai utilisé le module WebGL pour pouvoir jouer au prototype directement depuis un navigateur web.",
        '**Final step**\n\nFinally, I used the WebGL build target so the prototype can be played straight from a web browser.',
        1,
      ),
      vid(await addMedia('m_t1v5', u('mov5.mp4'), unityAlt), 2, 2),
      link('http://mmi24h10.mmi-troyes.fr/games/mov/', 'Jouer au prototype', 'Play the prototype'),
    ],
    createdAt: now,
    updatedAt: now,
  }

  // ---------- 2. Database website
  const d = (n) => `traces/trace-2/${n}`
  const dbAlt = shot("Capture d'écran du site osu!", 'Screenshot of the osu! website')
  const dbsite = {
    id: 'p_dbsite',
    slug: 'site-avec-base-de-donnees',
    title: t('Site avec base de données', 'Database-driven website'),
    summary: t(
      'Un site dynamique autour du jeu de rythme osu! : deux tables liées, un back-office complet et une interface responsive.',
      'A dynamic website about the rhythm game osu!: two linked tables, a full back-office and a responsive interface.',
    ),
    categoryIds: ['c_web'],
    year: '',
    tools: ['HTML5', 'CSS3', 'PHP', 'SQL'],
    coverId: await addMedia('m_t2cover', d('minia.png'), dbAlt),
    coverEffect: 'dots',
    card: { col: 1, row: 1 },
    link: { url: '', label: t('', '') },
    visible: true,
    order: 1,
    blocks: [
      lead(
        "Pour un **projet universitaire**, j'ai dû réaliser un site reposant sur des **bases de données**, sur un sujet libre. L'une des consignes était d'avoir **deux tables qui communiquent entre elles**. J'ai choisi le jeu osu! : une table recense les cartes du jeu et une autre les personnes qui les ont créées. osu! est un jeu de rythme dans lequel le joueur doit accomplir des actions en rythme avec la musique. Une **partie back-office** était également demandée pour modifier, ajouter ou supprimer les données directement depuis le site.",
        'For a **university project**, I had to build a website backed by **databases**, on a topic of my choice. One requirement was to have **two tables that talk to each other**. I chose the game osu!: one table lists the game\'s maps and another the people who created them. osu! is a rhythm game where the player has to perform actions in time with the music. A **back-office** was also required to edit, add or delete data straight from the site.',
      ),
      img(await addMedia('m_t2p1', d('pic1.png'), dbAlt)),
      text(
        "J'ai ajouté de nombreuses fonctionnalités, comme un **menu latéral** qui s'ouvre à droite au clic sur le bouton « + » et qui regroupe de nombreuses informations sur la carte et sur son auteur. Dans le back-office, l'ajout d'un mappeur affiche un drapeau mis à jour en temps réel, pour visualiser simplement celui qui apparaîtra dans le menu.\n\nPour faciliter la gestion, j'ai aussi retravaillé le tableau d'administration pour le rendre plus agréable, lisible et **responsive**, afin qu'il reste consultable même sur téléphone.",
        'I added many features, such as a **side panel** that slides in from the right when you click the “+” button, gathering plenty of information about the map and its creator. In the back-office, adding a mapper shows a flag that updates in real time, so you can easily preview the one displayed in the panel.\n\nTo make management easier, I also restyled the admin table to make it more pleasant, readable and **responsive**, so it can be used even on a phone.',
      ),
      img(await addMedia('m_t2p2', d('pic2.png'), dbAlt)),
      img(await addMedia('m_t2p3', d('pic3.png'), dbAlt)),
      img(await addMedia('m_t2p4', d('pic4.png'), dbAlt)),
      img(await addMedia('m_t2p5', d('pic5.png'), dbAlt)),
    ],
    createdAt: now,
    updatedAt: now,
  }

  // ---------- 3. Photography
  const ph = (n) => `traces/trace-3/${n}`
  const phAlt = t('Photographie de nature', 'Nature photograph')
  const photo = {
    id: 'p_photo',
    slug: 'photo-organique',
    title: t('Photo organique', 'Organic photography'),
    summary: t(
      "Une série de photographies de nature réalisée avec le club photo de l'IUT.",
      'A series of nature photographs taken with the IUT photo club.',
    ),
    categoryIds: ['c_photo'],
    year: '',
    tools: ['Lightroom'],
    coverId: await addMedia('m_t3cover', ph('minia.png'), phAlt),
    coverEffect: 'dots',
    card: { col: 1, row: 1 },
    link: { url: '', label: t('', '') },
    visible: true,
    order: 2,
    blocks: [
      lead(
        "La photographie étant l'une de mes passions, j'ai choisi de m'inscrire au **club photo de l'IUT**. J'y ai amélioré mes compétences et pris plusieurs photos dont je suis fier.",
        "Photography being one of my passions, I joined the **IUT photo club**. There I sharpened my skills and took several pictures I'm proud of.",
        1,
      ),
      img(await addMedia('m_t3p1', ph('pic1.png'), phAlt), 2, 3),
      img(await addMedia('m_t3p2', ph('pic2.png'), phAlt), 1, 2),
      img(await addMedia('m_t3p3', ph('pic3.png'), phAlt), 1, 2),
      img(await addMedia('m_t3p4', ph('pic4.png'), phAlt), 1, 2),
      img(await addMedia('m_t3p5', ph('pic5.png'), phAlt), 1, 2),
    ],
    createdAt: now,
    updatedAt: now,
  }

  // ---------- 4. Voxel art
  const v = (n) => `traces/trace-4/${n}`
  const vxAlt = t('Modèle en voxel art', 'Voxel art model')
  const voxel = {
    id: 'p_voxel',
    slug: 'modelisation-voxel-art',
    title: t('Modélisation en voxel art', 'Voxel art modelling'),
    summary: t(
      'Des armes et des paysages modélisés dans **MagicaVoxel** pour préparer mes futurs jeux.',
      'Weapons and landscapes modelled in **MagicaVoxel** as groundwork for my future games.',
    ),
    categoryIds: ['c_crea'],
    year: '',
    tools: ['MagicaVoxel'],
    coverId: await addMedia('m_t4cover', v('minia.jpg'), vxAlt),
    coverEffect: 'dots',
    card: { col: 2, row: 1 },
    link: { url: '', label: t('', '') },
    visible: true,
    order: 3,
    blocks: [
      lead(
        "Pour la création de mes futurs jeux, et par amour du voxel art, j'ai décidé de m'entraîner en réalisant des prototypes avec le logiciel **MagicaVoxel**, choisi pour sa simplicité et sa popularité.",
        'With my future games in mind, and out of love for voxel art, I decided to practise by making prototypes in **MagicaVoxel**, chosen for its simplicity and popularity.',
      ),
      divider(),
      h2('Armes', 'Weapons', 1),
      text(
        "Pour commencer mon apprentissage, j'ai choisi des objets simples à créer : différentes armes (épée, dague, arc et sceptre magique). J'ai commencé par l'épée en réalisant un croquis assez vague de la forme, dans un style fantastique et exagéré, avant d'en modéliser la forme de base.\n\nUne fois celle-ci terminée, j'ai ajouté du relief et des détails pour apporter du volume et du dynamisme. J'ai ensuite choisi une palette de couleurs chaudes et vives rappelant la lave ou le magma, pour donner du mystère et une histoire à l'objet. Pour finir, j'ai peaufiné la forme et les couleurs de l'épée.",
        "To start learning, I picked objects that are simple to build: various weapons (sword, dagger, bow and magic sceptre). I began with the sword by sketching a rough shape in an exaggerated fantasy style, then modelled its basic form.\n\nOnce that was done, I added relief and details to bring volume and dynamism. I then chose a warm, vivid colour palette reminiscent of lava or magma to give the object mystery and a story. Finally, I polished the sword's shape and colours.",
      ),
      h3("Processus pour l'épée", 'Making the sword', 3),
      img(await addMedia('m_t4p1', v('pic1.jpg'), vxAlt), 1, 2),
      img(await addMedia('m_t4p2', v('pic2.jpg'), vxAlt), 1, 2),
      img(await addMedia('m_t4p3', v('pic3.jpg'), vxAlt), 1, 2),
      img(await addMedia('m_t4p4', v('pic4.jpg'), vxAlt), 1, 2),
      { ...h3('Autres armes', 'Other weapons', 2), row: 2 },
      img(await addMedia('m_t4p5', v('pic5.jpg'), vxAlt), 1, 2),
      img(await addMedia('m_t4p6', v('pic6.jpg'), vxAlt), 1, 2),
      img(await addMedia('m_t4p7', v('pic7.jpg'), vxAlt), 1, 2),
      divider(),
      h2('Paysages', 'Landscapes', 1),
      text(
        "Pour expérimenter avec les différentes options du logiciel, comme la transparence et l'émission de lumière, j'ai aussi réalisé des scènes avec de l'eau. Pour donner un effet de profondeur, j'ai appliqué différents niveaux de transparence aux différentes couches, et j'ai ajouté des éléments lumineux pour donner vie à la scène.",
        "To experiment with the software's options such as transparency and light emission, I also made scenes with water. To create a sense of depth, I applied different levels of transparency to each layer, and added glowing elements to bring the scene to life.",
      ),
      img(await addMedia('m_t4p8', v('pic8.jpg'), vxAlt), 2, 3),
      img(await addMedia('m_t4p9', v('pic9.jpg'), vxAlt), 1, 2),
    ],
    createdAt: now,
    updatedAt: now,
  }

  // ---------- settings
  const settings = {
    name: 'Maxime Verzeletti',
    role: t('Développeur web & designer', 'Web developer & designer'),
    hero: {
      kicker: t('Portfolio', 'Portfolio'),
      title: t('Donner vie aux projets numériques', 'Bringing digital projects to life'),
      intro: t(
        "Bonjour, je suis **Maxime Verzeletti**. Actuellement étudiant en **BUT MMI** à l'IUT de Troyes, j'allie **développement web**, **design** et **stratégie de communication** pour donner vie à des **projets interactifs numériques**.",
        "Hi, I'm **Maxime Verzeletti**. Currently studying for a **BUT MMI** degree (Multimedia & Internet) at the IUT of Troyes, I combine **web development**, **design** and **communication strategy** to bring **interactive digital projects** to life.",
      ),
      imageId: null,
      effect: 'dots',
      tabs: [
        { label: t('Développement', 'Development'), line: t('HTML, CSS, JS, PHP, SQL — des sites rapides et soignés', 'HTML, CSS, JS, PHP, SQL — fast, polished websites') },
        { label: t('Design', 'Design'), line: t('Interfaces, voxel art et photographie', 'Interfaces, voxel art and photography') },
        { label: t('Communication', 'Communication'), line: t('Des stratégies et des contenus qui ont du sens', 'Strategies and content that make sense') },
      ],
    },
    about: {
      title: t('Qui suis-je ?', 'Who am I?'),
      body: t(
        "Étudiant en **BUT Métiers du Multimédia et de l'Internet** à l'IUT de Troyes, je navigue entre **code**, **design** et **communication**. J'aime construire des expériences interactives soignées, du site web au prototype de jeu vidéo.\n\nEn dehors des cours, je pratique la **photographie** avec le club photo de l'IUT, je modélise en **voxel art** et j'apprends en continu : Three.js, Vue.js, Symfony ou encore C# avec Unity.",
        "A student in the **BUT MMI** (Multimedia & Internet) programme at the IUT of Troyes, I move between **code**, **design** and **communication**. I love building polished interactive experiences, from websites to video game prototypes.\n\nOutside class, I do **photography** with the IUT photo club, model in **voxel art** and keep learning: Three.js, Vue.js, Symfony and C# with Unity.",
      ),
      imageId: avatar,
      effect: 'none',
      facts: [
        { label: t('Formation', 'Education'), value: t("BUT MMI — IUT de Troyes", 'BUT MMI — IUT of Troyes') },
        { label: t('Domaines', 'Fields'), value: t('Développement web, design, stratégie de communication', 'Web development, design, communication strategy') },
        { label: t('Passions', 'Interests'), value: t('Photographie, voxel art, jeu vidéo', 'Photography, voxel art, video games') },
        { label: t('En ce moment', 'Right now'), value: t("J'apprends Three.js, Vue.js, Symfony et C#", "Learning Three.js, Vue.js, Symfony and C#") },
      ],
    },
    skills: {
      title: t('Compétences', 'Skills'),
      groups: [
        { title: t('Je maîtrise', 'What I master'), items: ['HTML5', 'CSS3', 'Sass', 'JavaScript', 'PHP', 'SQL', 'JSON', 'WordPress', 'Git'] },
        { title: t("J'apprends activement", 'Actively learning'), items: ['Three.js', 'Vue.js', 'Symfony', 'C#'] },
        { title: t('Outils & logiciels', 'Tools & software'), items: ['Unity', 'Blender', 'MagicaVoxel', 'Lightroom'] },
      ],
    },
    contact: {
      title: t('Travaillons ensemble', "Let's work together"),
      text: t(
        'Un stage, une alternance, un projet ou simplement une idée à partager ? Écris-moi, je réponds rapidement.',
        'An internship, a work-study position, a project or just an idea to share? Drop me a line, I reply quickly.',
      ),
      email: 'verzeletti.maxime@gmail.com',
    },
    socials: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/maxime-verzeletti' },
      { label: 'GitHub', url: 'https://github.com/max-vzlt' },
      { label: 'Instagram', url: 'https://www.instagram.com/maxime.vzlt/' },
    ],
    cvId: cv,
    home: {
      sections: ['work', 'about', 'skills', 'contact'].map((id) => ({ id, visible: true })),
      work: { title: t('Réalisations', 'Selected work'), intro: t('', ''), filters: true },
    },
    seo: {
      description: t(
        "Portfolio de Maxime Verzeletti, étudiant en BUT MMI à l'IUT de Troyes : développement web, design et communication.",
        'Portfolio of Maxime Verzeletti, BUT MMI student at the IUT of Troyes: web development, design and communication.',
      ),
    },
  }

  const db = { version: 1, settings, categories, projects: [unity, dbsite, photo, voxel], media }
  await fs.writeFile(join(OUT, 'db.json'), JSON.stringify(db, null, 2))
  console.log(`\nSeed written to ${OUT} (${media.length} media)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
