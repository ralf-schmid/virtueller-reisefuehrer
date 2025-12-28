// Haupt-JavaScript für die Auswahlseite
// API-Basis-URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api/tours.php'
    : '/api/tours.php';

// DOM-Elemente
const toursContainer = document.getElementById('tours-container');
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const noToursElement = document.getElementById('no-tours');

// Beim Laden der Seite: Touren abrufen
document.addEventListener('DOMContentLoaded', () => {
    loadTours();
});

// Touren vom Server laden
async function loadTours() {
    showLoading(true);
    hideError();

    try {
        const response = await fetch(API_BASE);

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const tours = await response.json();

        showLoading(false);

        if (tours.length === 0) {
            showNoTours();
        } else {
            displayTours(tours);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Touren:', error);
        showLoading(false);
        showError('Fehler beim Laden der Touren. Bitte versuchen Sie es später erneut.');
    }
}

// Touren anzeigen
function displayTours(tours) {
    toursContainer.innerHTML = '';

    tours.forEach(tour => {
        const tourCard = createTourCard(tour);
        toursContainer.appendChild(tourCard);
    });
}

// Einzelne Tour-Karte erstellen
function createTourCard(tour) {
    const card = document.createElement('div');
    card.className = 'card';

    const elementCount = tour.elemente ? tour.elemente.length : 0;

    card.innerHTML = `
        ${tour.bild ? `<img src="${escapeHtml(tour.bild)}" alt="${escapeHtml(tour.name)}" width="400" height="300" onerror="this.src='https://via.placeholder.com/400x300/2C3E50/FFFFFF?text=Kein+Bild'" fetchpriority="high">` : ''}
        <h2>${escapeHtml(tour.name)}</h2>
        <p>${escapeHtml(tour.beschreibung)}</p>
        <p class="text-center" style="color: #666; font-size: 0.9rem;">
            📍 ${elementCount} ${elementCount === 1 ? 'Station' : 'Stationen'}
        </p>
        <a href="tour.html?id=${encodeURIComponent(tour.id)}" class="btn btn-primary btn-block">
            Tour starten
        </a>
    `;

    return card;
}

// Hilfsfunktionen
function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
    toursContainer.classList.toggle('hidden', show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function showNoTours() {
    noToursElement.classList.remove('hidden');
    toursContainer.classList.add('hidden');
}

// XSS-Schutz: HTML escapen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
