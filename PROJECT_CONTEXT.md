# SHCS Bhajans API — Project Context

This document gives a Claude Code agent full context on the SHCS project so improvements to the bhajans-api Netlify site stay consistent with the app's design, branding, and purpose.

---

## Organisation

**Full name:** Sanatan Hindu Cultural Society (SHCS)  
**Short name:** SHCS Sutton Mandir  
**Location:** 16 Hill Rd, Carshalton SM5 3RA, Sutton, London  
**Tagline (Sanskrit):** वसुधैव कुटुम्बकम्  
**Tagline (English):** "The World is One Family"  
**Contact:** WhatsApp — +44 7443 801223  

SHCS is a Hindu community group serving approximately 8,000 Hindu people in Sutton and neighbouring areas. It was formed to provide a shared platform for worship, prayer, cultural, and religious functions.

---

## The App

A React Native / Expo SDK 54 mobile app (iOS + Android) with four tabs:

| Tab | Purpose |
|---|---|
| Home | About SHCS, address, WhatsApp contact button |
| Bhajans | Browse devotional songs, read lyrics in multiple languages, play audio |
| Donations | Donation information |
| Calendar | Yearly event calendar, upcoming events, admin panel |

The bhajans-api Netlify site is the **backend** that powers the Bhajans tab. The app fetches all bhajan data from it at runtime.

---

## Design Theme

The app uses a consistent **deep rose / gold** palette. Any web pages or documentation for the API should feel visually connected to this.

### Colours

| Role | Hex | Notes |
|---|---|---|
| Primary background | `#D03D56` | Deep rose/pink — used as the main background everywhere |
| Surface / card | `#C03550` | Slightly darker, used for cards and elements |
| Selected / pressed | `#B02848` | Darkest, used for active/pressed states |
| Primary text | `#FFF0F4` | Near-white with a warm pink tint |
| Secondary text | `#FFD0D8` | Soft pink, used for subtitles and captions |
| Accent / highlight | `#FFD700` | Gold — used for active tab indicators, dividers, buttons |

The colour scheme is the **same in both light and dark mode** — the app is always the rose/gold palette regardless of system setting.

### Visual style
- Warm, devotional, community feel — not tech-startup minimal
- Gold accents on a deep rose background
- Mandala decorations and Sanskrit text used throughout
- Typography: system fonts (San Francisco on iOS, system on Android)
- Rounded corners, generous padding, card-based layout

---

## Bhajans API

**Production URL:** `https://frabjous-froyo-6d788f.netlify.app`  
**Repo location:** `bhajans-api/` (this directory)  
**Hosting:** Netlify (static file serving via `data/` folder)

### Endpoints

```
GET /catalog.json              → full list of bhajans
GET /bhajans/:id/:lang.json    → lyrics for a bhajan in a specific language
GET /audio/:id.mp3             → audio file (only 3 bhajans have audio currently)
```

### Catalog format (`/catalog.json`)

```json
[
  {
    "id": "hanuman-chalisa",
    "title": "Hanuman Chalisa",
    "languages": [
      { "key": "english", "label": "English" },
      { "key": "hindi",   "label": "Hindi" },
      { "key": "gujarati","label": "Gujarati" }
    ]
  }
]
```

Bhajans with `"languages": []` are audio-only (no lyrics available).

### Lyrics format (`/bhajans/:id/:lang.json`)

```json
{
  "id": "hanuman-chalisa",
  "title": "Hanuman Chalisa",
  "lyrics": [
    {
      "type": "verse",
      "number": 1,
      "lines": ["line one", "line two", "..."]
    },
    {
      "type": "doha",
      "lines": ["doha line one", "doha line two"]
    }
  ]
}
```

Stanza types: `"verse"`, `"doha"`, `"dhyanam"`. The `number` field is only present on `"verse"` type.

### Current bhajan catalogue (20 bhajans)

| ID | Title | Languages |
|---|---|---|
| `om-sham-shanicharaya-namah` | Om Sham Shanicharaya Namah | Audio only |
| `om-jaye-jagadish-hare` | Om Jai Jagadish Hare | EN, HI, GU, KA, ML, TA, TE |
| `hanuman-chalisa` | Hanuman Chalisa | EN, HI, GU, KA, ML, TA, TE |
| `durga-chalisa` | Durgā Cālīsā | EN, HI, GU, KA, ML, TA, TE |
| `achyutam-keshavam` | Achyutam Keshavam | EN, HI, TE |
| `hari-mhanaa-thumhi-govinda-mhanaa` | Hari Mhanaa Thumhi Govinda Mhanaa | EN, MR |
| `omkar-pradhan-rupa-ganeshantse` | Omkar Pradhan Rupa Ganeshache | EN, MR |
| `shiv-kailashon-ke-waasi` | Shiv Kailashon Ke Waasi | EN, HI |
| `om-namah-shivaya` | Om Namah Shivaya | EN, HI |
| `mhaara-ghat-ma-biraajta` | Mara Ghat Ma Birajta | EN, GU, HI |
| `kabhi-ram-banke-kabhi-shyam-banke` | Kabhi Ram Banke Kabhi Shyam Banke | EN, HI |
| `chote-chote-gaiya-chote-chote-gwal` | Choti Choti Gaiya, Chotay Chotay Gwaal | EN, HI |
| `bhor-bhai-din-chadh-gaya-meri-ambey` | Bhor Bhai Din Chadh Gaya Meri Ambey | EN, HI |
| `nammamma-sharade-uma-maheshwari` | NammammA shArade umA mahEshwarI | EN, KA |
| `taal-bole-chipalila-naach-maazyasang` | Taal Bole Chipalila, Naach Maazyasang | EN, MR |
| `hari-sundar-nanda-mukunda` | Hari Sundar Nanda Mukunda | EN, HI |
| `abir-gulaal-udhalit-rang` | Abir Gulaal Udhalit Rang | EN, MR |
| `krishna-nee-begane-baro` | Krishna Nee Begane Baro | EN, KA |
| `va-vaya-ne-vadal-umataya` | Va Vaya Ne Vadal Umatya | EN, GU |
| `garudagamana-tava` | Garuḍagamana Tava | EN, HI, GU, TE, TA, KA, ML |

**Language codes:** EN = English, HI = Hindi, GU = Gujarati, KA = Kannada, ML = Malayalam, TA = Tamil, TE = Telugu, MR = Marathi

### Audio files

Only 3 bhajans currently have audio hosted at `/audio/:id.mp3`:
- `om-sham-shanicharaya-namah`
- `om-jaye-jagadish-hare`
- `hanuman-chalisa`

---

## File structure

```
bhajans-api/
├── data/                        ← Netlify serves this folder as static files
│   ├── catalog.json             ← master bhajan list
│   ├── bhajans/
│   │   └── <id>/
│   │       ├── english.json
│   │       ├── hindi.json
│   │       └── ...
│   └── audio/
│       └── <id>.mp3
├── _headers                     ← Netlify CORS headers
├── netlify.toml                 ← publish = "data"
├── server.js                    ← local dev server (not used in production)
└── package.json
```

---

## Tone and language

- Respectful, warm, community-focused
- The audience is Hindu families in the UK
- Content spans multiple South Asian languages — handle encoding carefully (UTF-8, Devanagari, Tamil script, etc.)
- The Sanskrit tagline वसुधैव कुटुम्बकम् ("The World is One Family") captures the spirit of the project
