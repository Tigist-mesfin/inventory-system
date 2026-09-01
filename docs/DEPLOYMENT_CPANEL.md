# cPanel deployment — fix “Access token not found”

## Why login works but everything else fails

Login returns the **user in the JSON body**, so the UI can look logged in.  
All other pages call `/api/...` using an **httpOnly cookie** named `accessToken`.

If that cookie is **not saved** or **not sent** on the next request, you get:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token not found"
  }
}
```

This is almost always a **cookie + CORS** configuration issue on production, not a wrong password.

---

## Step 1 — Confirm in browser DevTools

1. Open **Network** tab.
2. Log in → click the `login` request.
3. Check **Response headers** for:
   - `Set-Cookie: accessToken=...`
   - `Set-Cookie: refreshToken=...`
4. Open **Application → Cookies**.
5. After login, cookies should exist for your **API host** (e.g. `inventory-api.fortinoacademics.com`).

| What you see | Meaning |
| --- | --- |
| No `Set-Cookie` on login | API/proxy not setting cookies — check server env & HTTPS |
| Cookies exist but next `/api` request has no `Cookie` header | Cross-site cookie blocked or wrong `VITE_API_URL` |
| `Cookie` sent but still 401 | Token invalid/expired — check `JWT_*_SECRET` on server |

---

## Step 2 — Choose your deployment layout

### Option A (recommended): Same domain — API + UI together

Node serves `client/dist` and `/api` on **one URL**, e.g. `https://yourshop.com`.

**Frontend build (`client/.env.production`):**

```env
VITE_API_URL=
VITE_APP_URL=https://yourshop.com
```

**Server `.env` on cPanel:**

```env
NODE_ENV=production
PORT=3000
APP_URL=https://yourshop.com
FRONTEND_URL=https://yourshop.com
ALLOWED_ORIGINS=https://yourshop.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

Rebuild and redeploy:

```bash
cd client && npm run build
# upload / restart Node app so client/dist is served
```

---

### Option B: Split — UI on one domain, API on subdomain

Example:

- Frontend: `https://inventory.fortinoacademics.com`
- API: `https://inventory-api.fortinoacademics.com`

**Frontend build (`client/.env.production`):**

```env
VITE_API_URL=https://inventory-api.fortinoacademics.com
VITE_APP_URL=https://inventory.fortinoacademics.com
```

**Server `.env` on API host (required):**

```env
NODE_ENV=production
APP_URL=https://inventory-api.fortinoacademics.com
FRONTEND_URL=https://inventory.fortinoacademics.com
ALLOWED_ORIGINS=https://inventory.fortinoacademics.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

Important:

- Both sites must use **HTTPS** (`COOKIE_SECURE=true` in production).
- `ALLOWED_ORIGINS` must be the **exact** frontend URL — not `*`.
- `FRONTEND_URL` must match the site where users open the app.
- Rebuild the React app after changing `VITE_API_URL`, then re-upload `client/dist`.

If frontend and API are on **completely different domains** (e.g. `myshop.com` + `inventory-api.fortinoacademics.com`), modern browsers may **block third-party cookies**. Use **Option A** (same domain + reverse proxy) instead.

---

## Step 3 — cPanel Node.js app checklist

1. **Environment variables** in cPanel Node app match the `.env` above (especially `FRONTEND_URL`, `ALLOWED_ORIGINS`, `JWT_*_SECRET`).
2. **HTTPS** enabled on both frontend and API (Let's Encrypt).
3. **Restart** the Node application after env changes.
4. **Do not** serve an old `client/dist` built with wrong `VITE_API_URL`.
5. If using LiteSpeed/Apache proxy to Node, ensure it does **not strip** `Set-Cookie` headers.

---

## Step 4 — Quick env template (copy to server)

```env
NODE_ENV=production
PORT=3000
APP_URL=https://inventory-api.fortinoacademics.com
FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN-HERE
ALLOWED_ORIGINS=https://YOUR-FRONTEND-DOMAIN-HERE
COOKIE_SECURE=true
COOKIE_SAMESITE=none

JWT_ACCESS_SECRET=use-a-long-random-string
JWT_REFRESH_SECRET=use-another-long-random-string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
```

Replace `YOUR-FRONTEND-DOMAIN-HERE` with the real URL users open in the browser.

---

## Common mistakes

| Mistake | Result |
| --- | --- |
| `ALLOWED_ORIGINS=*` in production | Browser may not send cookies with credentialed requests |
| `FRONTEND_URL` not set / wrong domain | CORS blocks or cookies misconfigured |
| HTTP site with `COOKIE_SECURE=true` | Cookies never stored |
| Built UI with empty `VITE_API_URL` but API on another host | Login hits wrong server |
| Changed server `.env` but did not restart Node | Old CORS/cookie settings still active |

---

## Still stuck?

Send your deployer:

1. Frontend URL (browser address bar)
2. API URL (`VITE_API_URL` or same as frontend)
3. Screenshot of login response headers (`Set-Cookie` yes/no)
4. Screenshot of failing request headers (`Cookie` yes/no)
