import { CodeFileEntry } from './types';

// Native C++ JUCE 8 DSP & Host Bridge Sources
import pianoRollH from '../juce_source/Source/PianoRollComponent.h?raw';
import pianoRollCpp from '../juce_source/Source/PianoRollComponent.cpp?raw';
import processorH from '../juce_source/Source/PluginProcessor.h?raw';
import processorCpp from '../juce_source/Source/PluginProcessor.cpp?raw';
import editorH from '../juce_source/Source/PluginEditor.h?raw';
import editorCpp from '../juce_source/Source/PluginEditor.cpp?raw';
import keyDetectorH from '../juce_source/Source/KeyDetector.h?raw';
import keyDetectorCpp from '../juce_source/Source/KeyDetector.cpp?raw';
import lockFreeFifoH from '../juce_source/Source/LockFreeMidiFifo.h?raw';
import exporterH from '../juce_source/Source/MidiFileExporter.h?raw';
import exporterCpp from '../juce_source/Source/MidiFileExporter.cpp?raw';
import cmakeLists from '../juce_source/CMakeLists.txt?raw';
import readmeMd from '../juce_source/README.md?raw';
import githubWorkflowYml from '../juce_source/.github/workflows/build.yml?raw';
import installLocalAuSh from '../juce_source/install_local_au.sh?raw';
import installAuCommand from '../juce_source/install_au.command?raw';
import chordDetectorH from '../juce_source/Source/ChordDetector.h?raw';
import arpEngineH from '../juce_source/Source/ArpEngine.h?raw';
import midiLensLookAndFeelH from '../juce_source/Source/MidiLensLookAndFeel.h?raw';

// Pre-compiled Offline JUCE 8 WebUI Assets (Embedded into BinaryData via CMake)
import webUiIndexHtml from '../juce_source/WebUI/index.html?raw';
import webUiAppCss from '../juce_source/WebUI/app.css?raw';
import webUiAppJs from '../juce_source/WebUI/app.js?raw';
import webUiIconSvg from '../juce_source/WebUI/icon.svg?raw';

export const JUCE_CODE_FILES: CodeFileEntry[] = [
  {
    filename: 'PluginEditor.h',
    path: 'Source/PluginEditor.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'JUCE 8 WebBrowserComponent editor header with offline BinaryData ResourceProvider, native Finder dialogs, and DAW drag-and-drop.',
    content: editorH,
  },
  {
    filename: 'PluginEditor.cpp',
    path: 'Source/PluginEditor.cpp',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'JUCE 8 WebBrowserComponent implementation embedding the exact React + Tailwind v4 Studio Rack UI with bidirectional C++ DAW bridge.',
    content: editorCpp,
  },
  {
    filename: 'index.html',
    path: 'WebUI/index.html',
    language: 'html',
    category: 'GUI Canvas',
    description: 'Sandbox-safe offline HTML shell with zero external CDN/font dependencies and inlined Tailwind v4 stylesheet for Logic Pro AUHostingService.',
    content: webUiIndexHtml,
  },
  {
    filename: 'app.css',
    path: 'WebUI/app.css',
    language: 'css',
    category: 'GUI Canvas',
    description: 'Pre-compiled Tailwind v4 + hardware studio rack stylesheet embedded into WebUIData BinaryData.',
    content: webUiAppCss,
  },
  {
    filename: 'app.js',
    path: 'WebUI/app.js',
    language: 'javascript',
    category: 'GUI Canvas',
    description: 'Self-contained production bundle of the full MidiLens React UI (Library Organiser, Preset Drawer, Piano Roll, Arp & Chord Visualiser).',
    content: webUiAppJs,
  },
  {
    filename: 'icon.svg',
    path: 'WebUI/icon.svg',
    language: 'xml',
    category: 'GUI Canvas',
    description: 'Embedded vector brandplate emblem served directly from JUCE BinaryData.',
    content: webUiIconSvg,
  },
  {
    filename: 'install_au.command',
    path: 'install_au.command',
    language: 'bash',
    category: 'Install Script',
    description: 'Double-clickable macOS Finder command to build and install MidiLens AU into ~/Library/Audio/Plug-Ins/Components/ without an Apple Developer account.',
    content: installAuCommand,
  },
  {
    filename: 'install_local_au.sh',
    path: 'install_local_au.sh',
    language: 'bash',
    category: 'Install Script',
    description: '1-click Terminal script to configure CMake, compile AU with embedded WebUI BinaryData, ad-hoc codesign, and reset Logic Pro AUHostingService.',
    content: installLocalAuSh,
  },
  {
    filename: 'CMakeLists.txt',
    path: 'CMakeLists.txt',
    language: 'cmake',
    category: 'Configuration',
    description: 'Universal CMake setup for AU MIDI FX (Logic Pro), VST3, JUCE 8.0.4 WebBrowserComponent, WebKit linkage, and MidiLensWebUIData BinaryData.',
    content: cmakeLists,
  },
  {
    filename: 'build.yml',
    path: '.github/workflows/build.yml',
    language: 'yaml',
    category: 'Configuration',
    description: 'Automated GitHub Actions CI/CD workflow that compiles and packages macOS .pkg and Windows VST3 in the cloud.',
    content: githubWorkflowYml,
  },
  {
    filename: 'PluginProcessor.h',
    path: 'Source/PluginProcessor.h',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Header for MidiPreviewerAudioProcessor with lock-free MIDI playback, preview note auditioning, active pitch bitmask, and state persistence.',
    content: processorH,
  },
  {
    filename: 'PluginProcessor.cpp',
    path: 'Source/PluginProcessor.cpp',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Implementation of sample-accurate MIDI FX engine, DAW key-signature & transport telemetry, recursive folder scanner, and APVTS.',
    content: processorCpp,
  },
  {
    filename: 'LockFreeMidiFifo.h',
    path: 'Source/LockFreeMidiFifo.h',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Header for lock-free command FIFO and immutable sequence snapshot structs.',
    content: lockFreeFifoH,
  },
  {
    filename: 'ArpEngine.h',
    path: 'Source/ArpEngine.h',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Arpeggiator engine generating Up, Down, Up/Down, Random, and Chord sequences across 1-4 octaves.',
    content: arpEngineH,
  },
  {
    filename: 'KeyDetector.h',
    path: 'Source/KeyDetector.h',
    language: 'cpp',
    category: 'Analysis DSP',
    description: 'Header for Krumhansl-Schmuckler pitch class profile accumulator and Pearson correlation key identifier.',
    content: keyDetectorH,
  },
  {
    filename: 'KeyDetector.cpp',
    path: 'Source/KeyDetector.cpp',
    language: 'cpp',
    category: 'Analysis DSP',
    description: 'Krumhansl-Schmuckler algorithm implementation with velocity/duration weighted accumulation.',
    content: keyDetectorCpp,
  },
  {
    filename: 'ChordDetector.h',
    path: 'Source/ChordDetector.h',
    language: 'cpp',
    category: 'Analysis DSP',
    description: 'Header for real-time chord detection engine matching the interactive visualiser in the plugin.',
    content: chordDetectorH,
  },
  {
    filename: 'PianoRollComponent.h',
    path: 'Source/PianoRollComponent.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'MusicalScale pitch-snapping helper definitions used by PluginProcessor DSP.',
    content: pianoRollH,
  },
  {
    filename: 'PianoRollComponent.cpp',
    path: 'Source/PianoRollComponent.cpp',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Scale interval pitch-snapping implementation.',
    content: pianoRollCpp,
  },
  {
    filename: 'MidiLensLookAndFeel.h',
    path: 'Source/MidiLensLookAndFeel.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Optional fallback JUCE LookAndFeel header.',
    content: midiLensLookAndFeelH,
  },
  {
    filename: 'MidiFileExporter.h',
    path: 'Source/MidiFileExporter.h',
    language: 'cpp',
    category: 'Export / I/O',
    description: 'Header for temporary .mid file serialization and DAW track drag-and-drop export.',
    content: exporterH,
  },
  {
    filename: 'MidiFileExporter.cpp',
    path: 'Source/MidiFileExporter.cpp',
    language: 'cpp',
    category: 'Export / I/O',
    description: 'Implementation of MIDI file serialization with tempo events, velocity scaling, and note transposition.',
    content: exporterCpp,
  },
  {
    filename: 'README.md',
    path: 'README.md',
    language: 'markdown',
    category: 'Documentation',
    description: 'Complete macOS Logic Pro setup, AU MIDI FX validation (auval), and code-signing instructions.',
    content: readmeMd,
  },
];
