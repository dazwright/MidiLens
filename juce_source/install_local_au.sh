#!/usr/bin/env bash
# ==============================================================================
# MidiLens - 1-Click Local Audio Unit (AU) Installer & Tester (No Apple ID Needed)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo " Building & Installing MidiLens AU (Local Ad-Hoc Build)"
echo "=========================================================="

# 1. Check for CMake
if ! command -v cmake &> /dev/null; then
    echo "⚠️  CMake is not installed on this Mac."
    if command -v brew &> /dev/null; then
        echo "🍺 Homebrew detected! Automatically installing CMake for you now..."
        brew install cmake
    else
        echo ""
        echo "To install CMake on macOS, run this in Terminal:"
        echo "   brew install cmake"
        echo ""
        echo "Don't have Homebrew? You can:"
        echo "1. Install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "2. Or download official CMake DMG installer directly from:"
        echo "   https://cmake.org/download/"
        echo ""
        exit 1
    fi
fi

# 2. Check for Xcode command line tools
if ! command -v clang &> /dev/null; then
    echo "⚠️  Apple command line compiler not found. Requesting installation..."
    xcode-select --install || true
    echo "Please finish the Apple developer tools installation popup, then re-run this script."
    exit 1
fi

# 3. Create destination directory in user library (no sudo required)
AU_DEST_DIR="$HOME/Library/Audio/Plug-Ins/Components"
mkdir -p "$AU_DEST_DIR"

# 4. Configure & Build AU target
# Clear stale CMake cache from any previous failed builds
rm -f build/CMakeCache.txt

echo "⚙️ Configuring CMake (Release)..."
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

echo "🔨 Compiling MidiLens Audio Unit (AU)..."
if ! cmake --build build --config Release --target MidiPreviewer_AU; then
    echo ""
    echo "❌ Compilation failed. Look at the compiler error above."
    exit 1
fi

# Find the built component (handles Xcode, Ninja, or Unix Makefiles directory structures)
AU_BUILT_PATH=$(find build -name "MidiLens.component" -type d | head -n 1)

if [ ! -d "$AU_BUILT_PATH" ]; then
    echo "❌ Error: Could not find MidiLens.component after build."
    exit 1
fi

# 5. Copy to user Audio Plug-Ins folder
echo "📦 Installing to $AU_DEST_DIR/MidiLens.component..."
rm -rf "$AU_DEST_DIR/MidiLens.component"
cp -R "$AU_BUILT_PATH" "$AU_DEST_DIR/"

# 6. Ad-hoc self-sign (Bypasses Gatekeeper completely for local machines)
echo "🔏 Applying local ad-hoc code signature..."
codesign --force --deep --sign - "$AU_DEST_DIR/MidiLens.component"

# 7. Strip quarantine attribute (crucial if files were downloaded or git cloned)
echo "🛡️ Clearing quarantine attributes..."
xattr -cr "$AU_DEST_DIR/MidiLens.component"

# 8. Reset macOS AudioUnit cache daemon so Logic / DAWs immediately detect it
echo "🔄 Resetting macOS AudioComponentRegistrar..."
killall -9 AudioComponentRegistrar 2>/dev/null || true

echo "=========================================================="
echo "✅ SUCCESS: MidiLens AU is installed!"
echo "📍 Location: $AU_DEST_DIR/MidiLens.component"
echo ""
echo "💡 How to test in Logic Pro:"
echo "   1. Create an Instrument track (e.g. Vintage Electric Piano)."
echo "   2. Click the 'MIDI FX' slot ABOVE the instrument plugin."
echo "   3. Select: Audio Units > AudioDSP > MidiLens."
echo ""
echo "💡 To run Apple's command-line AU validator now, run:"
echo "   auval -v aumf MPrv Adsp"
echo "=========================================================="
