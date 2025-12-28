<?php
// Test-Script zum Prüfen der Schreibrechte

$dataFile = __DIR__ . '/../data/tours.json';

echo "=== Tour-Speicher Test ===\n\n";

// 1. Datei existiert?
echo "1. Datei-Check:\n";
echo "   Pfad: $dataFile\n";
echo "   Existiert: " . (file_exists($dataFile) ? "✓ JA" : "✗ NEIN") . "\n";

if (file_exists($dataFile)) {
    echo "   Lesbar: " . (is_readable($dataFile) ? "✓ JA" : "✗ NEIN") . "\n";
    echo "   Schreibbar: " . (is_writable($dataFile) ? "✓ JA" : "✗ NEIN") . "\n";
    echo "   Größe: " . filesize($dataFile) . " Bytes\n";
}

// 2. Verzeichnis-Rechte
echo "\n2. Verzeichnis-Check:\n";
$dataDir = dirname($dataFile);
echo "   Pfad: $dataDir\n";
echo "   Existiert: " . (is_dir($dataDir) ? "✓ JA" : "✗ NEIN") . "\n";
echo "   Lesbar: " . (is_readable($dataDir) ? "✓ JA" : "✗ NEIN") . "\n";
echo "   Schreibbar: " . (is_writable($dataDir) ? "✓ JA" : "✗ NEIN") . "\n";

// 3. Schreib-Test
echo "\n3. Schreib-Test:\n";
$testData = [
    [
        'id' => 'test-tour',
        'name' => 'Test Tour',
        'beschreibung' => 'Test Beschreibung',
        'bild' => '',
        'elemente' => []
    ]
];

$jsonContent = json_encode($testData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$result = @file_put_contents($dataFile, $jsonContent);

if ($result !== false) {
    echo "   Schreiben: ✓ ERFOLGREICH ($result Bytes)\n";

    // Lesen zur Verifikation
    $readBack = @file_get_contents($dataFile);
    if ($readBack !== false) {
        echo "   Lesen: ✓ ERFOLGREICH\n";
        echo "   Inhalt valide: " . (json_decode($readBack) !== null ? "✓ JA" : "✗ NEIN") . "\n";
    } else {
        echo "   Lesen: ✗ FEHLGESCHLAGEN\n";
    }
} else {
    echo "   Schreiben: ✗ FEHLGESCHLAGEN\n";
    echo "   Fehler: " . error_get_last()['message'] . "\n";
}

// 4. Benutzer-Info
echo "\n4. Prozess-Info:\n";
echo "   PHP User: " . (function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : get_current_user()) . "\n";
echo "   PHP UID: " . (function_exists('posix_geteuid') ? posix_geteuid() : 'N/A') . "\n";
echo "   PHP GID: " . (function_exists('posix_getegid') ? posix_getegid() : 'N/A') . "\n";

echo "\n=== Test abgeschlossen ===\n";
