# Production image of the BlendUs API for Render (free plan). See DEPLOY-FREE.md.
# Development uses Dockerfile.dev (docker-compose.yml), which mounts the code instead of copying it.
#
# The free hosting has no room for the AI models, so this image runs with AI_ENABLED=false
# and keeps uploaded images in the database (IMAGES_IN_DATABASE=true).
FROM php:8.2-cli

RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev unzip git curl \
    && docker-php-ext-install pdo pdo_pgsql opcache \
    && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/conf.d/custom.ini
# Code never changes inside a running container, so OPcache can skip file timestamp checks
RUN printf "opcache.enable=1\nopcache.validate_timestamps=0\nopcache.memory_consumption=64\n" \
      > /usr/local/etc/php/conf.d/opcache-prod.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
# Dev dependencies ARE installed: the demo seeders use fakerphp/faker, which is in require-dev
RUN composer install --no-interaction --no-scripts --prefer-dist --no-progress

COPY . .
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi \
    && chmod +x docker/start-prod.sh

# Non-secret settings. Secrets (APP_KEY, DB_URL) and URLs are set in the Render dashboard.
ENV APP_NAME=BlendUs \
    APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning \
    DB_CONNECTION=pgsql \
    DB_SSLMODE=require \
    CACHE_STORE=file \
    SESSION_DRIVER=array \
    QUEUE_CONNECTION=sync \
    AI_ENABLED=false \
    IMAGES_IN_DATABASE=true \
    TRUSTED_PROXIES=* \
    PHP_CLI_SERVER_WORKERS=3

CMD ["./docker/start-prod.sh"]
