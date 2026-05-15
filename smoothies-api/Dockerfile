FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    git \
    curl

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql

# Copy custom PHP configuration
COPY php.ini /usr/local/etc/php/conf.d/custom.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files and install dependencies during BUILD
# This ensures vendor/ is always available in the image
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-scripts --prefer-dist

# Copy the rest of the application
COPY . .

# Run post-install scripts now that full app is present
RUN composer run-script post-autoload-dump 2>/dev/null || true

# Expose port 8000
EXPOSE 8000

# Start Laravel server (migrations run at container start via docker-compose command)
CMD php artisan serve --host=0.0.0.0 --port=8000
