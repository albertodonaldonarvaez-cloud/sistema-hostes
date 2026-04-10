#!/bin/sh
# Sistema Hostes - Docker Entrypoint
# Initializes the database if it doesn't exist in the volume

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/guests.db"
TEMPLATE="/app/template.db"

# If no database exists in volume, copy the template (has schema, no data)
if [ ! -f "$DB_FILE" ]; then
    echo "[init] No database found, creating from template..."
    mkdir -p "$DATA_DIR"
    cp "$TEMPLATE" "$DB_FILE"
    chown nextjs:nodejs "$DB_FILE"
    echo "[init] Database ready."
fi

# Start the application
exec node server.js
