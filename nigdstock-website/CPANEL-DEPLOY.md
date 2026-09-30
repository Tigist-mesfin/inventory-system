# Deploy Nigd Stock website to cPanel

This site is a **static export**. cPanel does **not** need Node.js for production.

Production domain: `https://nigdstock.com`

## 1. Before you upload (on your PC)

1. Open `nigdstock-website/.env.local` and confirm:
   - `NEXT_PUBLIC_SITE_URL=https://nigdstock.com`
   - phone, email, store, tutorial links are correct
2. In a terminal:

```bash
cd nigdstock-website
npm install
npm run build
npm run pack:cpanel
```

That creates:

- `nigdstock-website/out/` — files to upload
- `nigdstock-website/nigdstock-website-cpanel.zip` — ready for File Manager

## 2. cPanel upload

### Option A — File Manager (easiest)

1. Log in to cPanel → **File Manager**
2. Open the domain document root:
   - main domain → usually `public_html`
   - addon / subdomain → the folder mapped to `nigdstock.com`
3. **Optional but recommended:** delete old site files inside that folder first
   (keep `cgi-bin` if your host created it)
4. Enable **Show Hidden Files** (so `.htaccess` is visible)
5. Upload `nigdstock-website-cpanel.zip`
6. Right-click → **Extract** into the document root
7. Confirm these exist in the root:
   - `index.html`
   - `.htaccess`
   - `robots.txt`
   - `sitemap.xml`
   - `404.html`
   - folders like `about/`, `features/`, `am/`, `blog/`, `_next/`, `images/`

Upload the **contents of `out/`**, not the project source (`app/`, `node_modules/`, etc.).

### Option B — FTP / FileZilla

1. Connect with your cPanel FTP account
2. Open `public_html` (or the `nigdstock.com` folder)
3. Upload everything inside `out/` (including `.htaccess`)

## 3. Domain + SSL

1. cPanel → **Domains** / **Zone Editor**
   - Point `nigdstock.com` (and ideally `www`) to this hosting account
2. cPanel → **SSL/TLS Status** → run **AutoSSL** for `nigdstock.com` and `www`
3. Wait until HTTPS works
4. Open:
   - https://nigdstock.com/
   - https://nigdstock.com/robots.txt
   - https://nigdstock.com/sitemap.xml
   - https://nigdstock.com/features/
   - https://nigdstock.com/am/
   - a fake URL to confirm custom 404 (e.g. `/this-page-does-not-exist/`)

The included `.htaccess` forces HTTPS and redirects `www` → apex (`nigdstock.com`).

## 4. After go-live (SEO)

1. Google Search Console → add `https://nigdstock.com/` → verify → submit sitemap  
   `https://nigdstock.com/sitemap.xml`
2. Bing Webmaster Tools → same sitemap
3. If you get verification tokens, put them in `.env.local`, rebuild, and re-upload
4. Claim Google Business Profile with the same phone/address as the site

## 5. Updating the site later

```bash
cd nigdstock-website
npm run build
npm run pack:cpanel
```

Then replace the files in `public_html` with the new zip contents.

## Fix: website looks unstyled (no CSS)

Your cPanel folder is messy if it has **both** `_next` and `assets` plus an `out` folder and old zip files.

### Clean install (do this exactly)

1. In File Manager → `public_html`
2. **Delete these** (select → Delete):
   - `_next`
   - `assets`
   - `out`
   - `about`, `am`, `blog`, `contact`, `features`, `privacy-policy`, `images`
   - `index.html`, `404.html`, `.htaccess`, `robots.txt`, `sitemap.xml`, `favicon.ico`, `manifest.webmanifest`
   - all `nigdstock*.zip`, `out.zip`, and `__next__*.txt`
3. Keep only things you need that are **not** from this website (for example old `cgi-bin`, email folders, or PHP files you still use)
4. Upload the **new** `nigdstock-website-cpanel.zip` from your PC
5. Extract **into `public_html`** (not into a subfolder)
6. Confirm you see **`site-assets`** folder next to `index.html`
7. Open https://nigdstock.com/ and press **Ctrl+F5**

Check this URL works (should not be 404):  
`https://nigdstock.com/site-assets/static/chunks/`

### Wrong layout

```text
public_html/out/index.html     ← WRONG
public_html/_next/             ← old / blocked
```

### Correct layout

```text
public_html/index.html
public_html/site-assets/
public_html/.htaccess
public_html/about/
...
```

## Do NOT upload

- `node_modules/`
- `.next/`
- `.env.local`
- source folders (`app/`, `components/`, `lib/`)

Only the built `out/` files (or the zip) are needed on cPanel.
