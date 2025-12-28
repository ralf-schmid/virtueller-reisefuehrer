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
        error_log("WARNING: Data file does not exist: " . DATA_FILE . " - returning empty array");
        return [];
    }

    $jsonContent = file_get_contents(DATA_FILE);
    if ($jsonContent === false) {
        error_log("ERROR: Failed to read data file: " . DATA_FILE);
        return [];
    }

    $data = json_decode($jsonContent, true);
    if ($data === null && $jsonContent !== 'null') {
        error_log("ERROR: JSON parsing failed: " . json_last_error_msg() . " - Content: " . substr($jsonContent, 0, 100));
        return [];
    }

    return $data ?: [];
}

// Hilfsfunktion: JSON-Daten speichern
function saveToursData($data) {
    // Verzeichnis prüfen
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) {
        error_log("ERROR: Data directory does not exist: $dir");
        return false;
    }
    if (!is_writable($dir)) {
        error_log("ERROR: Data directory is not writable: $dir");
        return false;
    }

    // JSON encodieren
    $jsonContent = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        error_log("ERROR: JSON encoding failed: " . json_last_error_msg());
        return false;
    }

    // Datei schreiben
    $result = file_put_contents(DATA_FILE, $jsonContent);
    if ($result === false) {
        $error = error_get_last();
        error_log("ERROR: Failed to write to file: " . DATA_FILE . " - " . ($error['message'] ?? 'Unknown error'));
        return false;
    }

    error_log("SUCCESS: Saved " . strlen($jsonContent) . " bytes to " . DATA_FILE);
    return true;
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
