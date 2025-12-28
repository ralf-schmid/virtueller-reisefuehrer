# S3-Integration Setup-Anleitung

Diese Anleitung zeigt, wie Sie das `data/` Verzeichnis mit einem S3-Bucket verbinden.

## 📋 Voraussetzungen

- AWS Account mit S3-Zugriff
- S3 Bucket erstellt
- Access Key und Secret Key mit Lese-/Schreibrechten auf den Bucket

## 🚀 Quick Start

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

### Schritt 3: S3-Mount einrichten

#### Option A: Interaktiv

```bash
./setup-s3.sh
```

Das Script fragt nach:
- S3 Bucket Name
- AWS Access Key ID
- AWS Secret Access Key

#### Option B: Mit Umgebungsvariablen

```bash
# Environment-Datei erstellen
cp .env.s3.example .env.s3
nano .env.s3  # Anpassen

# Laden und mounten
source .env.s3
./setup-s3.sh
```

### Schritt 4: Anwendung starten

```bash
# Mit S3-Backend
docker-compose -f docker-compose.s3.yml up -d

# Oder normale docker-compose (data/ ist bereits gemountet)
docker-compose up -d
```

### Schritt 5: Überprüfen

```bash
# Mount-Status prüfen
mountpoint ./data

# Dateien anzeigen
ls -la ./data/

# S3-Bucket direkt prüfen
aws s3 ls s3://virtueller-reisefuehrer-data/
```

## 🔄 Automatisches Mounten beim Boot

### Mit Systemd

```bash
# 1. Service-Datei anpassen
sudo nano s3-mount.service

# Ändern Sie:
# - WorkingDirectory=/pfad/zu/virtueller-reisefuehrer
# - Environment="S3_BUCKET=ihr-bucket-name"

# 2. Service installieren
sudo cp s3-mount.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable s3-mount.service
sudo systemctl start s3-mount.service

# 3. Status prüfen
sudo systemctl status s3-mount.service
```

### Mit /etc/fstab

```bash
# Credentials-Datei erstellen (falls noch nicht vorhanden)
echo "ACCESS_KEY:SECRET_KEY" > ~/.passwd-s3fs
chmod 600 ~/.passwd-s3fs

# Zu /etc/fstab hinzufügen:
virtueller-reisefuehrer-data /pfad/zu/data fuse.s3fs _netdev,allow_other,use_cache=/tmp,passwd_file=/home/user/.passwd-s3fs 0 0
```

## 🛠️ Troubleshooting

### Problem: Mount schlägt fehl

```bash
# Debug-Modus aktivieren
s3fs virtueller-reisefuehrer-data ./data \
  -o passwd_file=$HOME/.passwd-s3fs \
  -o dbglevel=info \
  -f

# Häufige Ursachen:
# - Falsche Credentials
# - Bucket existiert nicht
# - Keine Internetverbindung
# - Bucket in anderer Region
```

### Problem: Berechtigung verweigert

```bash
# S3FS mit richtigen Permissions mounten
s3fs virtueller-reisefuehrer-data ./data \
  -o passwd_file=$HOME/.passwd-s3fs \
  -o uid=$(id -u www-data) \
  -o gid=$(id -g www-data) \
  -o allow_other
```

### Problem: Langsame Performance

```bash
# Cache aktivieren für bessere Performance
s3fs virtueller-reisefuehrer-data ./data \
  -o passwd_file=$HOME/.passwd-s3fs \
  -o use_cache=/tmp/s3fs-cache \
  -o cache_size_mb=1000 \
  -o ensure_diskfree=500
```

### Problem: Kann nicht unmounten

```bash
# Prozesse prüfen, die data/ verwenden
lsof +D ./data

# Force unmount
sudo umount -l ./data

# Oder mit fusermount
fusermount -uz ./data
```

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
