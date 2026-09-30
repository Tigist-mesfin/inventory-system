# SEO Launch Checklist — nigdstock.com

Use after deploying the static `out/` folder to **https://nigdstock.com/**.

## Built-in technical SEO (verify on production)

- [ ] Homepage title: `Nigd Stock | AI-Powered Best Inventory Management System in Ethiopia`
- [ ] Homepage H1: `AI-Powered Best Inventory Management System in Ethiopia`
- [ ] Canonical + hreflang (`en`, `am`, `x-default`) on home and `/am/`
- [ ] Open Graph image: `https://nigdstock.com/images/og-image.png` (1200×630)
- [ ] `robots.txt` allows `/` and lists sitemap
- [ ] `sitemap.xml` lists only public marketing URLs
- [ ] JSON-LD: Organization, ProfessionalService, WebSite, SoftwareApplication, FAQPage, WebPage, ContactPage, CollectionPage, BlogPosting, BreadcrumbList
- [ ] SoftwareApplication has **no fake price Offer**
- [ ] Store buttons appear only when real Play/App listing URLs are set in env
- [ ] 404 is `noindex` and Apache serves `/404.html` via `.htaccess`
- [ ] FAQ answers are in HTML (`<details>`), not `hidden` panels

## Post-deploy (hosting / Search Console)

1. Upload `out/` to the domain document root (include `.htaccess`).
2. Confirm HTTPS works end-to-end.
3. Google Search Console → verify → submit `https://nigdstock.com/sitemap.xml`.
4. Paste GSC/Bing HTML tokens into env → rebuild → redeploy.
5. Rich Results Test on homepage + one FAQ + one article.
6. Claim Google Business Profile with the same phone/address as the site.
7. When real store listings exist, set:
   - `NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=…`
   - `NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/…/app/…`
   then rebuild so store CTAs and schema platforms update.

## Verified business facts

- Product: Nigd Stock
- Company: Abyssinia Software Technology PLC
- Office: Megenagna City Mall, 8th Floor, Addis Ababa, Ethiopia
- Phone: +251 951 050 364
- Email: abyssiniasoftwaretechnologyplc@gmail.com
- Website: https://nigdstock.com/
- Web app: https://system.nigdstock.com
