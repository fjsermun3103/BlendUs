#!/bin/sh
# Startup for the production image (Dockerfile) on Render. The database is external (Neon),
# so migrations and seeding only do work on the very first boot.
set -e

: "${APP_KEY:?APP_KEY is not set. Add it in the Render dashboard (see DEPLOY-FREE.md).}"
: "${DB_URL:?DB_URL is not set. Add your Neon connection string in the Render dashboard.}"

echo '>>> Caching config and routes...'
php artisan config:cache
php artisan route:cache

echo '>>> Running migrations...'
php artisan migrate --force

# DatabaseSeeder skips itself when users already exist, so this only seeds the first boot
echo '>>> Seeding demo data (first boot only)...'
php artisan db:seed --force

echo '>>> Starting server...'
# Render sets PORT. The built-in server is fine for a demo; PHP_CLI_SERVER_WORKERS only works with --no-reload
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}" --no-reload
