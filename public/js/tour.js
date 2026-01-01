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
let imageDataUrls = new Map(); // Cache für geladene Bilder als data URLs

// Audio-Player Variablen
let currentAudio = null;
let currentPlayingElementId = null;

// Hilfsfunktion: Bild laden und in data URL konvertieren
async function loadImageAsDataUrl(url) {
    if (!url) return null;
    if (imageDataUrls.has(url)) return imageDataUrls.get(url);

    try {
        // Verwende Image-Proxy für externe URLs
        const proxyUrl = `/api/image_proxy.php?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                imageDataUrls.set(url, dataUrl);
                resolve(dataUrl);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Fehler beim Laden des Bildes:', url, error);
        return null;
    }
}

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
// HINWEIS: Muss aus einem Benutzer-Event (z.B. Button-Click) aufgerufen werden!
// Moderne Browser blockieren automatische Notification-Anfragen beim Seitenladen
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(err => {
            console.log('Notification permission request blocked:', err);
        });
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

// Audio-Player Funktionen
function playAudio(audioUrl, elementId) {
    // Stoppe vorherige Wiedergabe
    stopAudio();

    if (!audioUrl || audioUrl.trim() === '') {
        console.warn('Keine Audio-Datei vorhanden für Element:', elementId);
        return;
    }

    // Neues Audio-Element erstellen
    currentAudio = new Audio(audioUrl);
    currentPlayingElementId = elementId;

    // Event-Listener
    currentAudio.addEventListener('play', () => {
        updateAudioButton(elementId, 'playing');
    });

    currentAudio.addEventListener('ended', () => {
        updateAudioButton(elementId, 'stopped');
        currentPlayingElementId = null;
        currentAudio = null;
    });

    currentAudio.addEventListener('pause', () => {
        updateAudioButton(elementId, 'paused');
    });

    currentAudio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        updateAudioButton(elementId, 'stopped');
        currentPlayingElementId = null;
        currentAudio = null;
    });

    // Audio abspielen
    currentAudio.play().catch(error => {
        console.error('Fehler beim Abspielen:', error);
        updateAudioButton(elementId, 'stopped');
    });
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (currentPlayingElementId) {
        updateAudioButton(currentPlayingElementId, 'stopped');
        currentPlayingElementId = null;
    }
}

function pauseAudio() {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
    }
}

function resumeAudio() {
    if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch(error => {
            console.error('Fehler beim Fortsetzen:', error);
        });
    }
}

function updateAudioButton(elementId, state) {
    const button = document.getElementById(`audio-btn-${elementId}`);
    if (!button) return;

    const icon = button.querySelector('.audio-icon');
    if (!icon) return;

    switch (state) {
        case 'playing':
            icon.textContent = '⏸️';
            button.title = 'Audio pausieren';
            button.classList.remove('paused');
            button.classList.add('playing');
            break;
        case 'paused':
            icon.textContent = '▶️';
            button.title = 'Audio fortsetzen';
            button.classList.remove('playing');
            button.classList.add('paused');
            break;
        case 'stopped':
        default:
            icon.textContent = '🔊';
            button.title = 'Audio abspielen';
            button.classList.remove('playing', 'paused');
            break;
    }
}

// Audio für eine Station abspielen
window.toggleAudio = function(elementId) {
    const element = tourData.elemente.find(e => e.id === elementId);
    if (!element) return;

    // Prüfen ob Audio-Datei vorhanden
    if (!element.audio || element.audio.trim() === '') {
        alert('Für diese Station ist keine Audio-Datei vorhanden.');
        return;
    }

    // Wenn dieses Audio bereits abgespielt wird
    if (currentPlayingElementId === elementId) {
        if (currentAudio && currentAudio.paused) {
            resumeAudio();
        } else if (currentAudio && !currentAudio.paused) {
            pauseAudio();
        }
    } else {
        // Neues Audio abspielen
        playAudio(element.audio, elementId);
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

    // Push-Benachrichtigungen NICHT automatisch anfragen (moderne Browser blockieren dies)
    // Benachrichtigungen werden nur angezeigt, wenn bereits Berechtigung erteilt wurde

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
async function initMap() {
    map = new OpenLayers.Map('karte');
    map.addLayer(new OpenLayers.Layer.OSM());

    // Marker-Layer erstellen
    markersLayer = new OpenLayers.Layer.Markers('Markers');
    map.addLayer(markersLayer);

    // Benutzerposition als Marker hinzufügen
    updateUserMarker();

    // Tour-Elemente als Marker hinzufügen (async wegen Bildladung)
    await addTourMarkers();

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
async function initMapWithDefaultPosition() {
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

    await initMap();
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

// Tour-Marker hinzufügen (async um Bilder zu laden)
async function addTourMarkers() {
    if (!tourData.elemente) return;

    // Erst alle Bilder laden (mit Fehlerbehandlung)
    const imagePromises = tourData.elemente.map(async (element) => {
        if (!element.bild) return null;
        try {
            const dataUrl = await loadImageAsDataUrl(element.bild);
            return dataUrl;
        } catch (error) {
            console.warn('Fehler beim Laden des Bildes für', element.name, error);
            return null;
        }
    });
    const loadedImages = await Promise.all(imagePromises);

    tourData.elemente.forEach((element, index) => {
        try {
            const lonLat = new OpenLayers.LonLat(element.geolokation.lon, element.geolokation.lat)
                .transform(
                    new OpenLayers.Projection('EPSG:4326'),
                    map.getProjectionObject()
                );

            const isVisited = visitedElements.has(element.id);
            const fillColor = isVisited ? '#27ae60' : '#C0775C';
            const imageDataUrl = loadedImages[index];

            // Mit Bild wenn erfolgreich geladen, sonst nur Nummer
            let iconSvg;
            if (imageDataUrl) {
                iconSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="70">
                        <defs>
                            <clipPath id="clip-${element.id}-${index}">
                                <circle cx="30" cy="30" r="25"/>
                            </clipPath>
                        </defs>
                        <image href="${imageDataUrl}" x="5" y="5" width="50" height="50" clip-path="url(#clip-${element.id}-${index})" preserveAspectRatio="xMidYMid slice"/>
                        <circle cx="30" cy="30" r="25" fill="none" stroke="${fillColor}" stroke-width="3"/>
                        <circle cx="30" cy="60" r="10" fill="${fillColor}" stroke="white" stroke-width="2"/>
                        <text x="30" y="65" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
                    </svg>
                `;
            } else {
                // Fallback: Einfacher Marker ohne Bild
                iconSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
                        <circle cx="15" cy="15" r="12" fill="${fillColor}" stroke="white" stroke-width="2"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index + 1}</text>
                    </svg>
                `;
            }

            const size = imageDataUrl ? new OpenLayers.Size(60, 70) : new OpenLayers.Size(30, 30);
            const offset = imageDataUrl ? new OpenLayers.Pixel(-30, -70) : new OpenLayers.Pixel(-15, -30);
            const icon = new OpenLayers.Icon(
                'data:image/svg+xml;base64,' + btoa(iconSvg),
                size,
                offset
            );

            const marker = new OpenLayers.Marker(lonLat, icon.clone());
            markersLayer.addMarker(marker);
        } catch (error) {
            console.error('Fehler beim Erstellen des Markers für', element.name, error);
            // Trotzdem einen einfachen Marker erstellen
            try {
                const lonLat = new OpenLayers.LonLat(element.geolokation.lon, element.geolokation.lat)
                    .transform(
                        new OpenLayers.Projection('EPSG:4326'),
                        map.getProjectionObject()
                    );
                const isVisited = visitedElements.has(element.id);
                const fillColor = isVisited ? '#27ae60' : '#C0775C';
                const iconSvg = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
                        <circle cx="15" cy="15" r="12" fill="${fillColor}" stroke="white" stroke-width="2"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${index + 1}</text>
                    </svg>
                `;
                const icon = new OpenLayers.Icon(
                    'data:image/svg+xml;base64,' + btoa(iconSvg),
                    new OpenLayers.Size(30, 30),
                    new OpenLayers.Pixel(-15, -30)
                );
                const marker = new OpenLayers.Marker(lonLat, icon);
                markersLayer.addMarker(marker);
            } catch (fallbackError) {
                console.error('Auch Fallback-Marker fehlgeschlagen für', element.name, fallbackError);
            }
        }
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
async function markElementAsVisited(element) {
    visitedElements.add(element.id);
    saveVisitedElements();

    // Marker neu zeichnen
    markersLayer.clearMarkers();
    updateUserMarker();
    await addTourMarkers();

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
            `<img src="${escapeHtml(element.bild)}" alt="${escapeHtml(element.name)}" class="element-image" width="800" height="600" loading="lazy">` :
            '';

        elementDiv.innerHTML = `
            <div class="element-content">
                ${imageHtml}
                <div class="element-text">
                    <h4>${index + 1}. ${escapeHtml(element.name)}</h4>
                    ${element.titel ? `<p><strong>${escapeHtml(element.titel)}</strong></p>` : ''}
                    <p>${escapeHtml(element.beschreibung)}</p>
                    <span class="distance-badge" id="distance-${element.id}">${distance}</span>
                    <div class="element-actions">
                        ${element.audio ? `
                        <button class="btn btn-audio" id="audio-btn-${element.id}"
                            data-element-id="${element.id}" title="Audio abspielen">
                            <span class="audio-icon">🔊</span> Audio abspielen
                        </button>
                        ` : ''}
                        <label class="checkbox-label">
                            <input type="checkbox"
                                id="checkbox-${element.id}"
                                data-element-id="${element.id}"
                                ${isVisited ? 'checked' : ''}>
                            <span>Als besucht markieren</span>
                        </label>
                        <button class="btn btn-primary ${showManualButton ? '' : 'hidden'}"
                            id="manual-trigger-${element.id}"
                            data-element-id="${element.id}">
                            📍 Mehr erfahren ${showManualButton ? `(${Math.round(dist)} m entfernt)` : ''}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Event-Listener für Checkbox programmatisch hinzufügen
        // Verwende querySelector innerhalb von elementDiv für isolierte Suche
        const checkbox = elementDiv.querySelector('input[type="checkbox"]');
        if (checkbox) {
            // Stelle sicher, dass data-element-id korrekt gesetzt ist
            checkbox.dataset.elementId = element.id;

            checkbox.addEventListener('change', function(event) {
                // Verhindere Event-Propagation
                event.stopPropagation();

                const elemId = this.dataset.elementId;
                console.log('Checkbox changed for element:', elemId, 'Checked:', this.checked);

                // Sofort togglen ohne auf async zu warten
                toggleVisited(elemId);
            });
        } else {
            console.error('Checkbox not found for element:', element.id);
        }

        // Event-Listener für Button programmatisch hinzufügen
        const button = elementDiv.querySelector(`#manual-trigger-${element.id}`);
        if (button) {
            button.addEventListener('click', function() {
                const elemId = this.getAttribute('data-element-id');
                console.log('Manual trigger clicked for element:', elemId);
                manualTrigger(elemId);
            });
        }

        // Event-Listener für Audio-Button programmatisch hinzufügen
        const audioButton = elementDiv.querySelector(`#audio-btn-${element.id}`);
        if (audioButton) {
            audioButton.addEventListener('click', function() {
                const elemId = this.getAttribute('data-element-id');
                toggleAudio(elemId);
            });
        }

        elementsContainer.appendChild(elementDiv);
    });
}

// Element manuell als besucht/unbesucht markieren
window.toggleVisited = function(elementId) {
    console.log('=== toggleVisited START ===');
    console.log('Element ID:', elementId);
    console.log('visitedElements before:', Array.from(visitedElements));

    // Validierung: elementId muss definiert sein
    if (!elementId || elementId === 'undefined') {
        console.error('Invalid elementId:', elementId);
        return;
    }

    // Toggle visited state
    const wasVisited = visitedElements.has(elementId);
    if (wasVisited) {
        visitedElements.delete(elementId);
        console.log('Removed', elementId, 'from visitedElements');
    } else {
        visitedElements.add(elementId);
        console.log('Added', elementId, 'to visitedElements');
    }
    const isNowVisited = visitedElements.has(elementId);

    console.log('visitedElements after:', Array.from(visitedElements));
    saveVisitedElements();

    // Nur die spezifische Checkbox aktualisieren
    const checkbox = document.getElementById(`checkbox-${elementId}`);
    if (checkbox) {
        checkbox.checked = isNowVisited;
        console.log('Updated checkbox checked state to:', isNowVisited);
    } else {
        console.warn('Checkbox not found for element:', elementId);
    }

    // Element-Styling aktualisieren
    const elementDiv = document.getElementById(`element-${elementId}`);
    if (elementDiv) {
        elementDiv.className = isNowVisited ? 'element-marker visited' : 'element-marker';
        console.log('Updated element className to:', elementDiv.className);
    } else {
        console.warn('Element div not found for:', elementId);
    }

    // Marker auf der Karte asynchron aktualisieren (ohne await, um UI-Blockierung zu vermeiden)
    Promise.resolve().then(async () => {
        markersLayer.clearMarkers();
        updateUserMarker();
        await addTourMarkers();
        console.log('Map markers updated');
    });

    console.log('=== toggleVisited END ===');
}

// Manueller Trigger für Station
window.manualTrigger = async function(elementId) {
    const element = tourData.elemente.find(e => e.id === elementId);
    if (!element) return;

    await markElementAsVisited(element);
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
// Verwende 'pagehide' statt 'beforeunload' (moderne Best Practice)
window.addEventListener('pagehide', () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
    // Stoppe Audio-Wiedergabe
    stopAudio();
});
