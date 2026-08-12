#!/bin/bash
# Run from the BeyondX-Website root.
# Builds the AdminConsole-Main React app and copies it into public/admin/
# so that https://beyondxco.com/admin serves the new console.

set -e

ADMIN_DIR="../AdminConsole-Main"

if [ ! -d "$ADMIN_DIR" ]; then
  echo "Error: $ADMIN_DIR not found. Clone it alongside BeyondX-Website."
  exit 1
fi

echo "Building admin console..."
cd "$ADMIN_DIR"
npm install --silent
npm run build

echo "Copying into public/admin/..."
cd -
rm -rf public/admin
cp -r "$ADMIN_DIR/dist" public/admin

echo "Done. Commit and push to deploy."
