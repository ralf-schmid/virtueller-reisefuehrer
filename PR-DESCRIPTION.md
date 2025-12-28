# Pull Request: S3-Integration, Debugging-Tools und Beispiel-Touren

## 📦 Zusammenfassung

Dieser PR fügt vollständige S3-Integration, umfangreiches Debugging und Beispiel-Touren hinzu.

## ✨ Neue Features

### 1. S3-Integration für persistente Speicherung
- ✅ Docker-Compose-Konfiguration für S3 (`docker-compose.s3.yml`)
- ✅ Umfassende S3-Setup-Dokumentation (`S3-SETUP.md`)
- ✅ Environment-Beispieldatei (`.env.s3.example`)
- ✅ Bereinigt: Keine lokalen Mount-Scripts (wird über Docker-Verwaltung gehandhabt)

### 2. Debugging & Error Logging
- ✅ API-Test-Script (`api/test.php`) für Berechtigungsprüfung
- ✅ Umfangreiches Error-Logging in der API
- ✅ Detaillierte Fehlerausgaben für alle I/O-Operationen
- ✅ Request/Response-Logging für Debugging

### 3. Beispiel-Touren
- ✅ `data-demo/tours.json` - Odenthal Beispiele (3 Stationen)
- ✅ `data-demo/schkoelen.json` - Schkölen Tour (2 Stationen)
  - Wasserburg Schkölen
  - Evangelische Stadtkirche

### 4. Workflow-Fixes
- ✅ GitHub Actions Attestation-Schritt auskommentiert (benötigt OIDC Permissions)

## 🔧 Technische Änderungen

**Neue Dateien:**
- `docker-compose.s3.yml` - Docker Compose für S3-Backend
- `S3-SETUP.md` - Vollständige S3-Dokumentation
- `.env.s3.example` - Konfigurationsvorlage
- `api/s3-config-example.php` - S3-Beispielcode
- `api/test.php` - Debugging-Script
- `data-demo/tours.json` - Odenthal Beispiele
- `data-demo/schkoelen.json` - Schkölen Tour

**Aktualisierte Dateien:**
- `README.md` - S3-Dokumentation hinzugefügt
- `.gitignore` - S3-Credentials ausgeschlossen
- `api/config.php` - Erweiterte Fehlerbehandlung
- `api/tours.php` - Error-Logging aktiviert
- `.github/workflows/docker-build.yml` - Attestation-Fix

## 📝 Verwendung

### S3-Integration aktivieren
```bash
# Container mit S3-Backend starten
docker-compose -f docker-compose.s3.yml up -d
```

### API debuggen
```bash
# Test-Script ausführen
docker exec virtuelle-stadtfuehrungen php /var/www/html/api/test.php

# Logs beobachten
docker exec virtuelle-stadtfuehrungen tail -f /var/log/apache2/error.log
```

### Beispiel-Touren verwenden
```bash
# Kopiere Beispiele ins data-Verzeichnis
cp data-demo/tours.json data/
# oder
cp data-demo/schkoelen.json data/tours.json
```

## ✅ Getestet

- ✅ Docker Build erfolgreich
- ✅ API-Endpunkte funktionieren
- ✅ Error-Logging zeigt detaillierte Informationen
- ✅ Test-Script läuft erfolgreich
- ✅ Beispiel-Touren sind valide JSON

## 📋 Breaking Changes

Keine Breaking Changes - Alle Änderungen sind abwärtskompatibel.

## 🔗 Related Issues

Behebt Probleme mit:
- Tour-Speicherung und Debugging
- S3-Persistierung
- GitHub Actions Workflow-Fehler

---

## 📊 Commits in diesem PR

1. Add S3 configuration example for persistent storage
2. Add S3-Integration mit s3fs-fuse für persistente Speicherung
3. Remove S3 mount scripts - Volume wird über Docker-Verwaltung gemountet
4. Add data-demo/ mit Muster tours.json
5. Add Schkölen Tour mit Wasserburg und Stadtkirche
6. Add API test script for debugging data persistence
7. Add comprehensive error logging and debugging to API
