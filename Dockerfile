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

# PHP Error Logging konfigurieren
RUN echo "log_errors = On" >> /usr/local/etc/php/conf.d/error-logging.ini \
    && echo "error_log = /var/log/php_errors.log" >> /usr/local/etc/php/conf.d/error-logging.ini \
    && echo "display_errors = Off" >> /usr/local/etc/php/conf.d/error-logging.ini \
    && echo "display_startup_errors = Off" >> /usr/local/etc/php/conf.d/error-logging.ini

# Apache-Konfiguration
RUN echo '<Directory /var/www/html/>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/docker-php.conf \
    && a2enconf docker-php

# PHP Handler für Apache konfigurieren
RUN a2enmod php8.2 || echo "PHP module already enabled" \
    && echo "<FilesMatch \\.php$>\n    SetHandler application/x-httpd-php\n</FilesMatch>" > /etc/apache2/conf-available/php-handler.conf \
    && a2enconf php-handler

# VirtualHost für korrekte PHP-Verarbeitung konfigurieren
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    DirectoryIndex index.html index.php\n\
    \n\
    <Directory /var/www/html>\n\
        Options -Indexes +FollowSymLinks\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    \n\
    <FilesMatch \\.php$>\n\
        SetHandler application/x-httpd-php\n\
    </FilesMatch>\n\
    \n\
    ErrorLog /var/log/apache2/error.log\n\
    CustomLog /var/log/apache2/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Apache Logging in Dateien konfigurieren (nicht stdout/stderr)
RUN sed -i 's#ErrorLog.*#ErrorLog /var/log/apache2/error.log#g' /etc/apache2/apache2.conf

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

# Berechtigungen setzen
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/data

# Port 80 freigeben
EXPOSE 80

# Apache im Vordergrund starten
CMD ["apache2-foreground"]
