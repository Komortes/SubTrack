# SubTrack

A mobile app for tracking subscriptions — with spending analytics, renewal reminders, offline-first local state, and optional cloud sync.

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | Expo (React Native), Expo Router, NativeWind, Zustand |
| Backend | Laravel 11, Sanctum auth, SQLite / Postgres, Redis |
| Push | Expo Push Notifications |
| In-app purchases | RevenueCat |
| Auth | Email/password + Google Sign-In |
| Deploy | Fly.io (Docker) |

## Features

- Track subscriptions with name, price, billing cycle, and renewal date
- Home dashboard with upcoming renewals
- Spending stats by category and time period
- Push notification reminders before renewal
- Offline-first: works without internet, syncs when back online
- Google Sign-In and email/password auth
- Lock screen with biometric authentication
- Pro tier via RevenueCat in-app purchases

## Project Structure

```
SubTrack/
├── mobile/     # Expo React Native app
└── backend/    # Laravel API
```

## Setup

### Mobile

```sh
cd mobile
cp .env.example .env   # fill in your keys
npm install
npm run start:node22   # iOS Simulator (requires Node 22 via Homebrew)
```

For a physical device over LAN:

```sh
cp .env.device.example .env   # set EXPO_PUBLIC_API_URL to your Mac's LAN IP
npm run start:device
```

Environment variables (`mobile/.env`):

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat iOS API key |

### Backend

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

For LAN access from a physical device:

```sh
php artisan serve --host=0.0.0.0 --port=8000
```

### Deploy (Fly.io)

See [`backend/DEPLOY.md`](backend/DEPLOY.md).

## License

MIT
