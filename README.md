# 📍 Virtuelle Stadtführungen - Mobile Web-App

Eine moderne, mobile-optimierte Web-Anwendung für virtuelle Stadtführungen mit GPS-basierter Navigation und automatischer Aktivierung von Inhalten bei Annäherung.

## 🎯 Features

- **📱 Mobile-First Design**: Optimiert für Smartphones und Tablets
- **🗺️ OpenStreetMap Integration**: Interaktive Karten mit OpenLayers
- **📍 Geolokations-Tracking**: Echtzeit-Positionsverfolgung mit HTML5 Geolocation API
- **🎯 Automatische Aktivierung**: Links öffnen sich automatisch bei Annäherung auf 10 Meter
- **✏️ Vollständiges CRUD-System**: Touren erstellen, bearbeiten und löschen
- **🎨 Kulturelles Design**: Warme Farbgebung passend für kulturelle Inhalte
- **🐳 Docker-Ready**: Einfaches Deployment mit Docker und docker-compose
- **🔄 CI/CD**: Automatischer Docker-Build mit GitHub Actions

## 🏗️ Architektur

```
virtueller-reisefuehrer/
├── public/                 # Frontend-Dateien
│   ├── index.html         # Auswahlseite (Tourenliste)
│   ├── tour.html          # Virtuelle Stadtführung mit Karte
│   ├── admin.html         # Verwaltungsseite
│   ├── edit.html          # Bearbeitungsseite
│   ├── css/
│   │   └── style.css      # Mobile-first CSS
│   └── js/
│       ├── app.js         # Hauptlogik für Auswahlseite
│       ├── tour.js        # Karten- und Geolokations-Logik
│       ├── admin.js       # Verwaltungslogik
│       └── edit.js        # Bearbeitungsformular-Logik
├── api/                   # Backend (PHP)
│   ├── tours.php          # REST API für CRUD-Operationen
│   └── config.php         # Konfiguration
├── data/
│   └── tours.json         # JSON-Datenspeicher
├── Dockerfile             # Docker-Konfiguration
├── docker-compose.yml     # Docker Compose Setup
└── .github/
    └── workflows/
        └── docker-build.yml  # GitHub Actions CI/CD
```

## 🚀 Quick Start

### Option 1: Mit Docker Compose (empfohlen)

```bash
# Repository klonen
git clone https://github.com/ralf-schmid/virtueller-reisefuehrer.git
cd virtueller-reisefuehrer

# Container starten
docker-compose up -d

# App öffnen
open http://localhost:8080
```

### Option 2: Mit Docker

```bash
# Image bauen
docker build -t virtuelle-stadtfuehrungen .

# Container starten
docker run -d -p 8080:80 -v $(pwd)/data:/var/www/html/data virtuelle-stadtfuehrungen

# App öffnen
open http://localhost:8080
```

### Option 3: Lokale Entwicklung (PHP)

```bash
# PHP 8.2+ erforderlich
cd public
php -S localhost:8080

# App öffnen
open http://localhost:8080
```

## 📖 Verwendung

### 1. Touren ansehen

Öffnen Sie die Hauptseite (`index.html`) und wählen Sie eine virtuelle Stadtführung aus.

### 2. Tour starten

- Klicken Sie auf "Tour starten"
- Erlauben Sie den Standortzugriff im Browser
- Die Karte zeigt Ihre Position und alle Stationen der Tour
- Nähern Sie sich einer Station auf 10 Meter - der zugehörige Link öffnet sich automatisch

### 3. Touren verwalten

Über die Verwaltungsseite (`admin.html`) können Sie:

- Neue Touren erstellen
- Bestehende Touren bearbeiten
- Touren löschen
- Vorschau der Touren anzeigen

### 4. Tour erstellen/bearbeiten

Auf der Bearbeitungsseite (`edit.html`):

1. **Grundinformationen**: Name, Beschreibung und Bild der Tour
2. **Stationen hinzufügen**: Für jede Station:
   - Name und Titel
   - Beschreibung
   - Bild-URL
   - Link (wird bei Annäherung geöffnet)
   - GPS-Koordinaten (Latitude/Longitude)
3. **Speichern**: Änderungen werden in `data/tours.json` gespeichert

## 🗺️ GPS-Koordinaten finden

So finden Sie GPS-Koordinaten für Ihre Stationen:

1. Öffnen Sie [OpenStreetMap](https://www.openstreetmap.org/)
2. Navigieren Sie zum gewünschten Ort
3. Klicken Sie mit der rechten Maustaste auf die Position
4. Wählen Sie "Adresse anzeigen"
5. Die Koordinaten werden in der URL angezeigt: `...#map=18/51.0344/7.1089`
   - Latitude: 51.0344
   - Longitude: 7.1089

## 🎨 Farbschema

Die App verwendet ein kulturell ansprechendes, warmes Farbschema:

- **Primär**: #2C3E50 (Dunkelblau) - Header, Überschriften
- **Sekundär**: #E8B87E (Warmes Gold) - Akzente, Buttons
- **Akzent**: #C0775C (Terrakotta) - Marker, Highlights
- **Hintergrund**: #F5F5DC (Beige) - Seitenhintergrund
- **Text**: #333333 (Dunkelgrau) - Haupttext

## 🔧 Technologien

### Frontend
- **HTML5**: Semantisches Markup, Geolocation API
- **CSS3**: Mobile-First, Flexbox, Grid, CSS Variables
- **JavaScript (ES6+)**: Fetch API, Async/Await
- **OpenLayers 2.13.1**: Kartendarstellung

### Backend
- **PHP 8.4**: REST API, JSON-Verarbeitung
- **Apache**: Webserver

### DevOps
- **Docker**: Containerisierung
- **GitHub Actions**: CI/CD Pipeline

## 📡 API-Dokumentation

### GET /api/tours.php
Alle Touren abrufen

**Response:**
```json
[
  {
    "id": "tour-123",
    "name": "Historisches Odenthal",
    "beschreibung": "...",
    "bild": "https://...",
    "elemente": [...]
  }
]
```

### GET /api/tours.php?id={id}
Eine bestimmte Tour abrufen

**Response:**
```json
{
  "id": "tour-123",
  "name": "Historisches Odenthal",
  "beschreibung": "...",
  "bild": "https://...",
  "elemente": [
    {
      "id": "elem-1",
      "name": "Altes Rathaus",
      "titel": "Das historische Rathaus",
      "beschreibung": "...",
      "bild": "https://...",
      "link": "https://...",
      "geolokation": {
        "lat": 51.0344,
        "lon": 7.1089
      }
    }
  ]
}
```

### POST /api/tours.php
Neue Tour erstellen

**Request Body:**
```json
{
  "name": "Neue Tour",
  "beschreibung": "...",
  "bild": "https://...",
  "elemente": [...]
}
```

### PUT /api/tours.php?id={id}
Tour aktualisieren

**Request Body:** (gleich wie POST)

### DELETE /api/tours.php?id={id}
Tour löschen

## 🔒 Sicherheit

- **XSS-Schutz**: HTML-Escaping aller Benutzereingaben
- **Input-Validierung**: Client- und serverseitige Validierung
- **CORS-Header**: Konfigurierbar für verschiedene Umgebungen
- **Datei-Berechtigungen**: Korrekte Permissions im Docker-Container

## 🚢 Deployment

### Docker Hub / GitHub Container Registry

```bash
# Image von GitHub Container Registry pullen
docker pull ghcr.io/ralf-schmid/virtueller-reisefuehrer:latest

# Container starten
docker run -d \
  -p 8080:80 \
  -v ./data:/var/www/html/data \
  --name stadtfuehrungen \
  ghcr.io/ralf-schmid/virtueller-reisefuehrer:latest
```

### Produktions-Umgebung

Für Produktion wird empfohlen:

1. HTTPS-Zertifikat einrichten (Let's Encrypt)
2. Reverse Proxy (nginx) vor Apache
3. Backup der `data/tours.json` einrichten (oder S3-Integration)
4. Resource-Limits setzen

### ☁️ S3-Integration für persistente Speicherung

Das `data/` Verzeichnis sollte mit einem S3-Bucket oder einem persistenten Volume verbunden werden:

```bash
# Container mit persistentem Volume starten
docker-compose -f docker-compose.s3.yml up -d
```

**Hinweis:** Mounten Sie das `data/` Verzeichnis über Ihre Docker-Verwaltung mit einem S3-kompatiblen Volume.

#### Vorteile der persistenten Speicherung

- ✅ **Persistent**: Daten überleben Container-Neustarts
- ✅ **Skalierbar**: Unbegrenzter Speicherplatz
- ✅ **Backup**: Automatische Versionierung
- ✅ **Multi-Region**: Daten verfügbar in mehreren Regionen
- ✅ **Sicher**: Verschlüsselung at-rest und in-transit

Siehe `S3-SETUP.md` für Details zur S3-Konfiguration.

### 📋 Logging & Debugging

Die Anwendung schreibt Logs in Dateien (nicht stdout/stderr):

**Log-Dateien:**
- **Apache Error Log:** `/var/log/apache2/error.log`
- **Apache Access Log:** `/var/log/apache2/access.log`
- **PHP Error Log:** `/var/log/php_errors.log`

**Logs anzeigen:**
```bash
# Apache Error Log
docker exec virtuelle-stadtfuehrungen tail -f /var/log/apache2/error.log

# Apache Access Log
docker exec virtuelle-stadtfuehrungen tail -f /var/log/apache2/access.log

# PHP Errors
docker exec virtuelle-stadtfuehrungen tail -f /var/log/php_errors.log

# Alle Logs gleichzeitig
docker exec virtuelle-stadtfuehrungen tail -f /var/log/apache2/*.log /var/log/php_errors.log
```

## 🛠️ Entwicklung

### Lokale Entwicklung starten

```bash
# Container im Entwicklungsmodus starten
docker-compose up

# Code-Änderungen werden automatisch übernommen (Volume-Mount)
```

### JSON-Struktur bearbeiten

Die Datei `data/tours.json` kann direkt bearbeitet werden:

```json
[
  {
    "id": "eindeutige-id",
    "name": "Tour Name",
    "beschreibung": "Beschreibung",
    "bild": "URL zum Bild",
    "elemente": [
      {
        "id": "element-id",
        "name": "Stationsname",
        "titel": "Station Titel",
        "beschreibung": "Beschreibung",
        "bild": "URL",
        "link": "URL",
        "geolokation": {
          "lat": 51.0344,
          "lon": 7.1089
        }
      }
    ]
  }
]
```

## 📱 Browser-Kompatibilität

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile

**Hinweis**: Geolokation erfordert HTTPS (außer auf localhost)!

## 🤝 Beitragen

Contributions sind willkommen! Bitte:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist Open Source und unter der MIT-Lizenz verfügbar.

## 👤 Autor

Erstellt für die virtuellen Stadtführungen in Odenthal und Umgebung.

## 🙏 Danksagungen

- OpenStreetMap für die Kartendaten
- OpenLayers für die Kartenbibliothek
- Kulturspiegelodenthal.de für die Design-Inspiration

## 📞 Support

Bei Fragen oder Problemen:

- **Issues**: [GitHub Issues](https://github.com/ralf-schmid/virtueller-reisefuehrer/issues)
- **Dokumentation**: Siehe dieses README

---

**Viel Spaß beim Erkunden Ihrer Stadt! 🏛️🗺️**
