import { CodeFileEntry } from './types';

// Read updated files
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

export const JUCE_CODE_FILES: CodeFileEntry[] = [
  {
    filename: 'MidiLensLookAndFeel.h',
    path: 'Source/MidiLensLookAndFeel.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Custom Analog Hybrid Studio Rack JUCE LookAndFeel styling gunmetal chassis buttons, incandescent play indicators, dark stamped comboboxes, and milled rotary knobs.',
    content: midiLensLookAndFeelH,
  },
  {
    filename: 'ChordDetector.h',
    path: 'Source/ChordDetector.h',
    language: 'cpp',
    category: 'Analysis DSP',
    description: 'Header for real-time chord detection engine matching the interactive visualizer in the plugin simulator.',
    content: chordDetectorH,
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
    description: '1-click Terminal script to configure CMake, compile AU, ad-hoc codesign, strip quarantine, and reset macOS AudioComponentRegistrar.',
    content: installLocalAuSh,
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
    filename: 'CMakeLists.txt',
    path: 'CMakeLists.txt',
    language: 'cmake',
    category: 'Configuration',
    description: 'Universal CMake setup for AU MIDI FX (Logic Pro), VST3, Apple Silicon/Intel architectures, and JUCE v8 modules.',
    content: cmakeLists,
  },
  {
    filename: 'PluginProcessor.h',
    path: 'Source/PluginProcessor.h',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Header for MidiPreviewerAudioProcessor with recursive folder scanning, scale/timing quantization, and APVTS.',
    content: processorH,
  },
  {
    filename: 'PluginProcessor.cpp',
    path: 'Source/PluginProcessor.cpp',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Implementation of lock-free MIDI audition engine, recursive folder scanner, DAW transport sync, and humanization.',
    content: processorCpp,
  },
  {
    filename: 'PianoRollComponent.h',
    path: 'Source/PianoRollComponent.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Header for piano roll component with scale locking, zoom factors, and draggable sequence length handle.',
    content: pianoRollH,
  },
  {
    filename: 'PianoRollComponent.cpp',
    path: 'Source/PianoRollComponent.cpp',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Implementation of Phosphor CRT lab piano roll with deep night-green background (#070d09), flat rectangular phosphor green/amber note traces, and glowing playhead.',
    content: pianoRollCpp,
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
    filename: 'PluginEditor.h',
    path: 'Source/PluginEditor.h',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Header for main GUI editor with Quantize, Scale Snap, Humanize, and Recursive Folder Scan controls.',
    content: editorH,
  },
  {
    filename: 'PluginEditor.cpp',
    path: 'Source/PluginEditor.cpp',
    language: 'cpp',
    category: 'GUI Canvas',
    description: 'Implementation of the Neve/SSL analog studio rack UI with dark anodized chassis, corner Allen screws, milled brandplate, and drag-to-DAW export.',
    content: editorCpp,
  },
  {
    filename: 'LockFreeMidiFifo.h',
    path: 'Source/LockFreeMidiFifo.h',
    language: 'cpp',
    category: 'Processor DSP',
    description: 'Header for lock-free command FIFO and copyable snapshot event structs.',
    content: lockFreeFifoH,
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
