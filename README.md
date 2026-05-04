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
npm run start:node22
```

Create the Laravel application in `backend/` or install dependencies from `backend/composer.json`, then run migrations.

The local Homebrew `node@22` install is preferred for Expo. The app starts on port `8082` because `8081` may already be used by another Expo project.

Run the backend API:

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```
