<?php
// Konfigurationsdatei für die API

// CORS-Header für lokale Entwicklung und Cross-Origin Requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Preflight-Request behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Pfad zur JSON-Datendatei
define('DATA_FILE', __DIR__ . '/../data/tours.json');

// Hilfsfunktion: JSON-Daten laden
function loadToursData() {
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    $jsonContent = file_get_contents(DATA_FILE);
    return json_decode($jsonContent, true) ?: [];
}

// Hilfsfunktion: JSON-Daten speichern
function saveToursData($data) {
    $jsonContent = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents(DATA_FILE, $jsonContent) !== false;
}

// Hilfsfunktion: Eindeutige ID generieren
function generateId($prefix = '') {
    return $prefix . uniqid() . '-' . bin2hex(random_bytes(4));
}

// Hilfsfunktion: JSON-Response senden
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

// Hilfsfunktion: Fehler-Response senden
function sendError($message, $statusCode = 400) {
    sendJsonResponse(['error' => $message], $statusCode);
}
