#!/usr/bin/env bash
# ==============================================================================
# MidiLens - 1-Click Local Audio Unit (AU) Installer & Tester (No Apple ID Needed)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo " Building & Installing MidiLens AU (JUCE 8 Studio Rack UI)"
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

# 3. Verify embedded WebUI assets exist in WebUI/
if [ ! -f "WebUI/index.html" ] || [ ! -f "WebUI/app.js" ] || [ ! -f "WebUI/app.css" ]; then
    echo "❌ Error: WebUI/ bundle files are missing from this folder."
    echo "Please make sure you extracted the complete MidiLens_JUCE_Project.zip archive."
    exit 1
fi

# 4. Create destination directory in user library (no sudo required)
AU_DEST_DIR="$HOME/Library/Audio/Plug-Ins/Components"
mkdir -p "$AU_DEST_DIR"

# 5. Clean previous compiled object files & CMake cache (preserving _deps/juce-src if cached)
rm -rf build/CMakeFiles build/CMakeCache.txt build/MidiPreviewer_artefacts build/juce_binarydata_MidiLensWebUIData

echo "⚙️ Configuring CMake (Release with Embedded JUCE 8 WebUI)..."
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release

echo "🔨 Compiling MidiLens Audio Unit (AU)..."
if ! cmake --build build --config Release --target MidiPreviewer_AU -j4; then
    echo ""
    echo "❌ Compilation failed. Look at the compiler error above."
    exit 1
fi

# Find the built component (handles Xcode, Ninja, or Unix Makefiles directory structures)
AU_BUILT_PATH=$(find build -name "*.component" -type d | head -n 1)

if [ ! -d "$AU_BUILT_PATH" ]; then
    echo "❌ Error: Could not find built .component after build."
    exit 1
fi

# 6. Copy to user Audio Plug-Ins folder (clearing any older/stale plugin variants)
echo "📦 Installing to $AU_DEST_DIR/MidiLens.component..."
rm -rf "$AU_DEST_DIR/MidiLens.component"
rm -rf "$AU_DEST_DIR/MIDI Previewer.component"
rm -rf "$AU_DEST_DIR/MidiPreviewer.component"
cp -R "$AU_BUILT_PATH" "$AU_DEST_DIR/MidiLens.component"

# 7. Ad-hoc self-sign (Bypasses Gatekeeper completely for local machines)
echo "🔏 Applying local ad-hoc code signature..."
codesign --force --deep --sign - "$AU_DEST_DIR/MidiLens.component"

# 8. Strip quarantine attribute (crucial if files were downloaded or git cloned)
echo "🛡️ Clearing quarantine attributes..."
xattr -cr "$AU_DEST_DIR/MidiLens.component"
touch "$AU_DEST_DIR/MidiLens.component"

# 9. Reset macOS AudioUnit & AUHostingService caches so Logic Pro loads the new UI immediately
echo "🔄 Resetting macOS AudioComponentRegistrar, AUHostingService & cache..."
killall -9 AudioComponentRegistrar 2>/dev/null || true
killall -9 AUHostingServiceXPC_arrow 2>/dev/null || true
killall -9 AUHostingServiceXPC 2>/dev/null || true
rm -f "$HOME/Library/Caches/AudioUnitCache/com.apple.audiounits.cache" 2>/dev/null || true
rm -f "$HOME/Library/Caches/com.apple.audiounits.cache" 2>/dev/null || true

echo "=========================================================="
echo "✅ SUCCESS: MidiLens AU (Full Studio Rack UI) is installed!"
echo "📍 Location: $AU_DEST_DIR/MidiLens.component"
echo ""
echo "💡 IMPORTANT: Quit & reopen Logic Pro if it is currently open"
echo "   so Logic reloads the new MidiLens AU binary."
echo ""
echo "💡 How to open in Logic Pro:"
echo "   1. Create an Instrument track (e.g. Serum 2 / Vintage Electric Piano)."
echo "   2. Click the 'MIDI FX' slot ABOVE the instrument plugin."
echo "   3. Select: Audio Units > Daz Corp > MidiLens."
echo "=========================================================="
