#!/bin/sh
set -e

echo "CCM Server Starting..."

# Check if database exists and initialize if needed
if [ ! -f /app/data/ccm.db ]; then
    echo "Initializing database..."
    cd /app/packages/server
    prisma db push --accept-data-loss --skip-generate
    echo "Database initialized."
else
    echo "Running database migrations..."
    cd /app/packages/server
    prisma db push --accept-data-loss --skip-generate || true
fi

echo "Starting Next.js server..."
exec node /app/packages/server/server.js
