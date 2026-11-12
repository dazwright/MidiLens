#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_graphics/juce_graphics.h>
#include "LockFreeMidiFifo.h"
#include <vector>
#include <set>
#include <functional>

namespace MidiPreviewer
{

enum class MusicalScale
{
    Chromatic = 0,
    Major,
    NaturalMinor,
    HarmonicMinor,
    MelodicMinor,
    Dorian,
    Phrygian,
    Lydian,
    Mixolydian,
    PentatonicMajor,
    PentatonicMinor,
    Blues
};

class PianoRollComponent : public juce::Component,
                           public juce::SettableTooltipClient
{
public:
    PianoRollComponent();
    ~PianoRollComponent() override = default;

    void paint(juce::Graphics& g) override;
    void resized() override;

    void mouseDown(const juce::MouseEvent& e) override;
    void mouseDrag(const juce::MouseEvent& e) override;
    void mouseUp(const juce::MouseEvent& e) override;
    bool keyPressed(const juce::KeyPress& key) override;

    // Sequence & Playhead Binding
    void setSequenceSnapshot(std::shared_ptr<const SequenceSnapshot> snapshot);
    void setPlayheadPositionPpq(double ppq);
    void setTransposeOffset(int semitones);

    // Scale Lock & Highlighting
    void setScale(int rootPitch, MusicalScale scale, bool enableLock);
    bool isPitchInActiveScale(int pitch) const;
    int snapPitchToActiveScale(int pitch) const;

    // Zoom and Length Manipulation
    void setZoom(float newZoomX, float newZoomY);
    void doubleSequenceLength();
    void halveSequenceLength();

    // Callbacks
    std::function<void(double newPpq)> onSeekRequested;
    std::function<void(const std::vector<PlaybackEvent>& modifiedEvents)> onSequenceEdited;
    std::function<void(double newTotalPpq)> onLengthChanged;

    // Velocity & Selection Public Methods
    void selectAllNotes();
    void deselectAllNotes();
    float getSelectedAverageVelocity() const;
    void setSelectedVelocity(float newVel);
    std::vector<int> getCurrentlyAuditioningPitches() const;

    // Cut / Copy / Paste Operations
    struct ClipboardNote
    {
        int pitch;
        double offsetPpq;
        double durationPpq;
        float velocity;
        int channel;
    };
    void copySelectedNotes();
    void cutSelectedNotes();
    void pasteNotesAt(double targetPpq, int targetPitch = -1);

private:
    std::shared_ptr<const SequenceSnapshot> currentSnapshot { nullptr };
    std::vector<PlaybackEvent> editableEvents;
    std::set<int> selectedNoteIds;
    std::vector<ClipboardNote> noteClipboard;

    double playheadPpq { 0.0 };
    int previewTranspose { 0 };

    // Scale parameters
    int scaleRoot { 0 }; // 0 = C
    MusicalScale currentScale { MusicalScale::NaturalMinor };
    bool scaleLockActive { true };

    // Viewport, zoom and coordinate mapping
    float zoomX { 1.0f };
    float zoomY { 1.0f };
    float basePixelsPerPpq { 120.0f };
    float noteHeightPixels { 14.0f };
    int minPitch { 24 }; // C1
    int maxPitch { 96 }; // C7

    int rulerHeight { 30 };
    int pianoKeysWidth { 46 };
    int velocityBarHeight { 28 };

    // Drag tracking
    enum class DragMode
    {
        None,
        ScrubRuler,
        MoveNotes,
        ResizeNoteEnd,
        MarqueeSelect,
        DragLengthHandle,
        DragVelocitySlider
    };

    DragMode currentDragMode { DragMode::None };
    juce::Point<int> dragStartPos;
    int draggingNoteId { -1 };
    double dragInitialPpq { 0.0 };
    int dragInitialPitch { 0 };
    double dragInitialTotalLength { 16.0 };
    float dragInitialAvgVelocity { 0.75f };
    std::vector<std::pair<int, float>> dragInitialNoteVelocities;
    juce::Rectangle<int> marqueeRect;

    // Helpers
    juce::Rectangle<float> getNoteRectangle(const PlaybackEvent& ev) const;
    int pitchAtY(int y) const;
    double ppqAtX(int x) const;
    int findNoteAt(juce::Point<int> pos, bool& outNearEdge) const;
    juce::Colour getVelocityColour(float velocity) const;

    void drawGrid(juce::Graphics& g, juce::Rectangle<int> area);
    void drawPianoKeys(juce::Graphics& g, juce::Rectangle<int> area);
    void drawNotes(juce::Graphics& g, juce::Rectangle<int> area);
    void drawPlayhead(juce::Graphics& g, juce::Rectangle<int> area);
    void drawRuler(juce::Graphics& g, juce::Rectangle<int> area);
    void drawVelocityHeatmap(juce::Graphics& g, juce::Rectangle<int> area);

    void notifySequenceChanged();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PianoRollComponent)
};

} // namespace MidiPreviewer
