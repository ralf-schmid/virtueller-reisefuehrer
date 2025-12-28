# 🚀 Deployment-Anleitung

## Problem: PHP-Dateien werden als Text ausgegeben

Wenn Sie PHP-Quellcode statt JSON-Responses sehen, liegt ein PHP-Handler-Problem vor.

## ✅ Lösung: Container neu bauen

### Schritt 1: Container stoppen und entfernen

```bash
docker-compose down
docker system prune -f  # Optional: Aufräumen
```

### Schritt 2: Image komplett neu bauen (OHNE Cache!)

```bash
# WICHTIG: --no-cache Flag verwenden!
docker-compose build --no-cache

# Oder mit Docker direkt:
docker build --no-cache -t virtuelle-stadtfuehrungen .
```

### Schritt 3: Container starten

```bash
docker-compose up -d

# Warten bis Container vollständig gestartet ist
sleep 10
```

### Schritt 4: PHP-Funktionalität testen

```bash
# Test 1: Einfacher JSON-Test
curl https://stadtrundgang.ralf-schmid.de/api/test-json.php

# Erwartete Ausgabe:
# {"status":"ok","message":"PHP works!","timestamp":1234567890,"php_version":"8.2.x"}

# Test 2: Tours API
curl https://stadtrundgang.ralf-schmid.de/api/tours.php

# Erwartete Ausgabe:
# [] (leeres Array) oder JSON mit Touren

# Test 3: PHPInfo (Optional - danach löschen!)
curl https://stadtrundgang.ralf-schmid.de/phpinfo.php
```

### Schritt 5: Logs prüfen

```bash
# Apache Error Log
docker exec virtuelle-stadtfuehrungen tail -n 50 /var/log/apache2/error.log

# PHP Error Log
docker exec virtuelle-stadtfuehrungen tail -n 50 /var/log/php_errors.log

# Alle Logs live
docker exec virtuelle-stadtfuehrungen tail -f /var/log/apache2/error.log /var/log/php_errors.log
```

## 🔍 Troubleshooting

### Problem: "Permanent Redirect"

Dies deutet auf ein Reverse-Proxy-Problem hin (nicht Docker).

**Lösung:**
- Prüfen Sie Ihre nginx/Reverse-Proxy-Konfiguration
- Stellen Sie sicher, dass die PHP-Requests korrekt weitergeleitet werden

### Problem: Immer noch PHP-Quellcode sichtbar

**Checkliste:**
1. ✅ Container wurde mit `--no-cache` neu gebaut
2. ✅ Alte Container wurden mit `docker-compose down` entfernt
3. ✅ `.htaccess` Dateien sind im Image (prüfen: `docker exec container ls -la /var/www/html/api/`)
4. ✅ Apache läuft (prüfen: `docker exec container ps aux | grep apache`)

**Debug:**
```bash
# Prüfen ob PHP-Modul geladen ist
docker exec virtuelle-stadtfuehrungen apache2ctl -M | grep php

# Erwartete Ausgabe:
# php_module (shared)

# Prüfen ob .htaccess existiert
docker exec virtuelle-stadtfuehrungen cat /var/www/html/api/.htaccess

# Apache-Konfiguration testen
docker exec virtuelle-stadtfuehrungen apache2ctl -t
```

### Problem: 500 Internal Server Error

**Logs prüfen:**
```bash
docker logs virtuelle-stadtfuehrungen --tail 100
docker exec virtuelle-stadtfuehrungen tail -50 /var/log/apache2/error.log
```

### Problem: tours.json kann nicht geschrieben werden

**Berechtigungen prüfen:**
```bash
# Im Container
docker exec virtuelle-stadtfuehrungen ls -la /var/www/html/data/

# Sollte sein:
# drwxrwxrwx ... data/
# -rw-rw-rw- ... tours.json

# Falls falsch, korrigieren:
docker exec virtuelle-stadtfuehrungen chmod 777 /var/www/html/data/
docker exec virtuelle-stadtfuehrungen chmod 666 /var/www/html/data/tours.json

# Oder tours.json neu erstellen:
docker exec virtuelle-stadtfuehrungen sh -c 'echo "[]" > /var/www/html/data/tours.json'
docker exec virtuelle-stadtfuehrungen chmod 666 /var/www/html/data/tours.json
```

## 📋 Produktions-Deployment

### Mit Docker Compose

```bash
# 1. Repository klonen
git clone https://github.com/ralf-schmid/virtueller-reisefuehrer.git
cd virtueller-reisefuehrer

# 2. S3-Volume konfigurieren (siehe S3-SETUP.md)

# 3. Image bauen
docker-compose -f docker-compose.s3.yml build --no-cache

# 4. Container starten
docker-compose -f docker-compose.s3.yml up -d

# 5. Logs beobachten
docker-compose -f docker-compose.s3.yml logs -f
```

### Mit Docker (ohne Compose)

```bash
# 1. Image bauen
docker build --no-cache -t virtuelle-stadtfuehrungen .

# 2. Container starten
docker run -d \
  --name virtuelle-stadtfuehrungen \
  -p 8080:80 \
  -v /pfad/zu/s3-mount:/var/www/html/data \
  --restart unless-stopped \
  virtuelle-stadtfuehrungen

# 3. Status prüfen
docker ps
docker logs virtuelle-stadtfuehrungen
```

## 🔄 Updates deployen

```bash
# 1. Neuesten Code holen
git pull origin main

# 2. Container stoppen
docker-compose down

# 3. Neu bauen (MIT --no-cache!)
docker-compose build --no-cache

# 4. Neu starten
docker-compose up -d

# 5. Testen
curl https://ihre-domain.de/api/test-json.php
```

## ⚡ Performance-Optimierung

### Für Produktion

```yaml
# docker-compose.yml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### Apache-Tuning

Erstellen Sie `public/.htaccess` mit:
```apache
# Gzip-Kompression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/json
</IfModule>

# Browser-Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

## 🛡️ Sicherheit

### Produktions-Checkliste

- [ ] `phpinfo.php` löschen oder schützen
- [ ] Display errors deaktiviert (ist bereits in Dockerfile)
- [ ] HTTPS aktiviert (Reverse Proxy)
- [ ] Rate Limiting für API (Reverse Proxy)
- [ ] Backup für `data/tours.json` eingerichtet
- [ ] Monitoring aktiviert
- [ ] Log-Rotation konfiguriert

### Log-Rotation

```bash
# /etc/logrotate.d/virtueller-reisefuehrer
/var/log/apache2/*.log /var/log/php_errors.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker exec virtuelle-stadtfuehrungen apache2ctl graceful > /dev/null
    endscript
}
```

## 📞 Support

Bei Problemen:
1. Logs prüfen (siehe oben)
2. GitHub Issues: https://github.com/ralf-schmid/virtueller-reisefuehrer/issues
3. README.md und S3-SETUP.md konsultieren
