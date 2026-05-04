# SubTrack

Mobile subscription tracker with reminders, spending analytics, offline-first local state, and optional account sync.

## Structure

- `mobile/` - Expo React Native app with Expo Router, NativeWind, Zustand, AsyncStorage, SecureStore, and Expo notifications.
- `backend/` - Laravel API skeleton for Sanctum auth, subscriptions, analytics, push tokens, queues, and scheduler jobs.

## MVP

- Onboarding
- Auth screens and offline mode
- Home, Subscriptions, Stats, Settings tabs
- Subscription CRUD foundation
- Local mock data and offline queue placeholders
- Laravel API/service/job/migration skeletons

## Next Setup Steps

Install mobile dependencies from `mobile/package.json`, then run Expo:

```sh
cd mobile
npm install
npm run start
```

Create the Laravel application in `backend/` or install dependencies from `backend/composer.json`, then run migrations.

