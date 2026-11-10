#!/bin/sh
# Startup for the Hugging Face Space image (deploy/hf-space/Dockerfile): Ollama and Laravel in one container.
# The database is external (Neon), so migrations and seeding only do work on the very first boot.
set -e

: "${APP_KEY:?APP_KEY is not set. Add it as a secret in the Space settings (see DEPLOY-FREE.md).}"
: "${DB_URL:?DB_URL is not set. Add your Neon connection string as a secret in the Space settings.}"

echo '>>> Starting Ollama...'
ollama serve > /tmp/ollama.log 2>&1 &
until ollama list > /dev/null 2>&1; do sleep 1; done

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
exec php artisan serve --host=0.0.0.0 --port="${PORT:-7860}" --no-reload
