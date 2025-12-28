#!/bin/bash
# S3-Setup-Script für virtuelle Stadtführungen
# Mountet S3-Bucket als lokales data/ Verzeichnis

set -e

echo "🔧 S3-Setup für virtuelle Stadtführungen"
echo "========================================"
echo ""

# Konfiguration
S3_BUCKET="${S3_BUCKET:-}"
AWS_ACCESS_KEY="${AWS_ACCESS_KEY:-}"
AWS_SECRET_KEY="${AWS_SECRET_KEY:-}"
MOUNT_POINT="./data"

# Interaktive Eingabe falls nicht gesetzt
if [ -z "$S3_BUCKET" ]; then
    read -p "S3 Bucket Name: " S3_BUCKET
fi

if [ -z "$AWS_ACCESS_KEY" ]; then
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY
fi

if [ -z "$AWS_SECRET_KEY" ]; then
    read -sp "AWS Secret Access Key: " AWS_SECRET_KEY
    echo ""
fi

# Validierung
if [ -z "$S3_BUCKET" ] || [ -z "$AWS_ACCESS_KEY" ] || [ -z "$AWS_SECRET_KEY" ]; then
    echo "❌ Fehler: Alle Parameter müssen gesetzt sein!"
    exit 1
fi

echo ""
echo "📦 Bucket: $S3_BUCKET"
echo "📂 Mount Point: $MOUNT_POINT"
echo ""

# s3fs installieren falls nicht vorhanden
if ! command -v s3fs &> /dev/null; then
    echo "📥 Installiere s3fs-fuse..."

    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y s3fs
    elif [ -f /etc/redhat-release ]; then
        # RedHat/CentOS
        sudo yum install -y s3fs-fuse
    elif [ "$(uname)" == "Darwin" ]; then
        # macOS
        brew install --cask osxfuse
        brew install s3fs
    else
        echo "❌ Unsupported OS. Bitte installieren Sie s3fs manuell."
        exit 1
    fi

    echo "✅ s3fs installiert"
else
    echo "✅ s3fs bereits installiert"
fi

# Credentials-Datei erstellen
PASSWD_FILE="$HOME/.passwd-s3fs"
echo "$AWS_ACCESS_KEY:$AWS_SECRET_KEY" > "$PASSWD_FILE"
chmod 600 "$PASSWD_FILE"
echo "✅ Credentials gespeichert in $PASSWD_FILE"

# Data-Verzeichnis vorbereiten
if [ ! -d "$MOUNT_POINT" ]; then
    mkdir -p "$MOUNT_POINT"
fi

# Unmount falls bereits gemountet
if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
    echo "⚠️  $MOUNT_POINT ist bereits gemountet, unmounte..."
    fusermount -u "$MOUNT_POINT" 2>/dev/null || sudo umount "$MOUNT_POINT"
fi

# S3 Bucket mounten
echo "🔗 Mounte S3 Bucket..."
s3fs "$S3_BUCKET" "$MOUNT_POINT" \
    -o passwd_file="$PASSWD_FILE" \
    -o allow_other \
    -o use_cache=/tmp/s3fs-cache \
    -o uid=$(id -u) \
    -o gid=$(id -g) \
    -o umask=0022 \
    -o default_acl=private \
    -o retries=5

if [ $? -eq 0 ]; then
    echo "✅ S3 Bucket erfolgreich gemountet!"
    echo ""
    echo "📊 Status:"
    df -h "$MOUNT_POINT" || ls -la "$MOUNT_POINT"
    echo ""
    echo "🎯 Nächste Schritte:"
    echo "   1. Starten Sie die Anwendung: docker-compose up -d"
    echo "   2. Die Touren werden jetzt in S3 gespeichert"
    echo ""
    echo "⚠️  Zum Unmounten: fusermount -u $MOUNT_POINT"
    echo ""
    echo "💡 Für automatisches Mount beim Boot, fügen Sie zu /etc/fstab hinzu:"
    echo "   $S3_BUCKET $PWD/$MOUNT_POINT fuse.s3fs _netdev,allow_other,passwd_file=$PASSWD_FILE 0 0"
else
    echo "❌ Fehler beim Mounten des S3 Buckets"
    exit 1
fi
