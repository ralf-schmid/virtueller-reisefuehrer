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

// LocalStorage für besuchte Elemente
function loadVisitedElements() {
    const saved = localStorage.getItem(`visited_${tourId}`);
    if (saved) {
        visitedElements = new Set(JSON.parse(saved));
    }
}

function saveVisitedElements() {
    localStorage.setItem(`visited_${tourId}`, JSON.stringify([...visitedElements]));
}

// Push-Benachrichtigungen aktivieren
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });
    }
}

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

    // Besuchte Elemente aus LocalStorage laden
    loadVisitedElements();

    // Push-Benachrichtigungen anfragen
    requestNotificationPermission();

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

        const isVisited = visitedElements.has(element.id);
        const fillColor = isVisited ? '#27ae60' : '#C0775C';

        // Mit Bild wenn vorhanden, sonst nur Nummer
        let iconSvg;
        if (element.bild) {
            iconSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="60" height="70">
                    <defs>
                        <clipPath id="clip-${index}">
                            <circle cx="30" cy="30" r="25"/>
                        </clipPath>
                    </defs>
                    <image href="${element.bild}" x="5" y="5" width="50" height="50" clip-path="url(#clip-${index})" preserveAspectRatio="xMidYMid slice"/>
                    <circle cx="30" cy="30" r="25" fill="none" stroke="${fillColor}" stroke-width="3"/>
                    <circle cx="30" cy="60" r="10" fill="${fillColor}" stroke="white" stroke-width="2"/>
                    <text x="30" y="65" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
                </svg>
            `;
        } else {
            iconSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
                    <circle cx="15" cy="15" r="12" fill="${fillColor}" stroke="white" stroke-width="2"/>
                    <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index + 1}</text>
                </svg>
            `;
        }

        const size = element.bild ? new OpenLayers.Size(60, 70) : new OpenLayers.Size(30, 30);
        const offset = element.bild ? new OpenLayers.Pixel(-30, -70) : new OpenLayers.Pixel(-15, -30);
        const icon = new OpenLayers.Icon(
            'data:image/svg+xml;base64,' + btoa(iconSvg),
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

// Nähe zu Elementen prüfen (10m automatisch, < 200m mit Button)
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

        // Wenn innerhalb von 10 Metern und noch nicht besucht - automatisch
        if (distance <= 10 && !visitedElements.has(element.id)) {
            markElementAsVisited(element);
            triggerElementLink(element, true);
        }
        // Wenn zwischen 10m und 200m - Benachrichtigung senden
        else if (distance > 10 && distance <= 200 && !visitedElements.has(element.id)) {
            const button = document.getElementById(`manual-trigger-${element.id}`);
            if (button && button.classList.contains('hidden')) {
                showNotification(`${element.name} in der Nähe!`, `Sie sind ${Math.round(distance)} m entfernt. Tippen Sie auf den Button um mehr zu erfahren.`);
            }
        }
    });
}

// Element als besucht markieren
function markElementAsVisited(element) {
    visitedElements.add(element.id);
    saveVisitedElements();

    // Marker neu zeichnen
    markersLayer.clearMarkers();
    updateUserMarker();
    addTourMarkers();

    // Liste aktualisieren
    displayElements();
}

// Element-Link auslösen (automatisch oder manuell)
function triggerElementLink(element, isAutomatic = false) {
    // Visuelles Feedback
    const message = isAutomatic ?
        `📍 Sie haben "${element.name}" erreicht!` :
        `📍 "${element.name}" - Viel Spaß beim Erkunden!`;
    updateStatusBar(message, true);

    // Push-Benachrichtigung bei automatischem Trigger
    if (isAutomatic) {
        showNotification(`Station erreicht!`, `Sie sind bei "${element.name}" angekommen!`);
    }

    // Link öffnen
    if (element.link) {
        // Bestätigung anzeigen
        const confirmMessage = isAutomatic ?
            `Sie sind bei "${element.name}" angekommen!\n\nMöchten Sie mehr erfahren?` :
            `"${element.name}"\n\nMöchten Sie mehr erfahren?`;
        if (confirm(confirmMessage)) {
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
        const isVisited = visitedElements.has(element.id);
        elementDiv.className = isVisited ? 'element-marker visited' : 'element-marker';
        elementDiv.id = `element-${element.id}`;

        let distance = '';
        let dist = 0;
        let showManualButton = false;
        if (currentPosition) {
            dist = calculateDistance(
                currentPosition.lat,
                currentPosition.lon,
                element.geolokation.lat,
                element.geolokation.lon
            );
            distance = formatDistance(dist);
            showManualButton = dist > 10 && dist <= 200 && !isVisited;
        }

        const imageHtml = element.bild ?
            `<img src="${escapeHtml(element.bild)}" alt="${escapeHtml(element.name)}" class="element-image">` :
            '';

        const checkboxHtml = `
            <label class="checkbox-label">
                <input type="checkbox"
                    id="checkbox-${element.id}"
                    ${isVisited ? 'checked' : ''}
                    onchange="toggleVisited('${element.id}')">
                <span>Als besucht markieren</span>
            </label>
        `;

        const manualButtonHtml = showManualButton ?
            `<button class="btn btn-primary" id="manual-trigger-${element.id}"
                onclick="manualTrigger('${element.id}')">
                📍 Mehr erfahren (${Math.round(dist)} m entfernt)
            </button>` :
            `<button class="btn btn-primary hidden" id="manual-trigger-${element.id}"></button>`;

        elementDiv.innerHTML = `
            <div class="element-content">
                ${imageHtml}
                <div class="element-text">
                    <h4>${index + 1}. ${escapeHtml(element.name)}</h4>
                    ${element.titel ? `<p><strong>${escapeHtml(element.titel)}</strong></p>` : ''}
                    <p>${escapeHtml(element.beschreibung)}</p>
                    <span class="distance-badge" id="distance-${element.id}">${distance}</span>
                    <div class="element-actions">
                        ${checkboxHtml}
                        ${manualButtonHtml}
                    </div>
                </div>
            </div>
        `;

        elementsContainer.appendChild(elementDiv);
    });
}

// Element manuell als besucht/unbesucht markieren
window.toggleVisited = function(elementId) {
    const element = tourData.elemente.find(e => e.id === elementId);
    if (!element) return;

    if (visitedElements.has(elementId)) {
        visitedElements.delete(elementId);
    } else {
        markElementAsVisited(element);
    }
    saveVisitedElements();

    // UI aktualisieren
    markersLayer.clearMarkers();
    updateUserMarker();
    addTourMarkers();
    displayElements();
}

// Manueller Trigger für Station
window.manualTrigger = function(elementId) {
    const element = tourData.elemente.find(e => e.id === elementId);
    if (!element) return;

    markElementAsVisited(element);
    triggerElementLink(element, false);
}

// Distanz eines Elements aktualisieren
function updateElementDistance(elementId, distance) {
    const badge = document.getElementById(`distance-${elementId}`);
    const elementDiv = document.getElementById(`element-${elementId}`);
    const manualButton = document.getElementById(`manual-trigger-${elementId}`);
    const isVisited = visitedElements.has(elementId);

    if (badge) {
        badge.textContent = formatDistance(distance);

        // Klasse basierend auf Distanz setzen
        badge.className = 'distance-badge';
        if (elementDiv) {
            elementDiv.className = isVisited ? 'element-marker visited' : 'element-marker';
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

    // Manuellen Button ein/ausblenden
    if (manualButton) {
        const showButton = distance > 10 && distance <= 200 && !isVisited;
        if (showButton) {
            manualButton.classList.remove('hidden');
            manualButton.textContent = `📍 Mehr erfahren (${Math.round(distance)} m entfernt)`;
        } else {
            manualButton.classList.add('hidden');
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
