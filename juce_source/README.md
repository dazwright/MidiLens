# MIDI Previewer - JUCE C++ MIDI FX Plugin (AU, VST3, CLAP)

A high-performance, cross-platform MIDI FX plugin built with the **JUCE Framework (v7/v8)** for **macOS (Logic Pro, Ableton Live, Studio One, Reaper)** and **Windows**.

---

## 1. Architectural Highlights

### Strict Real-Time & Lock-Free Threading
- **Audio Thread Safety:** `processBlock` executes with **zero memory allocations**, **zero system locks**, and **zero disk I/O**.
- **Immutable Sequence Snapshots:** When files are loaded or notes are edited, the message thread constructs a new `SequenceSnapshot` and atomically swaps it using an acquire/release memory fence.
- **Lock-Free Command FIFO:** Play, Stop, and Scrub commands are dispatched using `juce::AbstractFifo` without blocking the audio driver.
- **Hanging-Note Prevention:** Automatic active-note tracking pool cleanly dispatches Note-Offs and All-Notes-Off (`CC 123` & `CC 120`) upon loop wrap-around, transport stop, or file swap.

### Logic Pro AU MIDI FX Architecture (`aumf`)
Logic Pro requires MIDI FX plugins placed above software instruments to be compiled as Audio Unit type **`aumf`** (`kAudioUnitType_MIDIProcessor`). Standard audio effects (`aufx`) or instruments (`aumu`) will **not** appear in Logic's MIDI FX slot.
- `IS_MIDI_EFFECT TRUE`
- `NEEDS_MIDI_INPUT TRUE`
- `NEEDS_MIDI_OUTPUT TRUE`
- `AudioChannelSet::disabled()` for both input and output buses.

---

## 2. macOS Build Instructions (Logic Pro AU & VST3)

### Prerequisites
- macOS 12.0+ (Universal binary supports Apple Silicon M1/M2/M3/M4 & Intel x86_64)
- Xcode 14+ or Command Line Tools
- CMake 3.22+ and Ninja or Xcode Generator

### Step 1: Configure CMake Project
```bash
# Clone or extract project
cd MIDI_Previewer

# Configure with Xcode generator for Universal Binary (ARM64 + x86_64)
cmake -B build -G Xcode \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="11.0"
```

*Alternatively, use Ninja for rapid local development:*
```bash
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

### Step 2: Compile AU and VST3 Targets
```bash
cmake --build build --config Release --target MidiPreviewer_AU MidiPreviewer_VST3
```

### Step 3: Install Component into User Audio Plugin Directory
```bash
# Create directories if they do not exist
mkdir -p ~/Library/Audio/Plug-Ins/Components
mkdir -p ~/Library/Audio/Plug-Ins/VST3

# Copy AU component (.component)
cp -R "build/MidiPreviewer_artefacts/Release/AU/MIDI Previewer.component" ~/Library/Audio/Plug-Ins/Components/

# Copy VST3 bundle (.vst3)
cp -R "build/MidiPreviewer_artefacts/Release/VST3/MIDI Previewer.vst3" ~/Library/Audio/Plug-Ins/VST3/
```

### Step 4: Ad-Hoc Code Signing & Quarantine Clearing
macOS Gatekeeper requires bundles to have valid code signing signatures to run inside host DAW sandboxes:
```bash
# Remove quarantine attributes
xattr -cr ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"
xattr -cr ~/Library/Audio/Plug-Ins/VST3/"MIDI Previewer.vst3"

# Apply ad-hoc signature
codesign --force --deep --sign - ~/Library/Audio/Plug-Ins/Components/"MIDI Previewer.component"
codesign --force --deep --sign - ~/Library/Audio/Plug-Ins/VST3/"MIDI Previewer.vst3"
```

---

## 3. Logic Pro Validation & `auval` Verification

Logic Pro uses the macOS `AudioComponentRegistrar` daemon to cache and sandbox Audio Units. To force a clean re-scan:

### Step 1: Kill AudioComponentRegistrar Daemon
```bash
killall -9 AudioComponentRegistrar
```

### Step 2: Run Apple's `auval` Tool
Validate the plugin against Apple's strict Audio Unit test suite:
```bash
# Syntax: auval -v <type> <subtype> <manufacturer>
auval -v aumf MPrv DazC
```

**Expected Successful Output:**
```
--------------------------------------------------
VERIFYING OUTCOME
--------------------------------------------------
AU VALIDATION SUCCEEDED FOR 1 AUDIO UNIT
```

### Step 3: Load inside Logic Pro
1. Open or create a Logic Pro project.
2. Create a **Software Instrument Track** (e.g., Alchemy, Retro Synth, or Sampler).
3. In the Inspector Channel Strip, locate the green/blue **MIDI FX** slot directly above the instrument name.
4. Click the MIDI FX slot -> navigate to **Audio Units -> Daz Corp -> MidiLens**.
5. The plugin UI will open. Drag any `.mid` file into the canvas or click "Load Demo Groove" to start auditioning!

---

## 4. Testing Protocols for Zero Latency & Real-Time Performance

| Test Case | Procedure | Acceptance Criteria |
| :--- | :--- | :--- |
| **Zero Latency Verification** | Query `processor.getLatencySamples()` | Return value must be strictly `0`. No lookahead or delay buffers allowed. |
| **Lock-Free Audit** | Run under `instruments` (Time Profiler + Allocations trace) while playing & resizing UI | Zero `malloc`, `free`, `pthread_mutex_lock`, or file read operations inside `processBlock`. |
| **Transport Loop Stress** | Set a 1-bar loop in Logic at 180 BPM and scrub playhead vigorously | No stuck/hanging notes. Notes cleanly terminate at loop boundaries without polyphony leaks. |
| **Dynamic Key Transpose** | Automate `transpose` parameter while chords are sustaining | Active notes transpose cleanly or re-trigger without DSP clicks or corrupted pitch-bend states. |
| **Drag & Drop to Track** | Drag the "DRAG TO DAW" handle into an empty region in Logic Pro track | Logic Pro successfully instantiates a new MIDI Region containing the transposed/scaled notes. |

---

## 5. Windows Build Instructions (VST3 & Standalone)

### Prerequisites on Windows
- Windows 10 or 11 (64-bit)
- Visual Studio 2022 (Community, Professional, or Enterprise) with the **"Desktop development with C++"** workload installed.
- CMake 3.22+ (included with Visual Studio or via `winget install Kitware.CMake`).
- Git for Windows.

### Step 1: Configure with Visual Studio 2022
Open PowerShell or the Developer Command Prompt:
```powershell
cd MidiLens_JUCE_Project

# Generate 64-bit Visual Studio Solution
cmake -B build -G "Visual Studio 17 2022" -A x64 -DCMAKE_BUILD_TYPE=Release
```

### Step 2: Build VST3 and Standalone
```powershell
cmake --build build --config Release --target MidiPreviewer_VST3 MidiPreviewer_Standalone
```

### Step 3: Install VST3 Bundle on Windows
Standard Windows VST3 path is `C:\Program Files\Common Files\VST3\`:
```powershell
# Copy VST3 bundle to system folder (run PowerShell as Administrator)
Copy-Item -Recurse -Force "build\MidiPreviewer_artefacts\Release\VST3\MidiLens.vst3" "C:\Program Files\Common Files\VST3\"
```
Your DAW (Cubase, Ableton Live, FL Studio, Studio One, Reaper, Bitwig) will automatically discover MidiLens on next scan.

---

## 6. Creating Distributable Installers (.pkg for macOS & .exe for Windows)

### macOS Installer (`.pkg`) using native `pkgbuild` / `productbuild`
```bash
# Prepare staging directory
mkdir -p pkg_root/Library/Audio/Plug-Ins/Components
mkdir -p pkg_root/Library/Audio/Plug-Ins/VST3

cp -R "build/MidiPreviewer_artefacts/Release/AU/MidiLens.component" pkg_root/Library/Audio/Plug-Ins/Components/
cp -R "build/MidiPreviewer_artefacts/Release/VST3/MidiLens.vst3" pkg_root/Library/Audio/Plug-Ins/VST3/

# Build installable .pkg installer
pkgbuild --root pkg_root \
         --identifier com.dazcorp.midilens.pkg \
         --version 1.0.0 \
         --install-location / \
         MidiLens-macOS-Installer.pkg
```

### Windows Installer (`.exe`) using Inno Setup
Create a simple `installer.iss` script:
```inno
[Setup]
AppName=MidiLens
AppVersion=1.0.0
DefaultDirName={commoncf}\VST3\MidiLens.vst3
DisableDirPage=yes
OutputBaseFilename=MidiLens-Windows-Installer
Compression=lzma
SolidCompression=yes

[Files]
Source: "build\MidiPreviewer_artefacts\Release\VST3\MidiLens.vst3\*"; DestDir: "{commoncf}\VST3\MidiLens.vst3"; Flags: recursesubdirs createallsubdirs
```
Compile with `iscc.exe installer.iss` to produce `MidiLens-Windows-Installer.exe`.

---

## 7. DAW Compatibility & Format Notes
- **AU (Audio Unit MIDI FX):** Specifically designed for **Apple Logic Pro**. Logic hosts MidiLens directly in the MIDI FX slot ahead of software instruments.
- **VST3:** Universally supported across **macOS and Windows** in Ableton Live 10+, Cubase 10+, Studio One, FL Studio, Bitwig Studio, and Reaper.
- **Legacy VST (VST2):** Steinberg deprecated VST2 in 2018. If you have an archival Steinberg VST2 SDK, you can add `VST` to `FORMATS` in `CMakeLists.txt`. All modern DAWs prioritize VST3.
- **Standalone:** A standalone desktop application for auditioning, converting, and exporting MIDI files outside of any DAW.

