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

# PHP Konfiguration
RUN { \
        echo "log_errors = On"; \
        echo "error_log = /var/log/php_errors.log"; \
        echo "display_errors = On"; \
        echo "display_startup_errors = On"; \
        echo "error_reporting = E_ALL"; \
    } > /usr/local/etc/php/conf.d/error-logging.ini

# Apache-Konfiguration: AllowOverride für .htaccess aktivieren
RUN echo '<Directory /var/www/html/>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/docker-php.conf \
    && a2enconf docker-php

# Apache Logging in Dateien konfigurieren (nicht stdout/stderr)
RUN sed -i 's#ErrorLog /proc/self/fd/2#ErrorLog /var/log/apache2/error.log#g' /etc/apache2/apache2.conf \
    && sed -i 's#CustomLog /proc/self/fd/1#CustomLog /var/log/apache2/access.log#g' /etc/apache2/sites-available/000-default.conf \
    && sed -i 's#ErrorLog /proc/self/fd/2#ErrorLog /var/log/apache2/error.log#g' /etc/apache2/sites-available/000-default.conf

# Log-Verzeichnisse erstellen und Berechtigungen setzen
RUN mkdir -p /var/log/apache2 \
    && touch /var/log/php_errors.log \
    && chown -R www-data:www-data /var/log/apache2 /var/log/php_errors.log \
    && chmod 644 /var/log/php_errors.log

# Arbeitsverzeichnis setzen
WORKDIR /var/www/html

# Projektdateien kopieren
COPY public/ /var/www/html/
COPY api/ /var/www/html/api/
COPY data/ /var/www/html/data/

# tours.json initial erstellen falls nicht vorhanden
RUN if [ ! -f /var/www/html/data/tours.json ]; then \
        echo "[]" > /var/www/html/data/tours.json; \
    fi

# Berechtigungen setzen
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/data \
    && chmod 666 /var/www/html/data/tours.json

# Port 80 freigeben
EXPOSE 80

# Apache im Vordergrund starten
CMD ["apache2-foreground"]
