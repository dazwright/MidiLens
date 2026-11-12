#!/bin/bash
# Double-clickable macOS Finder command to build and install MidiLens AU
cd "$(dirname "$0")"
chmod +x ./install_local_au.sh
./install_local_au.sh
echo ""
read -p "Press [Enter] to exit..."
