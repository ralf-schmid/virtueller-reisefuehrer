// Admin-JavaScript für die Verwaltungsseite
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api/tours.php'
    : '/api/tours.php';

// DOM-Elemente
const loadingElement = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const toursTable = document.getElementById('tours-table');
const toursTbody = document.getElementById('tours-tbody');
const noToursElement = document.getElementById('no-tours');
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

// Globale Variable für zu löschende Tour
let tourToDelete = null;

// Beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
    loadTours();

    // Event-Listener für Modal
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);
});

// Touren laden
async function loadTours() {
    showLoading(true);
    hideMessages();

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

// Touren in Tabelle anzeigen
function displayTours(tours) {
    toursTbody.innerHTML = '';
    toursTable.classList.remove('hidden');
    noToursElement.classList.add('hidden');

    tours.forEach(tour => {
        const row = createTourRow(tour);
        toursTbody.appendChild(row);
    });
}

// Tabellenzeile für Tour erstellen
function createTourRow(tour) {
    const tr = document.createElement('tr');

    const elementCount = tour.elemente ? tour.elemente.length : 0;
    const shortDescription = tour.beschreibung.length > 100
        ? tour.beschreibung.substring(0, 100) + '...'
        : tour.beschreibung;

    tr.innerHTML = `
        <td><strong>${escapeHtml(tour.name)}</strong></td>
        <td>${escapeHtml(shortDescription)}</td>
        <td class="text-center">${elementCount}</td>
        <td class="actions">
            <a href="tour.html?id=${encodeURIComponent(tour.id)}" class="btn btn-secondary" title="Tour anzeigen">
                👁️ Ansehen
            </a>
            <a href="edit.html?id=${encodeURIComponent(tour.id)}" class="btn btn-accent" title="Tour bearbeiten">
                ✏️ Bearbeiten
            </a>
            <button class="btn btn-danger" onclick="deleteTour('${tour.id.replace(/'/g, "\\'")}', '${escapeHtml(tour.name).replace(/'/g, "\\'")}')">
                🗑️ Löschen
            </button>
        </td>
    `;

    return tr;
}

// Tour löschen (Bestätigung anzeigen)
function deleteTour(tourId, tourName) {
    tourToDelete = { id: tourId, name: tourName };
    openDeleteModal();
}

// Löschung bestätigen
async function confirmDelete() {
    if (!tourToDelete) return;

    closeDeleteModal();
    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}?id=${encodeURIComponent(tourToDelete.id)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const result = await response.json();

        showLoading(false);
        showSuccess(`Tour "${tourToDelete.name}" wurde erfolgreich gelöscht.`);

        // Liste neu laden
        setTimeout(() => {
            loadTours();
        }, 1500);

    } catch (error) {
        console.error('Fehler beim Löschen der Tour:', error);
        showLoading(false);
        showError('Fehler beim Löschen der Tour. Bitte versuchen Sie es später erneut.');
    }

    tourToDelete = null;
}

// Modal öffnen
function openDeleteModal() {
    deleteModal.classList.remove('hidden');
    deleteModal.style.display = 'flex';
}

// Modal schließen
function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteModal.style.display = 'none';
    tourToDelete = null;
}

// Hilfsfunktionen
function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');

    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');

    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 5000);
}

function hideMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

function showNoTours() {
    noToursElement.classList.remove('hidden');
    toursTable.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
