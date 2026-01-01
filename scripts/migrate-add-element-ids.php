#!/usr/bin/env php
<?php
/**
 * Migration Script: Fügt allen Tour-Elementen IDs hinzu, falls sie fehlen
 */

$dataFile = __DIR__ . '/../data/tours.json';

echo "🔧 Migration: Element IDs hinzufügen\n";
echo "=====================================\n\n";

// Daten laden
if (!file_exists($dataFile)) {
    die("❌ FEHLER: $dataFile nicht gefunden!\n");
}

$json = file_get_contents($dataFile);
$tours = json_decode($json, true);

if (!is_array($tours)) {
    die("❌ FEHLER: Ungültiges JSON in $dataFile\n");
}

// Backup erstellen
$backupFile = $dataFile . '.backup-' . date('Y-m-d-His');
file_put_contents($backupFile, $json);
echo "✅ Backup erstellt: $backupFile\n\n";

// ID-Generator
function generateId($prefix = 'elem-') {
    return $prefix . bin2hex(random_bytes(8));
}

// Statistiken
$stats = [
    'tours_total' => count($tours),
    'elements_total' => 0,
    'elements_without_id' => 0,
    'ids_added' => 0
];

// Alle Touren durchgehen
foreach ($tours as $tourIndex => &$tour) {
    echo "📍 Tour: {$tour['name']} (ID: {$tour['id']})\n";

    if (!isset($tour['elemente']) || !is_array($tour['elemente'])) {
        echo "   ⚠️  Keine Elemente vorhanden\n\n";
        continue;
    }

    foreach ($tour['elemente'] as $elemIndex => &$element) {
        $stats['elements_total']++;

        // Prüfe ob ID fehlt oder ungültig ist
        if (!isset($element['id']) || empty($element['id']) || $element['id'] === 'undefined') {
            $stats['elements_without_id']++;

            // Generiere ID basierend auf dem Namen
            $baseName = isset($element['name']) ? $element['name'] : "element-$elemIndex";
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $baseName));
            $slug = trim($slug, '-');

            // Stelle sicher dass die ID eindeutig ist
            $newId = $slug;
            $counter = 1;
            while (elementIdExists($tours, $newId)) {
                $newId = "$slug-$counter";
                $counter++;
            }

            $element['id'] = $newId;
            $stats['ids_added']++;

            echo "   ➕ Element '{$element['name']}': ID hinzugefügt -> '$newId'\n";
        } else {
            echo "   ✓  Element '{$element['name']}': ID vorhanden -> '{$element['id']}'\n";
        }
    }

    echo "\n";
}

// Prüfe ob eine ID bereits existiert
function elementIdExists($tours, $id) {
    foreach ($tours as $tour) {
        if (isset($tour['elemente']) && is_array($tour['elemente'])) {
            foreach ($tour['elemente'] as $element) {
                if (isset($element['id']) && $element['id'] === $id) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Daten speichern
$newJson = json_encode($tours, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (file_put_contents($dataFile, $newJson) === false) {
    die("❌ FEHLER: Konnte $dataFile nicht schreiben!\n");
}

// Statistiken ausgeben
echo "=====================================\n";
echo "📊 STATISTIKEN:\n";
echo "   Touren gesamt: {$stats['tours_total']}\n";
echo "   Elemente gesamt: {$stats['elements_total']}\n";
echo "   Elemente ohne ID: {$stats['elements_without_id']}\n";
echo "   IDs hinzugefügt: {$stats['ids_added']}\n";
echo "\n";

if ($stats['ids_added'] > 0) {
    echo "✅ Migration erfolgreich! {$stats['ids_added']} IDs hinzugefügt.\n";
} else {
    echo "✅ Keine Änderungen nötig - alle Elemente haben bereits IDs.\n";
}

echo "\n💾 Datei gespeichert: $dataFile\n";
