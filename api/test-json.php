<?php
// Einfacher JSON-Test
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'message' => 'PHP works!',
    'timestamp' => time(),
    'php_version' => PHP_VERSION
]);
