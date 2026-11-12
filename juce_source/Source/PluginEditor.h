#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include "PluginProcessor.h"
#include "PianoRollComponent.h"
#include "MidiFileExporter.h"
#include "MidiLensLookAndFeel.h"

namespace MidiPreviewer
{

class ExportHandleComponent : public juce::Component,
                              public juce::SettableTooltipClient
{
public:
    ExportHandleComponent();
    void paint(juce::Graphics& g) override;
    void mouseDrag(const juce::MouseEvent& e) override;

    std::function<juce::File()> onExportFileRequested;

private:
    bool isHovered { false };
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ExportHandleComponent)
};

class MidiPreviewerAudioProcessorEditor : public juce::AudioProcessorEditor,
                                         public juce::FileDragAndDropTarget,
                                         public juce::Timer
{
public:
    explicit MidiPreviewerAudioProcessorEditor(MidiPreviewerAudioProcessor& processor);
    ~MidiPreviewerAudioProcessorEditor() override;

    void paint(juce::Graphics& g) override;
    void resized() override;
    void timerCallback() override;

    bool isInterestedInFileDrag(const juce::StringArray& files) override;
    void fileDragEnter(const juce::StringArray& files, int x, int y) override;
    void fileDragExit(const juce::StringArray& files) override;
    void filesDropped(const juce::StringArray& files, int x, int y) override;

private:
    MidiLensLookAndFeel lookAndFeel;
    MidiPreviewerAudioProcessor& audioProcessor;

    PianoRollComponent pianoRoll;
    ExportHandleComponent exportHandle;

    // Transport & Sync Controls
    juce::TextButton playButton { "Play" };
    juce::TextButton stopButton { "Stop" };
    juce::ToggleButton loopButton { "Loop" };
    juce::ComboBox syncModeSelector;
    juce::Label transportStatusLabel;
    juce::Label bpmDisplayLabel;
    juce::Slider manualTempoSlider;
    juce::Label manualTempoLabel;

    // Scale & Quantize Controls
    juce::ComboBox scaleRootSelector;
    juce::ComboBox scaleTypeSelector;
    juce::ToggleButton scaleLockToggle { "Scale Lock" };
    juce::ComboBox quantizeGridSelector;
    juce::TextButton quantizeTimeButton { "Quantize Time" };
    juce::TextButton quantizeScaleButton { "Quantize Scale" };

    // Sync to Project Key & Target Key
    juce::TextButton syncProjectKeyButton { "Sync to Project Key" };
    juce::ComboBox projectKeyRootSelector;
    juce::ComboBox projectScaleTypeSelector;

    juce::ComboBox targetKeyRootSelector;
    juce::ComboBox targetScaleTypeSelector;
    juce::TextButton matchTargetKeyButton { "Match Target Key" };

    // Humanize Controls
    juce::TextButton humanizeButton { "Humanise" };
    juce::Slider humanizeRangeSlider;

    // Harmonize Controls (+- 3rds, +- 5ths, +- 12 semitones)
    juce::TextButton harmUp3rdButton { "+3rd" };
    juce::TextButton harmDown3rdButton { "-3rd" };
    juce::TextButton harmUp5thButton { "+5th" };
    juce::TextButton harmDown5thButton { "-5th" };
    juce::TextButton harmUp8veButton { "+12" };
    juce::TextButton harmDown8veButton { "-12" };

    // Length & Zoom Controls
    juce::TextButton doubleLengthButton { "2x Double" };
    juce::TextButton halveLengthButton { "0.5x Halve" };
    juce::TextButton zoomInButton { "+" };
    juce::TextButton zoomOutButton { "-" };

    // Musical Analysis & DAW Match
    juce::Label keyDetectionBadge;
    juce::Label confidenceLabel;
    juce::TextButton dawMatchButton { "Match Key" };
    juce::ComboBox targetKeySelector;

    // Parameter Sliders & APVTS Attachments
    juce::Slider transposeSlider;
    juce::Label transposeLabel;
    juce::TextButton resetTransposeButton { "0" };

    juce::Slider speedSlider;
    juce::Label speedLabel;
    juce::TextButton halfSpeedButton { "0.5x" };
    juce::TextButton normalSpeedButton { "1.0x" };
    juce::TextButton doubleSpeedButton { "2.0x" };

    juce::Slider velocityScaleSlider;
    juce::Label velocityScaleLabel;

    juce::Slider velocityOffsetSlider;
    juce::Label velocityOffsetLabel;

    // File Browser & Recursive Folder Scanner
    juce::TextButton browseButton { "Open File..." };
    juce::TextButton scanFolderButton { "Scan Folder..." };
    juce::TextButton loadDemoButton { "Load Demo" };
    juce::Label currentFileNameLabel;

    // APVTS Attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> transposeAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> speedAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> velocityScaleAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> velocityOffsetAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> syncModeAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> loopAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> manualTempoAttachment;

    bool isDraggingExternalFile { false };
    float currentZoomX { 1.0f };

    // Top Bar (Line 1)
    juce::ToggleButton activeToggle { "ACTIVE" };
    juce::TextButton randomDiceButton { "DICE" };
    juce::Label presetLabel;
    juce::ComboBox presetSelector;

    // Library & Files (Line 2)
    juce::ComboBox libraryFileSelector;
    juce::Array<juce::File> libraryFiles;

    // Interactive Chord Visualizer & Analysis Banner
    juce::Label chordBadge;
    juce::Label chordFormulaLabel;
    juce::Label chordNotesLabel;

    // Arpeggiator Controls Strip
    juce::ToggleButton arpToggle { "ARP" };
    juce::ComboBox arpModeSelector;
    juce::ComboBox arpRateSelector;
    juce::Slider arpOctavesSlider;
    juce::Label arpOctavesLabel;

    void setupCustomStyling();
    void updateKeyBadge();
    void updateChordVisualizer();
    void applyDawKeyMatch();
    void loadEmbeddedDemoGroove();
    void loadPresetByIndex(int index);
    void pickRandomFile();
    void updatePianoRollScale();
    void applyArpeggiator();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MidiPreviewerAudioProcessorEditor)
};

} // namespace MidiPreviewer
