# Nigd Stock Website

Static marketing website for **Nigd Stock**, an AI-powered inventory management product by **Abyssinia Software Technology PLC**.

Production domain: [https://nigdstock.com/](https://nigdstock.com/)

## Stack

- Next.js (App Router) with TypeScript
- Tailwind CSS
- Static export (`output: 'export'`)
- Lucide React icons
- Local content modules (no CMS, database, or backend)

## Local development

```bash
cd nigdstock-website
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env.local` and adjust as needed:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Marketing site canonical URL |
| `NEXT_PUBLIC_WEB_APP_URL` | Web app / system login URL |
| `NEXT_PUBLIC_PLAY_STORE_URL` | Google Play download link |
| `NEXT_PUBLIC_APP_STORE_URL` | Apple App Store download link |
| `NEXT_PUBLIC_PHONE_TEL` | Call Now `tel:` value (e.g. `+251951050364`) |
| `NEXT_PUBLIC_PHONE_DISPLAY` | Phone shown in UI |
| `NEXT_PUBLIC_PHONE_LOCAL` | Local phone format |
| `NEXT_PUBLIC_EMAIL` | Contact / mailto address |
| `NEXT_PUBLIC_TUTORIAL_YOUTUBE_URL` | Watch tutorial YouTube URL |
| `NEXT_PUBLIC_WORKFLOW_YOUTUBE_URL` | How-to-use workflow YouTube URL |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console HTML-tag token (optional) |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Bing Webmaster `msvalidate.01` token (optional) |

Restart `npm run dev` after changing env values.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The production build writes a fully static site to the `out/` directory.

## Static export output

After `npm run build`, deploy the contents of:

```text
nigdstock-website/out/
```

Key generated files:

- `out/index.html` — homepage
- `out/robots.txt`
- `out/sitemap.xml`
- `out/404.html`
- route folders such as `about/`, `features/`, `contact/`, `privacy-policy/`, `am/`

## Deploy to nigdstock.com (cPanel)

This project exports a **static** site. You only upload the `out/` folder.

```bash
cd nigdstock-website
npm install
npm run build
npm run pack:cpanel
```

Then follow **[CPANEL-DEPLOY.md](./CPANEL-DEPLOY.md)** (upload zip → extract into `public_html` → AutoSSL → check sitemap).

Quick checklist after upload:

- https://nigdstock.com/
- https://nigdstock.com/robots.txt
- https://nigdstock.com/sitemap.xml
- https://nigdstock.com/features/
   - https://nigdstock.com/robots.txt
   - https://nigdstock.com/sitemap.xml
   - https://nigdstock.com/contact/

### Host notes

- Prefer hosts that serve `index.html` for directory URLs (`/about/` → `about/index.html`).
- This project uses `trailingSlash: true` for cleaner static hosting behavior.
- No Node.js server is required at runtime.

## Routes

| Path | Purpose |
|------|---------|
| `/` | English homepage |
| `/am/` | Amharic homepage |
| `/about/` | Company and product identity |
| `/features/` | Feature details |
| `/blog/` | Inventory software guides |
| `/blog/[slug]/` | Individual guide articles |
| `/contact/` | Contact details and demo request form |
| `/privacy-policy/` | Website privacy policy |

## Contact form behavior

The inquiry form validates fields and opens the visitor’s email app with a prepared `mailto:` message to `abyssiniasoftwaretechnologyplc@gmail.com`. The static site does **not** store or transmit form data by itself. Visitors must send the email.

## SEO launch

See [SEO-LAUNCH-CHECKLIST.md](./SEO-LAUNCH-CHECKLIST.md).
