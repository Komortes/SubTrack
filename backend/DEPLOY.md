# SubTrack API Deploy

## Fly.io

1. Create the app and attach Postgres/Redis.
   ```bash
   fly apps create subtrack-api
   fly postgres create --name subtrack-db --region fra
   fly postgres attach --app subtrack-api subtrack-db
   fly redis create --name subtrack-redis --region fra
   ```

2. Set secrets.
   ```bash
   fly secrets set APP_KEY=base64:...
   fly secrets set APP_URL=https://subtrack-api.fly.dev
   fly secrets set GOOGLE_CLIENT_IDS=...
   fly secrets set REDIS_URL=...
   ```

3. Deploy from `backend/`.
   ```bash
   fly deploy
   fly scale count app=1 worker=1 scheduler=1
   ```

The release command runs migrations. The scheduler process runs Laravel Scheduler continuously; the worker handles queued push jobs.
