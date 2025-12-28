<?php
// Prüfung ob Benutzer eingeloggt ist (für AJAX-Calls)
require_once 'auth.php';

header('Content-Type: application/json; charset=UTF-8');

if (isLoggedIn()) {
    echo json_encode([
        'authenticated' => true,
        'login_time' => $_SESSION['login_time'] ?? null
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        'authenticated' => false
    ]);
}
