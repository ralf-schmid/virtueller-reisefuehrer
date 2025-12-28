<?php
// Test-Script zum Prüfen der Schreibrechte und API-Funktionalität
header('Content-Type: application/json; charset=UTF-8');

$dataFile = __DIR__ . '/../data/tours.json';
$result = [
    'status' => 'ok',
    'tests' => [],
    'errors' => []
];

// 1. Datei existiert?
$fileTest = [
    'name' => 'Datei-Check',
    'path' => $dataFile,
    'exists' => file_exists($dataFile),
    'readable' => false,
    'writable' => false,
    'size' => 0
];

if (file_exists($dataFile)) {
    $fileTest['readable'] = is_readable($dataFile);
    $fileTest['writable'] = is_writable($dataFile);
    $fileTest['size'] = filesize($dataFile);
    $fileTest['permissions'] = substr(sprintf('%o', fileperms($dataFile)), -4);
} else {
    $result['errors'][] = 'tours.json existiert nicht';
    $result['status'] = 'error';
}
$result['tests']['file'] = $fileTest;

// 2. Verzeichnis-Rechte
$dataDir = dirname($dataFile);
$dirTest = [
    'name' => 'Verzeichnis-Check',
    'path' => $dataDir,
    'exists' => is_dir($dataDir),
    'readable' => is_readable($dataDir),
    'writable' => is_writable($dataDir)
];

if (is_dir($dataDir)) {
    $dirTest['permissions'] = substr(sprintf('%o', fileperms($dataDir)), -4);
}

if (!$dirTest['writable']) {
    $result['errors'][] = 'Data-Verzeichnis ist nicht schreibbar';
    $result['status'] = 'error';
}
$result['tests']['directory'] = $dirTest;

// 3. Schreib-Test
$writeTest = [
    'name' => 'Schreib-Test',
    'success' => false,
    'bytes_written' => 0,
    'read_back' => false,
    'json_valid' => false
];

$testData = [
    [
        'id' => 'test-' . time(),
        'name' => 'Test Tour',
        'beschreibung' => 'Automatischer Test um ' . date('H:i:s'),
        'bild' => '',
        'elemente' => []
    ]
];

// Direkt file_put_contents verwenden (ohne API-Funktion)
$jsonContent = json_encode($testData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
$writeResult = @file_put_contents($dataFile, $jsonContent);

if ($writeResult !== false) {
    $writeTest['success'] = true;
    $writeTest['bytes_written'] = $writeResult;

    // Lesen zur Verifikation
    $readBack = @file_get_contents($dataFile);
    if ($readBack !== false) {
        $writeTest['read_back'] = true;
        $decoded = json_decode($readBack, true);
        $writeTest['json_valid'] = ($decoded !== null);
        if (!$writeTest['json_valid']) {
            $result['errors'][] = 'JSON konnte nicht dekodiert werden: ' . json_last_error_msg();
            $result['status'] = 'error';
        }
    } else {
        $result['errors'][] = 'Datei konnte nicht zurückgelesen werden';
        $result['status'] = 'error';
    }
} else {
    $lastError = error_get_last();
    $writeTest['error'] = $lastError ? $lastError['message'] : 'Unbekannter Fehler';
    $result['errors'][] = 'Schreiben fehlgeschlagen: ' . $writeTest['error'];
    $result['status'] = 'error';
}
$result['tests']['write'] = $writeTest;

// 4. Prozess-Info
$result['process'] = [
    'php_user' => function_exists('posix_getpwuid') && function_exists('posix_geteuid')
        ? posix_getpwuid(posix_geteuid())['name']
        : get_current_user(),
    'php_uid' => function_exists('posix_geteuid') ? posix_geteuid() : 'N/A',
    'php_gid' => function_exists('posix_getegid') ? posix_getegid() : 'N/A'
];

// 5. API-Test (tours.php laden)
$apiTest = [
    'name' => 'API-Check',
    'config_loadable' => false,
    'tours_loadable' => false,
    'save_test' => false
];

try {
    require_once __DIR__ . '/config.php';
    $apiTest['config_loadable'] = true;

    // Tours laden testen
    $tours = loadToursData();
    $apiTest['tours_loadable'] = true;
    $apiTest['tour_count'] = count($tours);

    // saveToursData() testen mit echter API-Funktion
    $testTour = [
        'id' => 'api-test-' . time(),
        'name' => 'API Test Tour',
        'beschreibung' => 'Test via saveToursData() um ' . date('H:i:s'),
        'bild' => '',
        'elemente' => []
    ];
    $saveResult = saveToursData([$testTour]);
    $apiTest['save_test'] = $saveResult['success'];
    if (!$saveResult['success']) {
        $apiTest['save_error'] = $saveResult['error'];
        $result['errors'][] = 'saveToursData() fehlgeschlagen: ' . $saveResult['error'];
        $result['status'] = 'error';
    }
} catch (Exception $e) {
    $apiTest['error'] = $e->getMessage();
    $result['errors'][] = 'API-Fehler: ' . $e->getMessage();
    $result['status'] = 'error';
}
$result['tests']['api'] = $apiTest;

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
