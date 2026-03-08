# LePapelier's Web Portfolio Template

You can preview what this template looks like at: [https://lepapelier.github.io/my-web-portfolio-template/](https://lepapelier.github.io/my-web-portfolio-template/)

---

## About the site

This website presents your profile through an explorable graph interface.
The central node opens to reveal connected sections about who you are, what you build, and what you work on.

### Main sections

- **Profile** — background, research interests, and location.
- **Projects** — selected work.
- **Experience** — internships and research roles.
- **Contact** — direct contact option from the site.
- **GitHub** — link to your public repositories.

### Language

The portfolio is available in English and French.

---

## Fork & customise

All personal content is centralised in the `portfolio/` folder at the root of the repository.  
**You never need to touch any file in `src/` to make the portfolio your own.**

```
portfolio/
├── types.ts           ← shared data types (Language, CardContent)
├── identity.ts        ← your name, GitHub URL, and site URL
├── nodes/
│   ├── labels.ts      ← bilingual display labels for every node
│   └── structure.ts   ← graph hierarchy (parent → children) + extra edges
└── cards/
    ├── en.ts          ← English card content (institution, summary, bullet points)
    └── fr.ts          ← French card content
```

### 1 — Identity (`portfolio/identity.ts`)

```ts
export const fullName = 'Your Name'        // shown on the central node
export const githubUrl = 'https://github.com/your-username'
export const siteUrl   = 'https://your-site.com'
```

### 2 — Node labels (`portfolio/nodes/labels.ts`)

Each key is a `templateKey` used throughout the graph. Update the `en` and `fr`
objects to rename any node. Add a new key when you add a new node to the structure.

### 3 — Graph structure (`portfolio/nodes/structure.ts`)

`graphStructure` describes the parent → children relationships.  
`symmetricEdges` declares extra visual connections between non-adjacent nodes.

Add, remove, or rename any entry. Every `key` you use here must also appear in
`labels.ts`.

### 4 — Card content (`portfolio/cards/en.ts` and `fr.ts`)

Each entry corresponds to a **leaf node** (a node with no children) that is rendered as
an expandable card. Leaf nodes without card content may instead be rendered as external-link
or special nodes (for example, mail or GitHub). Fill in:

| field | description |
|---|---|
| `institutionText` | (optional) company / lab / school name |
| `summaryText` | one-line summary shown on the collapsed card |
| `detailsText` | Markdown-style bullet list shown in the expanded card |

---

## Email — GitHub secret (anti-spam)

The contact card displays your email address as an **SVG image** instead of plain
text. This prevents spam bots from scraping your address out of the HTML source.

The email is **never committed to the repository**. It is injected at build time
through a GitHub Actions secret and rendered into an SVG by
`scripts/generate-email-svg.mjs`.

### How to set it up
1. Create your GitHub repository by clicking **Use this template** from the project page.
2. Go to **Settings → Pages → Build and deployment** and select **GitHub Actions** as the deployment method.
3. In your repository, navigate to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `EMAIL` — Value: your email address (e.g. `hello@example.com`).
4. Save.

The CI workflow (`.github/workflows/deploy.yml`) then runs:

```yaml
- name: Generate email SVG
  env:
    EMAIL: ${{ secrets.EMAIL }}
  run: node scripts/generate-email-svg.mjs \
         --email "${EMAIL}" \
         --font  "public/fonts/Lato-Regular.ttf" \
         --out   "public/private-contact/email.svg"
```

This generates `public/private-contact/email.svg` on the fly — it is included in
the deployed build but never stored in git.

> **Why bother?**  
> Scrapers index GitHub repositories and harvest any email address found in plain
> text, feeding spam campaigns. Rendering your address as an SVG path makes it
> invisible to these bots while still being readable by real visitors.

### Local development

To preview the email card locally, run the SVG generator once:

```bash
node scripts/generate-email-svg.mjs \
  --email "your@email.com" \
  --font  "public/fonts/Lato-Regular.ttf" \
  --out   "public/private-contact/email.svg"
```

The generated file is listed in `.gitignore` and will not be committed.

---

## Development

```bash
npm install   # install dependencies
npm run dev   # start the Vite dev server
npm run build # production build (TypeScript + Vite)
npm run lint  # ESLint
```

Deploy to GitHub Pages is automatic on every push to `main` via GitHub Actions.

### Base URL

The build uses the `VITE_BASE_URL` environment variable to set the Vite [`base`](https://vite.dev/config/shared-options.html#base) option.
The CI workflow sets it automatically:

- **No custom domain** (deployed at `https://<user>.github.io/<repo>/`): the workflow sets `VITE_BASE_URL=/<repo-name>/`.
- **Custom domain** (a real hostname in `public/CNAME`): the workflow sets `VITE_BASE_URL=/`.

If you deploy somewhere else, set `VITE_BASE_URL` to the sub-path where your site is served before running `npm run build`.
