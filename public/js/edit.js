// Edit-JavaScript für die Bearbeitungsseite
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api/tours.php'
    : '/api/tours.php';

// DOM-Elemente
const tourForm = document.getElementById('tour-form');
const pageTitle = document.getElementById('page-title');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const elementsContainer = document.getElementById('elements-container');
const noElementsDiv = document.getElementById('no-elements');
const addElementBtn = document.getElementById('add-element-btn');

// Globale Variablen
let tourId = null;
let elements = [];
let elementCounter = 0;

// URL-Parameter auslesen
const urlParams = new URLSearchParams(window.location.search);
const editTourId = urlParams.get('id');

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    if (editTourId) {
        tourId = editTourId;
        pageTitle.textContent = 'Tour bearbeiten';
        loadTour();
    } else {
        pageTitle.textContent = 'Neue Tour erstellen';
    }

    // Event-Listener
    addElementBtn.addEventListener('click', addElement);
    tourForm.addEventListener('submit', saveTour);
});

// Tour laden (im Bearbeitungsmodus)
async function loadTour() {
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}?id=${encodeURIComponent(tourId)}`);

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const tour = await response.json();

        // Formular mit Tour-Daten füllen
        document.getElementById('tour-name').value = tour.name;
        document.getElementById('tour-description').value = tour.beschreibung;
        document.getElementById('tour-image').value = tour.bild || '';

        // Elemente laden
        if (tour.elemente && tour.elemente.length > 0) {
            elements = tour.elemente;
            elements.forEach(element => {
                addElement(element);
            });
        }

        showLoading(false);

    } catch (error) {
        console.error('Fehler beim Laden der Tour:', error);
        showLoading(false);
        showError('Fehler beim Laden der Tour. Bitte versuchen Sie es später erneut.');
    }
}

// Element hinzufügen
function addElement(elementData = null) {
    const elementId = elementData ? elementData.id : `element-${++elementCounter}`;

    const elementCard = document.createElement('div');
    elementCard.className = 'element-card';
    elementCard.id = `element-card-${elementId}`;

    elementCard.innerHTML = `
        <h4>
            <span>Station ${elementsContainer.children.length + 1}</span>
            <button type="button" class="btn btn-danger" onclick="removeElement('${elementId}')">
                🗑️ Entfernen
            </button>
        </h4>

        <div class="form-group">
            <label>Name der Station *</label>
            <input type="text" class="element-name" data-id="${elementId}" required
                   value="${elementData ? escapeHtml(elementData.name) : ''}"
                   placeholder="z.B. Altes Rathaus">
        </div>

        <div class="form-group">
            <label>Titel *</label>
            <input type="text" class="element-titel" data-id="${elementId}" required
                   value="${elementData ? escapeHtml(elementData.titel) : ''}"
                   placeholder="z.B. Das historische Rathaus von Odenthal">
        </div>

        <div class="form-group">
            <label>Beschreibung *</label>
            <textarea class="element-beschreibung" data-id="${elementId}" required
                      placeholder="Detaillierte Beschreibung der Station...">${elementData ? escapeHtml(elementData.beschreibung) : ''}</textarea>
        </div>

        <div class="form-group">
            <label>Bild-URL</label>
            <input type="url" class="element-bild" data-id="${elementId}"
                   value="${elementData ? escapeHtml(elementData.bild || '') : ''}"
                   placeholder="https://example.com/image.jpg">
        </div>

        <div class="form-group">
            <label>Audio-Datei (MP3)</label>
            <input type="file" class="element-audio-file" data-id="${elementId}" accept="audio/mp3,audio/mpeg">
            <small style="color: #666;">
                ${elementData && elementData.audio ? `
                    Aktuelle Datei: <a href="${escapeHtml(elementData.audio)}" target="_blank">Abspielen</a> |
                    <span id="audio-upload-status-${elementId}"></span>
                ` : 'MP3-Datei hochladen für Audiowiedergabe'}
            </small>
            <input type="hidden" class="element-audio" data-id="${elementId}"
                   value="${elementData ? escapeHtml(elementData.audio || '') : ''}">
        </div>

        <div class="form-group">
            <label>Link / URL</label>
            <input type="url" class="element-link" data-id="${elementId}"
                   value="${elementData ? escapeHtml(elementData.link || '') : ''}"
                   placeholder="https://wikipedia.org/...">
            <small style="color: #666;">Wird automatisch geöffnet bei Annäherung</small>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Breitengrad (Latitude) *</label>
                <input type="number" step="any" class="element-lat" data-id="${elementId}" required
                       value="${elementData && elementData.geolokation ? elementData.geolokation.lat : ''}"
                       placeholder="51.0344">
                <small style="color: #666;">z.B. 51.0344</small>
            </div>

            <div class="form-group">
                <label>Längengrad (Longitude) *</label>
                <input type="number" step="any" class="element-lon" data-id="${elementId}" required
                       value="${elementData && elementData.geolokation ? elementData.geolokation.lon : ''}"
                       placeholder="7.1089">
                <small style="color: #666;">z.B. 7.1089</small>
            </div>
        </div>

        <div class="form-group">
            <small style="color: #666;">
                💡 Tipp: Koordinaten können Sie z.B. auf
                <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap.org</a>
                finden (Rechtsklick → "Adresse anzeigen")
            </small>
        </div>
    `;

    elementsContainer.appendChild(elementCard);
    noElementsDiv.classList.add('hidden');

    // Event-Listener für Audio-Upload hinzufügen
    const audioFileInput = elementCard.querySelector('.element-audio-file');
    if (audioFileInput) {
        audioFileInput.addEventListener('change', async (e) => {
            await handleAudioUpload(e.target, elementId);
        });
    }

    updateElementNumbers();
}

// Element entfernen
function removeElement(elementId) {
    const elementCard = document.getElementById(`element-card-${elementId}`);
    if (elementCard) {
        if (confirm('Möchten Sie diese Station wirklich entfernen?')) {
            elementCard.remove();
            updateElementNumbers();

            if (elementsContainer.children.length === 0) {
                noElementsDiv.classList.remove('hidden');
            }
        }
    }
}

// Element-Nummern aktualisieren
function updateElementNumbers() {
    const elementCards = elementsContainer.querySelectorAll('.element-card');
    elementCards.forEach((card, index) => {
        const header = card.querySelector('h4 span');
        if (header) {
            header.textContent = `Station ${index + 1}`;
        }
    });
}

// Tour speichern
async function saveTour(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('tour-name').value.trim(),
        beschreibung: document.getElementById('tour-description').value.trim(),
        bild: document.getElementById('tour-image').value.trim(),
        elemente: []
    };

    // Elemente sammeln
    const elementCards = elementsContainer.querySelectorAll('.element-card');

    elementCards.forEach(card => {
        const elementId = card.querySelector('.element-name').dataset.id;

        const element = {
            id: elementId,
            name: card.querySelector('.element-name').value.trim(),
            titel: card.querySelector('.element-titel').value.trim(),
            beschreibung: card.querySelector('.element-beschreibung').value.trim(),
            bild: card.querySelector('.element-bild').value.trim(),
            audio: card.querySelector('.element-audio').value.trim(),
            link: card.querySelector('.element-link').value.trim(),
            geolokation: {
                lat: parseFloat(card.querySelector('.element-lat').value),
                lon: parseFloat(card.querySelector('.element-lon').value)
            }
        };

        formData.elemente.push(element);
    });

    // Validierung
    if (!formData.name || !formData.beschreibung) {
        showError('Bitte füllen Sie alle Pflichtfelder aus!');
        return;
    }

    // Speichern
    showLoading(true);
    hideMessages();

    try {
        let response;

        if (tourId) {
            // Tour aktualisieren
            response = await fetch(`${API_BASE}?id=${encodeURIComponent(tourId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Neue Tour erstellen
            response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        // Response Text für Debugging loggen
        const responseText = await response.text();
        console.log('API Response:', responseText);

        const result = JSON.parse(responseText);

        showLoading(false);
        showSuccess(tourId ? 'Tour erfolgreich aktualisiert!' : 'Tour erfolgreich erstellt!');

        // Nach kurzer Verzögerung zur Verwaltungsseite wechseln
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);

    } catch (error) {
        console.error('Fehler beim Speichern der Tour:', error);
        showLoading(false);
        showError('Fehler beim Speichern der Tour. Bitte versuchen Sie es später erneut.');
    }
}

// Audio-Upload behandeln
async function handleAudioUpload(fileInput, elementId) {
    const file = fileInput.files[0];
    if (!file) return;

    // Validierung: nur MP3
    if (!file.type.match('audio/(mpeg|mp3)')) {
        alert('Bitte nur MP3-Dateien hochladen!');
        fileInput.value = '';
        return;
    }

    // Validierung: max 10 MB
    if (file.size > 10 * 1024 * 1024) {
        alert('Die Audio-Datei darf maximal 10 MB groß sein!');
        fileInput.value = '';
        return;
    }

    const statusSpan = document.getElementById(`audio-upload-status-${elementId}`);
    if (statusSpan) {
        statusSpan.textContent = 'Uploading...';
        statusSpan.style.color = '#666';
    }

    try {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('elementId', elementId);

        const response = await fetch('/api/upload_audio.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Speichere den Pfad im hidden input
            const audioInput = document.querySelector(`.element-audio[data-id="${elementId}"]`);
            if (audioInput) {
                audioInput.value = result.path;
            }

            if (statusSpan) {
                statusSpan.innerHTML = `✅ <a href="${result.path}" target="_blank">Hochgeladen</a>`;
                statusSpan.style.color = 'green';
            }
        } else {
            throw new Error(result.error || 'Upload fehlgeschlagen');
        }
    } catch (error) {
        console.error('Audio-Upload Fehler:', error);
        alert('Fehler beim Hochladen der Audio-Datei: ' + error.message);
        fileInput.value = '';

        if (statusSpan) {
            statusSpan.textContent = '❌ Fehler';
            statusSpan.style.color = 'red';
        }
    }
}

// Hilfsfunktionen
function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
