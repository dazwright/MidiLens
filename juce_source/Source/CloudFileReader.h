#pragma once

#include <juce_core/juce_core.h>
#include <cstdint>
#include <vector>

namespace MidiPreviewer
{

struct CloudFileReadResult
{
    bool success { false };
    std::vector<uint8_t> bytes;
    juce::String errorMessage;
};

// Reads a local or macOS File Provider / CloudStorage file (e.g., Google Drive, iCloud Drive).
// Must be called from a background thread (never the audio thread or UI message thread),
// because hydrating online-only cloud files via NSFileCoordinator can wait for network I/O.
CloudFileReadResult readFileWithCloudHydration(const juce::File& file, int timeoutMs = 15000);

// Starts a native macOS OS file drag session (NSDraggingSession) directly from a host NSView,
// bypassing WKWebView's stale [NSApp currentEvent] limitations inside Logic Pro / DAW hosts.
bool startExternalMidiFileDrag(void* nativeViewHandle, const juce::File& midiFile);

} // namespace MidiPreviewer
