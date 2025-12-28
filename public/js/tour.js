// Tour-JavaScript mit Geolokation und OpenLayers
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api/tours.php'
    : '/api/tours.php';

// Globale Variablen
let map = null;
let currentPosition = null;
let markersLayer = null;
let userMarker = null;
let tourData = null;
let watchId = null;
let visitedElements = new Set();

// DOM-Elemente
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const tourContent = document.getElementById('tour-content');
const statusBar = document.getElementById('status-bar');
const statusText = document.getElementById('status-text');
const tourTitle = document.getElementById('tour-title');
const infoTitle = document.getElementById('info-title');
const infoDescription = document.getElementById('info-description');
const elementsContainer = document.getElementById('elements-container');

// URL-Parameter auslesen
const urlParams = new URLSearchParams(window.location.search);
const tourId = urlParams.get('id');

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    if (!tourId) {
        showError('Keine Tour-ID angegeben!');
        return;
    }

    loadTour();
});

// Tour laden
async function loadTour() {
    try {
        const response = await fetch(`${API_BASE}?id=${encodeURIComponent(tourId)}`);

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        tourData = await response.json();

        loadingElement.classList.add('hidden');
        tourContent.classList.remove('hidden');

        // Tour-Informationen anzeigen
        tourTitle.textContent = tourData.name;
        infoTitle.textContent = tourData.name;
        infoDescription.textContent = tourData.beschreibung;

        // Geolokation starten
        startGeolocation();

    } catch (error) {
        console.error('Fehler beim Laden der Tour:', error);
        loadingElement.classList.add('hidden');
        showError('Fehler beim Laden der Tour. Bitte versuchen Sie es später erneut.');
    }
}

// Geolokation starten
function startGeolocation() {
    if (!navigator.geolocation) {
        showError('Geolokation wird von Ihrem Browser nicht unterstützt!');
        return;
    }

    // Einmalige Positionsabfrage für initiale Karte
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            initMap();
            displayElements();

            // Kontinuierliche Positionsverfolgung starten
            watchId = navigator.geolocation.watchPosition(
                updatePosition,
                handleGeolocationError,
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        },
        (error) => {
            handleGeolocationError(error);
            // Auch bei Fehler die Karte initialisieren (mit Standardposition)
            initMapWithDefaultPosition();
        }
    );
}

// Karte initialisieren
function initMap() {
    map = new OpenLayers.Map('karte');
    map.addLayer(new OpenLayers.Layer.OSM());

    // Marker-Layer erstellen
    markersLayer = new OpenLayers.Layer.Markers('Markers');
    map.addLayer(markersLayer);

    // Benutzerposition als Marker hinzufügen
    updateUserMarker();

    // Tour-Elemente als Marker hinzufügen
    addTourMarkers();

    // Karte auf Benutzerposition zentrieren
    const lonLat = new OpenLayers.LonLat(currentPosition.lon, currentPosition.lat)
        .transform(
            new OpenLayers.Projection('EPSG:4326'),
            map.getProjectionObject()
        );

    map.setCenter(lonLat, 14);

    updateStatusBar('Standort ermittelt - Los geht\'s!', true);
}

// Karte mit Standardposition initialisieren (wenn Geolokation fehlschlägt)
function initMapWithDefaultPosition() {
    // Erste Element-Position als Fallback verwenden
    if (tourData.elemente && tourData.elemente.length > 0) {
        currentPosition = {
            lat: tourData.elemente[0].geolokation.lat,
            lon: tourData.elemente[0].geolokation.lon
        };
    } else {
        // Odenthal als Standard
        currentPosition = { lat: 51.0344, lon: 7.1089 };
    }

    initMap();
    displayElements();
}

// Benutzermarker aktualisieren
function updateUserMarker() {
    if (!map || !currentPosition) return;

    const lonLat = new OpenLayers.LonLat(currentPosition.lon, currentPosition.lat)
        .transform(
            new OpenLayers.Projection('EPSG:4326'),
            map.getProjectionObject()
        );

    // Alten Marker entfernen
    if (userMarker) {
        markersLayer.removeMarker(userMarker);
    }

    // Eigenes Icon für Benutzerposition (blauer Punkt)
    const size = new OpenLayers.Size(20, 20);
    const offset = new OpenLayers.Pixel(-(size.w / 2), -(size.h / 2));
    const icon = new OpenLayers.Icon(
        'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                <circle cx="10" cy="10" r="8" fill="#3498db" stroke="white" stroke-width="2"/>
            </svg>
        `),
        size,
        offset
    );

    userMarker = new OpenLayers.Marker(lonLat, icon);
    markersLayer.addMarker(userMarker);
}

// Tour-Marker hinzufügen
function addTourMarkers() {
    if (!tourData.elemente) return;

    tourData.elemente.forEach((element, index) => {
        const lonLat = new OpenLayers.LonLat(element.geolokation.lon, element.geolokation.lat)
            .transform(
                new OpenLayers.Projection('EPSG:4326'),
                map.getProjectionObject()
            );

        // Nummer als Marker-Icon
        const size = new OpenLayers.Size(30, 30);
        const offset = new OpenLayers.Pixel(-(size.w / 2), -size.h);
        const icon = new OpenLayers.Icon(
            'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
                    <circle cx="15" cy="15" r="12" fill="#C0775C" stroke="white" stroke-width="2"/>
                    <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index + 1}</text>
                </svg>
            `),
            size,
            offset
        );

        const marker = new OpenLayers.Marker(lonLat, icon.clone());
        markersLayer.addMarker(marker);
    });
}

// Position aktualisieren (kontinuierliche Verfolgung)
function updatePosition(position) {
    currentPosition = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };

    updateUserMarker();
    checkProximity();
}

// Nähe zu Elementen prüfen (10m-Regel)
function checkProximity() {
    if (!tourData.elemente || !currentPosition) return;

    tourData.elemente.forEach(element => {
        const distance = calculateDistance(
            currentPosition.lat,
            currentPosition.lon,
            element.geolokation.lat,
            element.geolokation.lon
        );

        // Distanz in Liste aktualisieren
        updateElementDistance(element.id, distance);

        // Wenn innerhalb von 10 Metern und noch nicht besucht
        if (distance <= 10 && !visitedElements.has(element.id)) {
            visitedElements.add(element.id);
            triggerElementLink(element);
        }
    });
}

// Element-Link auslösen (automatisch öffnen)
function triggerElementLink(element) {
    // Visuelles Feedback
    updateStatusBar(`📍 Sie haben "${element.name}" erreicht!`, true);

    // Link öffnen
    if (element.link) {
        // Bestätigung anzeigen
        if (confirm(`Sie sind bei "${element.name}" angekommen!\n\nMöchten Sie mehr erfahren?`)) {
            window.open(element.link, '_blank');
        }
    }
}

// Distanz zwischen zwei Koordinaten berechnen (Haversine-Formel)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Erdradius in Metern
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distanz in Metern
}

// Elemente anzeigen
function displayElements() {
    if (!tourData.elemente) return;

    elementsContainer.innerHTML = '';

    tourData.elemente.forEach((element, index) => {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'element-marker';
        elementDiv.id = `element-${element.id}`;

        let distance = '';
        if (currentPosition) {
            const dist = calculateDistance(
                currentPosition.lat,
                currentPosition.lon,
                element.geolokation.lat,
                element.geolokation.lon
            );
            distance = formatDistance(dist);
        }

        elementDiv.innerHTML = `
            <h4>${index + 1}. ${escapeHtml(element.name)}</h4>
            <p><strong>${escapeHtml(element.titel)}</strong></p>
            <p>${escapeHtml(element.beschreibung)}</p>
            <span class="distance-badge" id="distance-${element.id}">${distance}</span>
        `;

        elementsContainer.appendChild(elementDiv);
    });
}

// Distanz eines Elements aktualisieren
function updateElementDistance(elementId, distance) {
    const badge = document.getElementById(`distance-${elementId}`);
    const elementDiv = document.getElementById(`element-${elementId}`);

    if (badge) {
        badge.textContent = formatDistance(distance);

        // Klasse basierend auf Distanz setzen
        badge.className = 'distance-badge';
        if (elementDiv) {
            elementDiv.className = 'element-marker';
        }

        if (distance <= 10) {
            badge.classList.add('very-near');
            if (elementDiv) elementDiv.classList.add('near');
        } else if (distance <= 50) {
            badge.classList.add('near');
        } else {
            badge.classList.add('far');
        }
    }
}

// Distanz formatieren
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    } else {
        return `${(meters / 1000).toFixed(1)} km`;
    }
}

// Statusleiste aktualisieren
function updateStatusBar(text, active = false) {
    statusText.textContent = text;
    if (active) {
        statusBar.classList.add('active');
    } else {
        statusBar.classList.remove('active');
    }
}

// Geolokationsfehler behandeln
function handleGeolocationError(error) {
    let errorMsg = 'Fehler bei der Standortermittlung: ';

    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMsg += 'Berechtigung verweigert. Bitte erlauben Sie den Standortzugriff.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMsg += 'Standortinformationen nicht verfügbar.';
            break;
        case error.TIMEOUT:
            errorMsg += 'Zeitüberschreitung bei der Standortermittlung.';
            break;
        default:
            errorMsg += 'Unbekannter Fehler.';
    }

    updateStatusBar('⚠️ ' + errorMsg, false);
}

// Fehler anzeigen
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// XSS-Schutz
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Aufräumen beim Verlassen der Seite
window.addEventListener('beforeunload', () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
});
