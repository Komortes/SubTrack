FROM serversideup/php:8.3-fpm-nginx-alpine

WORKDIR /var/www/html

COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

COPY --chown=www-data:www-data . .

RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi \
    && php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear

EXPOSE 8080
