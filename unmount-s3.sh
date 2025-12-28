#!/bin/bash
# S3 Bucket unmounten

MOUNT_POINT="./data"

if mountpoint -q "$MOUNT_POINT" 2>/dev/null; then
    echo "🔓 Unmounte S3 Bucket..."
    fusermount -u "$MOUNT_POINT" 2>/dev/null || sudo umount "$MOUNT_POINT"
    echo "✅ S3 Bucket erfolgreich unmountet"
else
    echo "ℹ️  $MOUNT_POINT ist nicht gemountet"
fi
