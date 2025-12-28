<?php
// S3-Konfiguration für direkte Integration
// Beispiel-Code - kann bei Bedarf implementiert werden

// Mit AWS SDK:
// require 'vendor/autoload.php';
// use Aws\S3\S3Client;

// $s3 = new S3Client([
//     'version' => 'latest',
//     'region'  => 'eu-central-1',
//     'credentials' => [
//         'key'    => getenv('AWS_ACCESS_KEY_ID'),
//         'secret' => getenv('AWS_SECRET_ACCESS_KEY'),
//     ]
// ]);

// Touren von S3 laden:
// $result = $s3->getObject([
//     'Bucket' => 'ihr-bucket',
//     'Key'    => 'tours.json'
// ]);
// $tours = json_decode($result['Body'], true);

// Touren zu S3 speichern:
// $s3->putObject([
//     'Bucket' => 'ihr-bucket',
//     'Key'    => 'tours.json',
//     'Body'   => json_encode($tours),
//     'ContentType' => 'application/json'
// ]);

// Aktuelle Konfiguration (Dateisystem)
define('DATA_FILE', __DIR__ . '/../data/tours.json');

// Für S3-Integration aktivieren Sie die oberen Zeilen
// und kommentieren Sie die Zeile darüber aus
