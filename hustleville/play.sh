#!/bin/sh
# Hustleville local server: ./play.sh  then open http://localhost:8000
cd "$(dirname "$0")" && echo "Open http://localhost:8000  (Ctrl+C to stop)" && python3 -m http.server 8000
