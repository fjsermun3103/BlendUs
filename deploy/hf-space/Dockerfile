# BlendUs API for a free Hugging Face Space (Docker SDK): Laravel + Ollama in a single container.
# The database lives in Neon and the frontend in Vercel. See DEPLOY-FREE.md.
#
# This file and README.md go to the root of the Space. The API code is cloned from GitHub at build
# time, so the Space only holds these two files. To deploy new commits: Space settings -> Factory rebuild.
#
# Local test with your working copy instead of GitHub:
#   docker build -f deploy/hf-space/Dockerfile --build-context code=./smoothies-api -t blendus-hf deploy/hf-space

ARG REPO=https://github.com/fjsermun3103/BlendUs.git
ARG BRANCH=main

FROM alpine/git:latest AS clone
ARG REPO
ARG BRANCH
RUN git clone --depth 1 --branch "$BRANCH" "$REPO" /repo

# The API code (smoothies-api/) at the root of this stage
FROM scratch AS code
COPY --from=clone /repo/smoothies-api /

FROM ollama/ollama:latest AS ollama

FROM php:8.2-cli

RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev unzip git curl ca-certificates \
    && docker-php-ext-install pdo pdo_pgsql opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ollama /usr/bin/ollama /usr/bin/ollama
COPY --from=ollama /usr/lib/ollama /usr/lib/ollama
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN printf "opcache.enable=1\nopcache.validate_timestamps=0\nopcache.memory_consumption=128\n" \
      > /usr/local/etc/php/conf.d/opcache-prod.ini

# Spaces run the container as UID 1000
RUN useradd -m -u 1000 user && mkdir -p /var/www/html && chown user:user /var/www/html
USER user
ENV HOME=/home/user \
    OLLAMA_MODELS=/home/user/.ollama/models \
    OLLAMA_HOST=http://127.0.0.1:11434 \
    OLLAMA_KEEP_ALIVE=24h

# Models are baked into the image (~1.6 GB): the Space disk is wiped on every restart.
# This layer comes before the code, so it stays cached between code changes.
RUN (ollama serve > /tmp/ollama.log 2>&1 &) \
    && until ollama list > /dev/null 2>&1; do sleep 1; done \
    && ollama pull nomic-embed-text \
    && ollama pull llama3.2:1b

WORKDIR /var/www/html

COPY --from=code --chown=user:user /php.ini /usr/local/etc/php/conf.d/custom.ini
COPY --from=code --chown=user:user /composer.json /composer.lock ./
# Dev dependencies ARE installed: the demo seeders use fakerphp/faker, which is in require-dev
RUN composer install --no-interaction --no-scripts --prefer-dist --no-progress

COPY --from=code --chown=user:user / ./
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi \
    && rm -rf .env public/storage \
    && chmod +x docker/start-hf.sh

# Non-secret settings. Secrets (APP_KEY, DB_URL, ...) are set in the Space settings.
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
    FILESYSTEM_DISK=public \
    OLLAMA_URL=http://127.0.0.1:11434 \
    OLLAMA_EMBEDDING_MODEL=nomic-embed-text \
    TRUSTED_PROXIES=* \
    PHP_CLI_SERVER_WORKERS=4 \
    PORT=7860

EXPOSE 7860

CMD ["./docker/start-hf.sh"]
