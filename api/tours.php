<?php
// Error Reporting für Debugging aktivieren
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Request Body parsen
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Log für Debugging
error_log("API Request: $method " . $_SERVER['REQUEST_URI']);
error_log("Raw Input: " . substr($rawInput, 0, 200));

// Route: GET /api/tours.php - Alle Touren abrufen
if ($method === 'GET' && !isset($_GET['id'])) {
    $tours = loadToursData();
    sendJsonResponse($tours);
}

// Route: GET /api/tours.php?id=xyz - Eine bestimmte Tour abrufen
if ($method === 'GET' && isset($_GET['id'])) {
    $tours = loadToursData();
    $tourId = $_GET['id'];

    foreach ($tours as $tour) {
        if ($tour['id'] === $tourId) {
            sendJsonResponse($tour);
        }
    }

    sendError('Tour nicht gefunden', 404);
}

// Route: POST /api/tours.php - Neue Tour erstellen
if ($method === 'POST') {
    if (!$input || !isset($input['name']) || !isset($input['beschreibung'])) {
        sendError('Name und Beschreibung sind erforderlich');
    }

    $tours = loadToursData();

    // Neue Tour erstellen
    $newTour = [
        'id' => generateId('tour-'),
        'name' => $input['name'],
        'beschreibung' => $input['beschreibung'],
        'bild' => $input['bild'] ?? '',
        'elemente' => $input['elemente'] ?? []
    ];

    // IDs für Elemente generieren falls nicht vorhanden
    foreach ($newTour['elemente'] as &$element) {
        if (!isset($element['id'])) {
            $element['id'] = generateId('elem-');
        }
    }

    $tours[] = $newTour;

    if (saveToursData($tours)) {
        sendJsonResponse($newTour, 201);
    } else {
        sendError('Fehler beim Speichern der Tour', 500);
    }
}

// Route: PUT /api/tours.php?id=xyz - Tour aktualisieren
if ($method === 'PUT' && isset($_GET['id'])) {
    if (!$input) {
        sendError('Keine Daten zum Aktualisieren bereitgestellt');
    }

    $tours = loadToursData();
    $tourId = $_GET['id'];
    $found = false;

    foreach ($tours as &$tour) {
        if ($tour['id'] === $tourId) {
            // Tour aktualisieren
            $tour['name'] = $input['name'] ?? $tour['name'];
            $tour['beschreibung'] = $input['beschreibung'] ?? $tour['beschreibung'];
            $tour['bild'] = $input['bild'] ?? $tour['bild'];
            $tour['elemente'] = $input['elemente'] ?? $tour['elemente'];

            // IDs für neue Elemente generieren
            foreach ($tour['elemente'] as &$element) {
                if (!isset($element['id'])) {
                    $element['id'] = generateId('elem-');
                }
            }

            $found = true;
            $updatedTour = $tour;
            break;
        }
    }

    if (!$found) {
        sendError('Tour nicht gefunden', 404);
    }

    if (saveToursData($tours)) {
        sendJsonResponse($updatedTour);
    } else {
        sendError('Fehler beim Aktualisieren der Tour', 500);
    }
}

// Route: DELETE /api/tours.php?id=xyz - Tour löschen
if ($method === 'DELETE' && isset($_GET['id'])) {
    $tours = loadToursData();
    $tourId = $_GET['id'];
    $initialCount = count($tours);

    $tours = array_values(array_filter($tours, function($tour) use ($tourId) {
        return $tour['id'] !== $tourId;
    }));

    if (count($tours) === $initialCount) {
        sendError('Tour nicht gefunden', 404);
    }

    if (saveToursData($tours)) {
        sendJsonResponse(['message' => 'Tour erfolgreich gelöscht']);
    } else {
        sendError('Fehler beim Löschen der Tour', 500);
    }
}

// Falls keine Route matched
sendError('Ungültige Anfrage', 400);
