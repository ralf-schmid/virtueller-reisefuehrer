# S3-Integration Setup-Anleitung

Diese Anleitung zeigt, wie Sie das `data/` Verzeichnis mit einem S3-Bucket verbinden.

## 📋 Voraussetzungen

- AWS Account mit S3-Zugriff
- S3 Bucket erstellt
- Access Key und Secret Key mit Lese-/Schreibrechten auf den Bucket

## 🚀 Quick Start

**Hinweis:** Mounten Sie das `data/` Verzeichnis über Ihre Docker-Verwaltung. Diese Anleitung dient als Referenz für die manuelle S3-Konfiguration.

### Schritt 1: S3-Bucket erstellen (falls noch nicht vorhanden)

```bash
# Mit AWS CLI
aws s3 mb s3://virtueller-reisefuehrer-data --region eu-central-1

# Oder über AWS Console: https://console.aws.amazon.com/s3/
```

### Schritt 2: IAM-Benutzer erstellen und Rechte vergeben

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::virtueller-reisefuehrer-data"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::virtueller-reisefuehrer-data/*"
    }
  ]
}
```

### Schritt 3: Volume in Docker-Verwaltung konfigurieren

Konfigurieren Sie das `data/` Verzeichnis als persistentes Volume in Ihrer Docker-Verwaltung mit S3-Backend.

### Schritt 4: Anwendung starten

```bash
# Mit S3-Backend (über Docker-Verwaltung konfiguriert)
docker-compose -f docker-compose.s3.yml up -d
```

### Schritt 5: Überprüfen

```bash
# Dateien im Container prüfen
docker exec virtuelle-stadtfuehrungen ls -la /var/www/html/data/

# S3-Bucket direkt prüfen
aws s3 ls s3://virtueller-reisefuehrer-data/
```

## 🔄 Volume-Konfiguration

Die Volume-Konfiguration erfolgt über Ihre Docker-Verwaltung. Stellen Sie sicher, dass das `data/` Volume korrekt mit Ihrem S3-Backend verbunden ist.

## 🛠️ Troubleshooting

### Problem: Touren können nicht gespeichert werden

```bash
# Berechtigungen im Container prüfen
docker exec virtuelle-stadtfuehrungen ls -la /var/www/html/data/
docker exec virtuelle-stadtfuehrungen touch /var/www/html/data/test.txt

# Volume-Konfiguration prüfen
docker inspect virtuelle-stadtfuehrungen | grep -A 10 Mounts
```

### Problem: Daten nicht persistent

```bash
# S3-Bucket prüfen
aws s3 ls s3://virtueller-reisefuehrer-data/

# Docker-Volume prüfen
docker volume inspect <volume-name>
```

### Problem: Langsame Performance

Konfigurieren Sie Caching in Ihrer Docker-Verwaltung oder verwenden Sie S3-kompatible Caching-Optionen.

## 📊 Monitoring

### S3-Zugriffe überwachen

```bash
# AWS CLI verwenden
aws s3api list-objects --bucket virtueller-reisefuehrer-data

# CloudWatch Metrics aktivieren (in AWS Console)
# S3 → Bucket → Metrics → Request metrics
```

### Kosten überwachen

```bash
# Speichernutzung prüfen
aws s3 ls s3://virtueller-reisefuehrer-data --recursive --summarize

# Geschätzte Kosten (ca. $0.023/GB/Monat in eu-central-1)
# + API-Requests: $0.0004 per 1000 PUT/GET requests
```

## 🔒 Sicherheit

### Verschlüsselung aktivieren

```bash
# Server-Side Encryption in S3
aws s3api put-bucket-encryption \
  --bucket virtueller-reisefuehrer-data \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Versionierung aktivieren

```bash
# S3 Versioning (für Backup/Rollback)
aws s3api put-bucket-versioning \
  --bucket virtueller-reisefuehrer-data \
  --versioning-configuration Status=Enabled
```

### Lifecycle-Regeln

```bash
# Alte Versionen automatisch löschen
aws s3api put-bucket-lifecycle-configuration \
  --bucket virtueller-reisefuehrer-data \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }]
  }'
```

## 💡 Best Practices

1. **Regelmäßige Backups**: Auch wenn S3 hochverfügbar ist
2. **Monitoring**: CloudWatch Alarme für API-Fehler einrichten
3. **Access Logs**: S3 Access Logging aktivieren
4. **Least Privilege**: Minimale IAM-Rechte vergeben
5. **Encryption**: Immer Server-Side Encryption nutzen
6. **Versioning**: Für wichtige Daten aktivieren
7. **Cache**: s3fs mit Cache für bessere Performance

## 🆘 Support

Bei Problemen:
- s3fs-fuse Dokumentation: https://github.com/s3fs-fuse/s3fs-fuse
- AWS S3 Dokumentation: https://docs.aws.amazon.com/s3/
- GitHub Issues: https://github.com/ralf-schmid/virtueller-reisefuehrer/issues
