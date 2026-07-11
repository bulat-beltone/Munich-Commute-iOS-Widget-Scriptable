#!/bin/bash
set -e
DEST="/Users/Bulat.Davletov/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents"
cd "$(dirname "$0")"
node build.js
cp "./Munich Commute Widget.js" "$DEST/"
echo "Deployed to Scriptable"
