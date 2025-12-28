<?php
// Image-Proxy für externe Bilder (CORS-Workaround)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    exit('Missing URL parameter');
}

// Validierung: Nur HTTP(S) URLs erlauben
if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('/^https?:\/\//i', $url)) {
    http_response_code(400);
    exit('Invalid URL');
}

// Bild vom externen Server laden
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; ImageProxy/1.0)');

// Header-Callback um Content-Type zu erhalten
$contentType = 'application/octet-stream';
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$contentType) {
    $len = strlen($header);
    $header = explode(':', $header, 2);
    if (count($header) >= 2) {
        $name = strtolower(trim($header[0]));
        if ($name === 'content-type') {
            $contentType = trim($header[1]);
        }
    }
    return $len;
});

$imageData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($imageData === false || $httpCode !== 200) {
    error_log("Image proxy error: HTTP $httpCode, $error for URL: $url");
    http_response_code($httpCode ?: 502);
    exit('Failed to fetch image');
}

// Content-Type setzen
header('Content-Type: ' . $contentType);

// Cache-Header für Performance
header('Cache-Control: public, max-age=86400'); // 24 Stunden
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');

// Bild ausgeben
echo $imageData;
