# Multi-stage Dockerfile für virtuelle Stadtführungen
FROM php:8.2-apache AS production

# Metadata
LABEL maintainer="Virtual City Tours"
LABEL description="Mobile Web-App für virtuelle Stadtführungen mit Geolokation"

# System-Pakete aktualisieren
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Apache mod_rewrite aktivieren
RUN a2enmod rewrite

# Apache-Konfiguration
RUN echo '<Directory /var/www/html/>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/docker-php.conf \
    && a2enconf docker-php

# Arbeitsverzeichnis setzen
WORKDIR /var/www/html

# Projektdateien kopieren
COPY public/ /var/www/html/
COPY api/ /var/www/html/api/
COPY data/ /var/www/html/data/

# Berechtigungen setzen
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/data

# Port 80 freigeben
EXPOSE 80

# Apache im Vordergrund starten
CMD ["apache2-foreground"]
