#!/bin/sh
# Ensure the prisma data directory exists and is writable
mkdir -p /app/prisma/prisma
chmod -R 777 /app/prisma/prisma 2>/dev/null || true

exec "$@"
