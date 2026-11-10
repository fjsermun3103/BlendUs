#!/bin/sh
# Startup for the production container (docker-compose.prod.yml).
set -e

if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is not set. Generate one with: docker run --rm php:8.2-cli php -r \"echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;\"" >&2
  exit 1
fi

echo '>>> Caching config and routes...'
php artisan config:cache
php artisan route:cache

echo '>>> Running migrations...'
php artisan migrate --force

# DatabaseSeeder skips itself when users already exist, so this only seeds the first boot
echo '>>> Seeding demo data (first boot only)...'
php artisan db:seed --force

php artisan storage:link --force

echo '>>> Starting server...'
# The built-in server is fine for a demo; PHP_CLI_SERVER_WORKERS only works with --no-reload
exec php artisan serve --host=0.0.0.0 --port=8000 --no-reload
