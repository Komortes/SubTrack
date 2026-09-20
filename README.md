# SubTrack

A mobile app for tracking subscriptions, upcoming renewals, and spending. Subscription changes are saved locally and queued for optional account sync. Recording a payment updates its history and next renewal date; it does not charge a payment method.

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81, React 19, TypeScript, Expo Router |
| UI and state | NativeWind, Reanimated, Zustand, AsyncStorage |
| Backend | Laravel 12, Sanctum bearer tokens, SQLite / PostgreSQL |
| Background jobs | Laravel queues and scheduler; Redis in the deployment configuration |
| Push | Expo Push Notifications |
| In-app purchases | RevenueCat |
| Auth | Email/password + Google Sign-In |
| Deploy | Fly.io (Docker) |

## Features

- Weekly, monthly, yearly, and custom billing periods; trials, paused subscriptions, and archives.
- Dashboard with monthly estimates, overdue renewals, and a payment calendar.
- Search, independent status/category filters, currency-aware sorting, and date grouping.
- Category breakdowns and recorded payment history converted to the selected currency.
- Local renewal reminders in offline mode and server push reminders for signed-in use.
- Durable offline queue, replay-safe creation and renewal, and account-isolated local data.
- Email/password and Google sign-in, biometric lock with device passcode fallback, and an app-switcher privacy cover.
- Light/dark themes, localized UI, JSON import/export, and an iOS widget target.
- Free tier of five non-archived subscriptions; RevenueCat `pro` entitlement for additional subscriptions.

## Project Structure

```
SubTrack/
├── mobile/
│   ├── app/             # Expo Router screens
│   ├── components/      # Shared UI
│   ├── lib/             # API, offline queue, dates, notifications
│   ├── store/           # Auth, subscriptions, settings, currencies, Pro
│   ├── tests/           # Node regression tests with native/network mocks
│   └── targets/widget/  # Swift iOS widget
├── backend/             # Laravel API, migrations, jobs, and PHPUnit tests
└── docs/                # Review notes and supporting documentation
```

## Requirements

- Node.js **22.x** and npm; `mobile/package.json` requires `>=22 <23`.
- PHP **8.3+**, Composer, and the PHP extensions required by Laravel and the selected database. The local setup below uses SQLite; PHPUnit also uses in-memory SQLite.
- Xcode and an iOS Simulator on macOS, or Android Studio and an emulator, for native development. A physical device can connect over LAN.
- PostgreSQL, Redis, and the PHP Redis extension (`phpredis`) when using the backend's unchanged `.env.example` or Fly.io configuration.

## Quick Start

Run the API and mobile development server in separate terminals. For a UI-only preview, the app can also be used offline without the API or external service keys.

### 1. Backend

```sh
cd backend
composer install
cp .env.example .env
```

The example environment targets PostgreSQL and Redis. To start locally without those services, change these values in `backend/.env` first, replacing the database path with your actual absolute path:

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/SubTrack/backend/database/database.sqlite
CACHE_STORE=file
QUEUE_CONNECTION=database
SESSION_DRIVER=file
```

Then, from `backend/`:

```sh
touch database/database.sqlite
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

To keep PostgreSQL/Redis instead, create the configured database and credentials, start both services, and configure `DB_*` and `REDIS_*` in `.env` before migrating. Use `SESSION_DRIVER=file` locally unless a session store has been provisioned; the repository does not include a `sessions` table migration.

Server reminders also need both processes running in separate terminals from `backend/`:

```sh
php artisan queue:work --tries=3 --timeout=90
```

```sh
php artisan schedule:work
```

### 2. Mobile

With Node 22 active:

```sh
cd mobile
cp .env.example .env
npm ci
npm start -- --localhost --port 8082
```

Use `i` or `a` in the Expo terminal to open an available simulator/emulator. You can also run `npm run ios`, `npm run android`, or `npm run web`.

The `start:node22`, `start:node22:clear`, `ios:node22`, and `start:device` shortcuts set `/opt/homebrew/opt/node@22/bin` on `PATH`; these are conveniences for Apple Silicon Homebrew installations. Other environments should activate Node 22 through their usual version manager and use the standard commands above.

Set `EXPO_PUBLIC_API_URL` to the API address visible from the target:

| Target | Example API URL |
|---|---|
| iOS Simulator or browser on the development machine | `http://127.0.0.1:8000/api` |
| Android Emulator | `http://10.0.2.2:8000/api` |
| Physical device on the same LAN | `http://<development-machine-LAN-IP>:8000/api` |

For a physical device, use `mobile/.env.device.example` as a template and replace its sample IP. Run the backend with `php artisan serve --host=0.0.0.0 --port=8000` and Expo with `npm start -- --lan --port 8082`. Restart Expo after editing `.env`.

### 3. Optional integrations

Mobile variables in `mobile/.env`:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL, including `/api` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public SDK key for iOS |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat public SDK key for Android |

Backend integration variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_IDS` | Comma-separated OAuth client IDs accepted as Google ID-token audiences |
| `GOOGLE_CLIENT_ID` | Single-client fallback when `GOOGLE_CLIENT_IDS` is not set |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Exact Authorization header value configured for the RevenueCat webhook |

If using the single Google client variable, remove the empty `GOOGLE_CLIENT_IDS` entry from `.env` so the fallback applies.

Configure RevenueCat's `pro` entitlement and current offering. The app uses the backend user ID as the signed-in RevenueCat app user ID. Send RevenueCat webhook events to `POST /api/webhooks/revenuecat`; without a matching `REVENUECAT_WEBHOOK_AUTHORIZATION`, the backend rejects them with `401`. Apply all migrations so the server can enforce the free tier and store Pro entitlement fields.

Values prefixed with `EXPO_PUBLIC_` are embedded in the client bundle. Use public SDK keys there; keep webhook secrets and private credentials in the backend environment.

For native builds, replace `expo.extra.eas.projectId` in `mobile/app.json` with the real project ID and configure `expo.ios.appleTeamId`, signing, push credentials, and the widget's `group.app.subtrack.mobile` app group for your Apple team. Real purchases, push delivery, and widget behavior require testing in a configured native build.

## Sync and Data Behavior

- Edits enter the local queue before background sync starts. In signed-in mode, opening the relevant screens or saving changes attempts sync; the Home refresh/retry actions can retry pending work. Offline mode keeps changes on the device until account sync is available.
- Creating a subscription with the same UUID is idempotent. Renewal requests carry a stable `payment_id` UUID so a lost response can be retried without recording a second payment. Deploy the API and mobile changes together to retain this behavior.
- A resource-specific `402`, `404`, or `422` retains that resource's pending operations while independent changes can progress. Authentication, network, and server failures stop the flush. Pending data is not replaced by an older server response.
- The first sign-in can upload unowned guest data. Changing accounts clears the previous account's local data before activating the new session; logout clears local data and its pending queue.
- Monthly estimates use active, non-archived subscriptions. Payment charts use recorded payments, not projected spending. `/analytics/monthly` provides `totals_by_currency` for client-side conversion; its legacy `total` and `/analytics/summary` must not be treated as a converted mixed-currency total.
- Currency conversion uses cached rates, with bundled fallback values when rates have not been fetched. These are estimates, not historical settlement rates.

## Checks

From `mobile/`, with Node 22:

```sh
npm run lint
npm run typecheck
npm test
npx expo export --platform ios --platform android --output-dir dist
```

From `backend/`:

```sh
php artisan test
vendor/bin/pint --test
```

The mobile suite exercises dates, currency history, API payloads, offline queue retries, store races, and account isolation using mocked native/storage/network boundaries. Backend tests use in-memory SQLite and mocked external services. Expo export validates JavaScript and assets; it does not produce a signed Xcode/Gradle application.

The [September 2026 review report](docs/review-2026-09-20.md) records the verified test counts, manual UI checks, dependency audit findings, and remaining validation work.

## Current Limitations

- Web is an offline UI preview. Native SecureStore is unavailable there, so authenticated sync, biometrics, native notifications, and purchases are not covered by the web preview.
- The repository still needs project-specific EAS, Apple signing, Google OAuth, push, and RevenueCat configuration for a full release.
- The September review removed the critical npm audit findings through compatible updates. Remaining high/moderate findings and the Expo SDK migration are tracked in the review report; production purchases and push delivery have not been verified by those local checks.

## Deployment

See [backend deployment instructions](backend/DEPLOY.md) and the checked-in `backend/fly.toml`. The API, worker, and scheduler are separate processes; the release command runs migrations. Set the backend integration secrets above in the deployment environment, including the RevenueCat webhook authorization value.

## License

MIT
