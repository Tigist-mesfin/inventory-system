# Inventory Mobile (Flutter)

Offline-first Flutter client for the existing Inventory Management System backend.

## API base URL (secure config)

The API URL is **not hardcoded in Dart source**. It is loaded from:

1. **`mobile/.env`** (gitignored — copy from `.env.example`)
2. **Flutter secure storage** (seeded on first launch, holds tokens + API URL)
3. Optional build override: `--dart-define=API_BASE_URL=...`

### Setup

```bash
cd mobile
cp .env.example .env
```

Default production URL in `.env.example`:

```env
API_BASE_URL=https://inventory-api.fortinoacademics.com
ALLOW_URL_OVERRIDE=false
```

Set `ALLOW_URL_OVERRIDE=true` only for local backend testing (shows Server URL on login).

### Local backend (optional)

```env
API_BASE_URL=http://10.0.2.2:3000
ALLOW_URL_OVERRIDE=true
```

## Run

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

## Backend migration (offline sync)

From repo root:

```bash
npm run migrate
```

## Architecture

See `lib/` — Provider modules, Drift SQLite, SyncManager, Dio client.

Production API: [https://inventory-api.fortinoacademics.com](https://inventory-api.fortinoacademics.com)
