<?php
// Authentifizierungs-Modul für Admin-Bereich
session_start();

// Passwort (Plain-Text für einfache Implementierung)
// In Production sollte ein Hash verwendet werden
define('ADMIN_PASSWORD', 'Barbara');

// Prüfen ob Benutzer eingeloggt ist
function isLoggedIn() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

// Login-Funktion
function login($password) {
    if ($password === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['login_time'] = time();
        return true;
    }
    return false;
}

// Logout-Funktion
function logout() {
    $_SESSION = array();
    session_destroy();
}

// Login-Seite erzwingen (für HTML-Seiten)
function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: /login.html?redirect=' . urlencode($_SERVER['REQUEST_URI']));
        exit();
    }
}

// API-Authentifizierung prüfen (für POST, PUT, DELETE)
function requireApiAuth() {
    // Session-basiert
    if (isLoggedIn()) {
        return true;
    }

    // HTTP Basic Auth als Fallback
    if (isset($_SERVER['PHP_AUTH_PW']) && $_SERVER['PHP_AUTH_PW'] === ADMIN_PASSWORD) {
        return true;
    }

    // Fehler zurückgeben
    http_response_code(401);
    header('WWW-Authenticate: Basic realm="Admin API"');
    echo json_encode(['error' => 'Authentifizierung erforderlich']);
    exit();
}
