<?php
/**
 * Audio-Upload API für Tour-Stationen
 * Speichert MP3-Dateien im data-Verzeichnis
 */

require_once 'config.php';

// Authentifizierung prüfen
session_start();
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Nicht authentifiziert']);
    exit;
}

header('Content-Type: application/json');

try {
    // Validierung: POST Request
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Nur POST-Requests erlaubt');
    }

    // Validierung: Datei vorhanden
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Keine Datei hochgeladen oder Upload-Fehler');
    }

    $file = $_FILES['audio'];
    $elementId = $_POST['elementId'] ?? uniqid('audio_');

    // Validierung: Dateityp
    $allowedMimes = ['audio/mpeg', 'audio/mp3'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedMimes)) {
        throw new Exception('Ungültiger Dateityp. Nur MP3-Dateien erlaubt.');
    }

    // Validierung: Dateigröße (max 10 MB)
    $maxSize = 10 * 1024 * 1024; // 10 MB
    if ($file['size'] > $maxSize) {
        throw new Exception('Datei zu groß. Maximal 10 MB erlaubt.');
    }

    // Dateiname generieren
    $extension = 'mp3';
    $filename = 'audio_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $elementId) . '_' . time() . '.' . $extension;

    // Zielverzeichnis: ../data/audio/
    $uploadDir = dirname(__DIR__) . '/data/audio';

    // Verzeichnis erstellen, falls nicht vorhanden
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Konnte Upload-Verzeichnis nicht erstellen');
        }
    }

    $targetPath = $uploadDir . '/' . $filename;

    // Datei verschieben
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Fehler beim Speichern der Datei');
    }

    // Relativer Pfad für die Ausgabe
    $relativePath = '/data/audio/' . $filename;

    // Erfolg
    echo json_encode([
        'success' => true,
        'path' => $relativePath,
        'filename' => $filename,
        'size' => $file['size']
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
