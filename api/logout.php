<?php
// Logout-API
require_once 'auth.php';

header('Content-Type: application/json; charset=UTF-8');

logout();

echo json_encode([
    'success' => true,
    'message' => 'Logout erfolgreich'
]);
