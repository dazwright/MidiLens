#include "PluginEditor.h"
#include "KeyDetector.h"
#include "ChordDetector.h"
#include "ArpEngine.h"

namespace MidiPreviewer
{

ExportHandleComponent::ExportHandleComponent()
{
    setTooltip("Drag this handle directly onto a DAW MIDI track to export your modified pattern!");
}

void ExportHandleComponent::paint(juce::Graphics& g)
{
    auto bounds = getLocalBounds().toFloat().reduced(2.0f);
    g.setColour(juce::Colour(0xff2d3748));
    g.fillRoundedRectangle(bounds, 6.0f);

    juce::Colour fillColour = isMouseOverOrDragging() ? juce::Colour(0xfff59e0b) : juce::Colour(0xffd97706);
    g.setColour(fillColour.withAlpha(0.25f));
    g.fillRoundedRectangle(bounds.reduced(1.5f), 5.0f);

    g.setColour(fillColour);
    g.drawRoundedRectangle(bounds, 6.0f, 1.5f);

    g.setFont(juce::Font(11.0f, juce::Font::bold));
    g.setColour(juce::Colours::white);
    g.drawText("DRAG TO DAW", bounds.removeFromTop(16.0f), juce::Justification::centred);

    g.setFont(juce::Font(9.5f));
    g.setColour(juce::Colour(0xfffcd34d));
    g.drawText("+ Export .MID", bounds, juce::Justification::centred);
}

void ExportHandleComponent::mouseDrag(const juce::MouseEvent& e)
{
    if (e.getDistanceFromDragStart() > 4)
    {
        if (onExportFileRequested != nullptr)
        {
            auto exportedFile = onExportFileRequested();
            if (exportedFile.existsAsFile())
            {
                juce::StringArray filesToDrag;
                filesToDrag.add(exportedFile.getFullPathName());

                if (auto* container = juce::DragAndDropContainer::findParentDragContainerFor(this))
                {
                    container->performExternalDragDropOfFiles(filesToDrag, false, this);
                }
            }
        }
    }
}

MidiPreviewerAudioProcessorEditor::MidiPreviewerAudioProcessorEditor(MidiPreviewerAudioProcessor& processor)
    : AudioProcessorEditor(processor),
      audioProcessor(processor)
{
    setSize(980, 680);
    setResizable(true, true);
    setResizeLimits(850, 580, 1600, 1100);

    setLookAndFeel(&lookAndFeel);
    setupCustomStyling();

    pianoRoll.onSeekRequested = [this](double ppq) {
        AudioCommand cmd;
        cmd.type = AudioCommandType::SeekPositionPpq;
        cmd.doubleParam = ppq;
        audioProcessor.sendAudioCommand(cmd);
    };

    pianoRoll.onSequenceEdited = [this](const std::vector<PlaybackEvent>& modified) {
        if (auto currentSnap = audioProcessor.getSequenceSnapshot())
        {
            auto updatedSnap = std::make_shared<SequenceSnapshot>(*currentSnap);
            updatedSnap->events = modified;

            std::array<float, 12> pitchWeights {};
            for (const auto& ev : modified)
            {
                if (ev.message.isNoteOn())
                {
                    int pitchClass = ev.message.getNoteNumber() % 12;
                    pitchWeights[static_cast<size_t>(pitchClass)] += static_cast<float>(ev.ppqDuration) * ev.message.getFloatVelocity();
                }
            }
            KeyDetector detector;
            auto keyRes = detector.analyzeNoteWeights(pitchWeights);
            updatedSnap->detectedKeyName = keyRes.keyName;
            updatedSnap->detectedRootPitch = keyRes.rootPitch;
            updatedSnap->detectedIsMinor = keyRes.isMinor;
            updatedSnap->keyConfidence = keyRes.confidence;

            audioProcessor.setSequenceSnapshot(updatedSnap);
            updateKeyBadge();
            updateChordVisualizer();
        }
    };

    pianoRoll.onLengthChanged = [this](double newTotalPpq) {
        audioProcessor.setSequenceLength(newTotalPpq);
    };

    exportHandle.onExportFileRequested = [this]() -> juce::File {
        auto snap = audioProcessor.getSequenceSnapshot();
        if (snap == nullptr || snap->events.empty()) return {};

        MidiFileExporter::ExportOptions opts;
        opts.semitoneTranspose = static_cast<int>(transposeSlider.getValue());
        opts.speedMultiplier = static_cast<float>(speedSlider.getValue());
        opts.velocityScale = static_cast<float>(velocityScaleSlider.getValue());
        opts.velocityOffset = static_cast<int>(velocityOffsetSlider.getValue());
        opts.targetBpm = audioProcessor.getHostBpm();
        opts.trackName = snap->sequenceName + " (Transposed)";

        return MidiFileExporter::writeToTempFile(*snap, opts);
    };

    // Playback buttons
    playButton.onClick = [this]() {
        AudioCommand cmd;
        cmd.type = AudioCommandType::StartPlayback;
        audioProcessor.sendAudioCommand(cmd);
    };

    stopButton.onClick = [this]() {
        AudioCommand cmd;
        cmd.type = AudioCommandType::StopPlayback;
        audioProcessor.sendAudioCommand(cmd);
    };

    // Dice Random Picker
    randomDiceButton.onClick = [this]() {
        pickRandomFile();
    };

    // Preset Selector
    presetSelector.onChange = [this]() {
        int id = presetSelector.getSelectedId();
        if (id > 0)
            loadPresetByIndex(id);
    };

    // Library file dropdown selection
    libraryFileSelector.onChange = [this]() {
        int id = libraryFileSelector.getSelectedId();
        if (id > 0 && id <= libraryFiles.size())
        {
            auto file = libraryFiles[id - 1];
            audioProcessor.loadMidiSequenceFromFile(file);
            currentFileNameLabel.setText(file.getFileName(), juce::dontSendNotification);
            pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
            updateKeyBadge();
            updateChordVisualizer();
        }
    };

    // File Browser
    browseButton.onClick = [this]() {
        auto fileChooser = std::make_shared<juce::FileChooser>(
            "Select MIDI File to Preview",
            juce::File::getSpecialLocation(juce::File::userMusicDirectory),
            "*.mid;*.midi");

        fileChooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectFiles,
            [this, fileChooser](const juce::FileChooser& chooser) {
                auto result = chooser.getResult();
                if (result.existsAsFile())
                {
                    audioProcessor.loadMidiSequenceFromFile(result);
                    currentFileNameLabel.setText(result.getFileName(), juce::dontSendNotification);
                    pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
                    updateKeyBadge();
                    updateChordVisualizer();
                }
            });
    };

    // Recursive Folder Scanner
    scanFolderButton.onClick = [this]() {
        auto fileChooser = std::make_shared<juce::FileChooser>(
            "Scan Folder on Hard Drive for MIDI Files (Recursive)",
            juce::File::getSpecialLocation(juce::File::userMusicDirectory));

        fileChooser->launchAsync(juce::FileBrowserComponent::openMode | juce::FileBrowserComponent::canSelectDirectories,
            [this, fileChooser](const juce::FileChooser& chooser) {
                auto dir = chooser.getResult();
                if (dir.isDirectory())
                {
                    libraryFiles = MidiPreviewerAudioProcessor::scanFolderForMidiFiles(dir, true);
                    libraryFileSelector.clear(juce::dontSendNotification);

                    if (!libraryFiles.isEmpty())
                    {
                        for (int i = 0; i < libraryFiles.size(); ++i)
                        {
                            libraryFileSelector.addItem(libraryFiles[i].getFileName(), i + 1);
                        }
                        libraryFileSelector.setSelectedId(1, juce::dontSendNotification);

                        audioProcessor.loadMidiSequenceFromFile(libraryFiles[0]);
                        currentFileNameLabel.setText(libraryFiles[0].getFileName() + " (" + juce::String(libraryFiles.size()) + " files in library)", juce::dontSendNotification);
                        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
                        updateKeyBadge();
                        updateChordVisualizer();
                    }
                    else
                    {
                        currentFileNameLabel.setText("No .mid files in " + dir.getFileName(), juce::dontSendNotification);
                    }
                }
            });
    };

    loadDemoButton.onClick = [this]() { loadEmbeddedDemoGroove(); };
    dawMatchButton.onClick = [this]() { applyDawKeyMatch(); };
    resetTransposeButton.onClick = [this]() { transposeSlider.setValue(0.0); };

    // Quantize Time
    quantizeTimeButton.onClick = [this]() {
        int idx = quantizeGridSelector.getSelectedId();
        double grid = (idx == 1) ? 1.0 : (idx == 2) ? 0.5 : (idx == 3) ? 0.25 : (idx == 4) ? 0.125 : (idx == 5) ? 0.333333 : 0.25;
        audioProcessor.quantizeTiming(grid);
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
    };

    // Quantize Scale
    quantizeScaleButton.onClick = [this]() {
        int root = scaleRootSelector.getSelectedId() - 1;
        MusicalScale scale = static_cast<MusicalScale>(scaleTypeSelector.getSelectedId() - 1);
        audioProcessor.quantizeScale(root, scale);
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
    };

    // Sync to Project Key
    syncProjectKeyButton.onClick = [this]() {
        int projRoot = projectKeyRootSelector.getSelectedId() - 1;
        int projScale = projectScaleTypeSelector.getSelectedId();
        bool isMinor = (projScale == 2);
        auto keyRes = audioProcessor.getDetectedKey();
        if (keyRes.keyName.isNotEmpty())
        {
            int semitones = keyRes.semitonesToTarget(projRoot, isMinor);
            transposeSlider.setValue(semitones);
        }
    };

    matchTargetKeyButton.onClick = [this]() {
        int targetRoot = targetKeyRootSelector.getSelectedId() - 1;
        bool isMinor = (targetScaleTypeSelector.getSelectedId() == 2);
        auto keyRes = audioProcessor.getDetectedKey();
        if (keyRes.keyName.isNotEmpty())
        {
            int semitones = keyRes.semitonesToTarget(targetRoot, isMinor);
            transposeSlider.setValue(semitones);
        }
    };

    // Harmonize Buttons
    harmUp3rdButton.onClick   = [this]() { audioProcessor.harmonizeNotes(4); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown3rdButton.onClick = [this]() { audioProcessor.harmonizeNotes(-4); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmUp5thButton.onClick   = [this]() { audioProcessor.harmonizeNotes(7); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown5thButton.onClick = [this]() { audioProcessor.harmonizeNotes(-7); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmUp8veButton.onClick   = [this]() { audioProcessor.harmonizeNotes(12); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown8veButton.onClick = [this]() { audioProcessor.harmonizeNotes(-12); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };

    auto onScaleChanged = [this]() { updatePianoRollScale(); };
    scaleRootSelector.onChange = onScaleChanged;
    scaleTypeSelector.onChange = onScaleChanged;
    scaleLockToggle.onClick    = onScaleChanged;

    // Arpeggiator Trigger
    auto onArpChanged = [this]() { applyArpeggiator(); };
    arpToggle.onClick = onArpChanged;
    arpModeSelector.onChange = onArpChanged;
    arpRateSelector.onChange = onArpChanged;
    arpOctavesSlider.onValueChange = onArpChanged;

    // Humanize Button
    humanizeButton.onClick = [this]() {
        int range = static_cast<int>(humanizeRangeSlider.getValue());
        audioProcessor.humanizeVelocity(range);
        audioProcessor.humanizeTiming(0.03);
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
    };

    // Length & Zoom Buttons
    doubleLengthButton.onClick = [this]() { pianoRoll.doubleSequenceLength(); };
    halveLengthButton.onClick  = [this]() { pianoRoll.halveSequenceLength(); };

    zoomInButton.onClick = [this]() {
        currentZoomX = std::min(3.5f, currentZoomX + 0.25f);
        pianoRoll.setZoom(currentZoomX, 1.0f);
    };

    zoomOutButton.onClick = [this]() {
        currentZoomX = std::max(0.4f, currentZoomX - 0.25f);
        pianoRoll.setZoom(currentZoomX, 1.0f);
    };

    halfSpeedButton.onClick   = [this]() { speedSlider.setValue(0.5); };
    normalSpeedButton.onClick = [this]() { speedSlider.setValue(1.0); };
    doubleSpeedButton.onClick = [this]() { speedSlider.setValue(2.0); };

    transposeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramTranspose, transposeSlider);
    speedAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramSpeedMult, speedSlider);
    velocityScaleAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramVelocityScale, velocityScaleSlider);
    velocityOffsetAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramVelocityOffset, velocityOffsetSlider);
    syncModeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramSyncMode, syncModeSelector);
    loopAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramLoop, loopButton);
    manualTempoAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        audioProcessor.apvts, MidiPreviewerAudioProcessor::paramManualTempo, manualTempoSlider);

    if (audioProcessor.getSequenceSnapshot() == nullptr)
        loadEmbeddedDemoGroove();
    else
    {
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
        updateKeyBadge();
        updateChordVisualizer();
    }

    updatePianoRollScale();
    startTimerHz(30);
}

MidiPreviewerAudioProcessorEditor::~MidiPreviewerAudioProcessorEditor()
{
    stopTimer();
    setLookAndFeel(nullptr);
}

void MidiPreviewerAudioProcessorEditor::updatePianoRollScale()
{
    int root = scaleRootSelector.getSelectedId() - 1;
    MusicalScale scale = static_cast<MusicalScale>(scaleTypeSelector.getSelectedId() - 1);
    bool lock = scaleLockToggle.getToggleState();
    pianoRoll.setScale(root, scale, lock);
}

void MidiPreviewerAudioProcessorEditor::setupCustomStyling()
{
    addAndMakeVisible(pianoRoll);
    addAndMakeVisible(exportHandle);

    // Top Bar (Line 1)
    addAndMakeVisible(activeToggle);
    activeToggle.setButtonText("ACTIVE");
    activeToggle.setToggleState(true, juce::dontSendNotification);
    activeToggle.setColour(juce::ToggleButton::textColourId, juce::Colour(0xff34d399));

    addAndMakeVisible(randomDiceButton);
    randomDiceButton.setButtonText(juce::CharPointer_UTF8("\xf0\x9f\x8e\xb2")); // 🎲
    randomDiceButton.setTooltip("Pick Random MIDI Sequence from Library");

    addAndMakeVisible(presetLabel);
    presetLabel.setText("Preset:", juce::dontSendNotification);
    presetLabel.setFont(juce::Font(11.0f, juce::Font::bold));
    presetLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));

    addAndMakeVisible(presetSelector);
    presetSelector.addItem("1. Ambient Ethereal Wash (Eb Maj)", 1);
    presetSelector.addItem("2. Dark Ambient Drone (C Phryg)", 2);
    presetSelector.addItem("3. Synthwave Outrun Bass (F Min)", 3);
    presetSelector.addItem("4. Synthwave Cyber Arp (A Min)", 4);
    presetSelector.addItem("5. Deep House Velvet (A Min)", 5);
    presetSelector.addItem("6. Chicago House Stabs (C Min)", 6);
    presetSelector.addItem("7. Berlin Hypnotic Techno (C Min)", 7);
    presetSelector.addItem("8. Acid 303 Squelch (D Min)", 8);
    presetSelector.addItem("9. Neo-Soul Silk Chords (C Min)", 9);
    presetSelector.addItem("10. Lo-Fi Chill Hop (F Maj)", 10);
    presetSelector.addItem("11. Cinematic Epic (D Maj)", 11);
    presetSelector.addItem("12. Funk Clavinet (E Dorian)", 12);
    presetSelector.setSelectedId(1, juce::dontSendNotification);

    // Library & Files (Line 2)
    addAndMakeVisible(libraryFileSelector);
    libraryFileSelector.setTextWhenNoChoicesAvailable("Scan folder for files...");
    libraryFileSelector.setTextWhenNothingSelected("Library Files...");

    addAndMakeVisible(scanFolderButton);
    scanFolderButton.setButtonText("Scan Folder...");

    addAndMakeVisible(browseButton);
    browseButton.setButtonText("Open File...");

    addAndMakeVisible(loadDemoButton);
    loadDemoButton.setButtonText("Demo");

    addAndMakeVisible(currentFileNameLabel);
    currentFileNameLabel.setText("No File Loaded", juce::dontSendNotification);
    currentFileNameLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    currentFileNameLabel.setColour(juce::Label::textColourId, juce::Colour(0xffe2e8f0));

    // Transport
    addAndMakeVisible(playButton);
    addAndMakeVisible(stopButton);
    addAndMakeVisible(loopButton);
    loopButton.setButtonText("Loop");

    addAndMakeVisible(syncModeSelector);
    syncModeSelector.addItem("Follow DAW", 1);
    syncModeSelector.addItem("Free Audition", 2);

    addAndMakeVisible(transportStatusLabel);
    transportStatusLabel.setFont(juce::Font(11.0f));
    transportStatusLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));

    addAndMakeVisible(bpmDisplayLabel);
    bpmDisplayLabel.setFont(juce::Font(12.0f, juce::Font::bold));
    bpmDisplayLabel.setColour(juce::Label::textColourId, juce::Colour(0xfff59e0b));

    addAndMakeVisible(manualTempoSlider);
    manualTempoSlider.setSliderStyle(juce::Slider::IncDecButtons);
    manualTempoSlider.setTextBoxStyle(juce::Slider::TextBoxLeft, false, 55, 20);
    manualTempoSlider.setRange(30.0, 300.0, 1.0);
    manualTempoSlider.setTextValueSuffix(" BPM");
    manualTempoSlider.setTooltip("Manual Tempo (Active when not synced to DAW)");

    // Scale Controls
    addAndMakeVisible(scaleRootSelector);
    scaleRootSelector.addItemList(juce::StringArray { "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" }, 1);
    scaleRootSelector.setSelectedId(1, juce::dontSendNotification);

    addAndMakeVisible(scaleTypeSelector);
    scaleTypeSelector.addItemList(juce::StringArray {
        "Chromatic", "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
        "Dorian", "Phrygian", "Lydian", "Mixolydian", "Pentatonic Maj", "Pentatonic Min", "Blues"
    }, 1);
    scaleTypeSelector.setSelectedId(3, juce::dontSendNotification); // Default Natural Minor

    addAndMakeVisible(scaleLockToggle);
    scaleLockToggle.setButtonText("Scale Snap");
    scaleLockToggle.setToggleState(true, juce::dontSendNotification);

    // Quantize Controls
    addAndMakeVisible(quantizeGridSelector);
    quantizeGridSelector.addItemList(juce::StringArray { "1/4 Note", "1/8 Note", "1/16 Note", "1/32 Note", "1/8 Triplet" }, 1);
    quantizeGridSelector.setSelectedId(3, juce::dontSendNotification); // Default 1/16

    addAndMakeVisible(quantizeTimeButton);
    addAndMakeVisible(quantizeScaleButton);

    // Harmonize Controls
    addAndMakeVisible(harmUp3rdButton);
    addAndMakeVisible(harmDown3rdButton);
    addAndMakeVisible(harmUp5thButton);
    addAndMakeVisible(harmDown5thButton);
    addAndMakeVisible(harmUp8veButton);
    addAndMakeVisible(harmDown8veButton);

    // Length & Zoom
    addAndMakeVisible(doubleLengthButton);
    addAndMakeVisible(halveLengthButton);
    addAndMakeVisible(zoomInButton);
    addAndMakeVisible(zoomOutButton);

    // Musical Analysis
    addAndMakeVisible(keyDetectionBadge);
    keyDetectionBadge.setFont(juce::Font(12.0f, juce::Font::bold));
    keyDetectionBadge.setColour(juce::Label::textColourId, juce::Colour(0xff38bdf8));
    keyDetectionBadge.setColour(juce::Label::backgroundColourId, juce::Colour(0xff1e293b));

    addAndMakeVisible(confidenceLabel);
    confidenceLabel.setFont(juce::Font(10.0f));
    confidenceLabel.setColour(juce::Label::textColourId, juce::Colour(0xff64748b));

    // Interactive Chord Visualizer Banner
    addAndMakeVisible(chordBadge);
    chordBadge.setFont(juce::Font(13.0f, juce::Font::bold));
    chordBadge.setColour(juce::Label::textColourId, juce::Colour(0xfffbbf24));
    chordBadge.setColour(juce::Label::backgroundColourId, juce::Colour(0xff181a24));
    chordBadge.setText("CHORD: Cmaj7", juce::dontSendNotification);

    addAndMakeVisible(chordFormulaLabel);
    chordFormulaLabel.setFont(juce::Font(10.5f));
    chordFormulaLabel.setColour(juce::Label::textColourId, juce::Colour(0xff38bdf8));
    chordFormulaLabel.setText("Major 7th", juce::dontSendNotification);

    addAndMakeVisible(chordNotesLabel);
    chordNotesLabel.setFont(juce::Font(10.0f));
    chordNotesLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));
    chordNotesLabel.setText("Notes: C, E, G, B", juce::dontSendNotification);

    // Arpeggiator Controls Strip
    addAndMakeVisible(arpToggle);
    arpToggle.setButtonText("ARP");
    arpToggle.setColour(juce::ToggleButton::textColourId, juce::Colour(0xfff59e0b));

    addAndMakeVisible(arpModeSelector);
    arpModeSelector.addItemList(juce::StringArray { "Up", "Down", "Up/Down", "Down/Up", "Random", "Chord" }, 1);
    arpModeSelector.setSelectedId(1, juce::dontSendNotification);

    addAndMakeVisible(arpRateSelector);
    arpRateSelector.addItemList(juce::StringArray { "1/4", "1/8", "1/16", "1/32", "1/8T", "1/16T" }, 1);
    arpRateSelector.setSelectedId(3, juce::dontSendNotification); // Default 1/16

    addAndMakeVisible(arpOctavesSlider);
    arpOctavesSlider.setSliderStyle(juce::Slider::IncDecButtons);
    arpOctavesSlider.setTextBoxStyle(juce::Slider::TextBoxLeft, false, 45, 18);
    arpOctavesSlider.setRange(1.0, 4.0, 1.0);
    arpOctavesSlider.setValue(1.0);

    addAndMakeVisible(arpOctavesLabel);
    arpOctavesLabel.setText("Oct:", juce::dontSendNotification);
    arpOctavesLabel.setFont(juce::Font(10.0f));
    arpOctavesLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));

    // Sliders
    auto configureSlider = [this](juce::Slider& s, juce::Label& l, const juce::String& text) {
        addAndMakeVisible(s);
        addAndMakeVisible(l);
        s.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
        s.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 55, 18);
        l.setText(text, juce::dontSendNotification);
        l.setFont(juce::Font(11.0f, juce::Font::bold));
        l.setJustificationType(juce::Justification::centred);
        l.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));
    };

    configureSlider(transposeSlider, transposeLabel, "TRANSPOSE");
    transposeSlider.setName("transpose");
    addAndMakeVisible(resetTransposeButton);

    configureSlider(speedSlider, speedLabel, "SPEED");
    speedSlider.setName("speed");
    addAndMakeVisible(halfSpeedButton);
    addAndMakeVisible(normalSpeedButton);
    addAndMakeVisible(doubleSpeedButton);

    configureSlider(velocityScaleSlider, velocityScaleLabel, "VEL SCALE");
    velocityScaleSlider.setName("scale");
    configureSlider(velocityOffsetSlider, velocityOffsetLabel, "VEL OFFSET");
    velocityOffsetSlider.setName("offset");

    addAndMakeVisible(humanizeButton);
    addAndMakeVisible(humanizeRangeSlider);
    humanizeRangeSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    humanizeRangeSlider.setTextBoxStyle(juce::Slider::TextBoxRight, false, 40, 18);
    humanizeRangeSlider.setRange(0.0, 40.0, 1.0);
    humanizeRangeSlider.setValue(12.0);
}

void MidiPreviewerAudioProcessorEditor::resized()
{
    const int w = getWidth();
    const int h = getHeight();

    // Vertical partition (exact 1:1 synchronization with paint())
    const int topBarY = 0;
    const int topBarH = 38;

    const int libBarY = topBarY + topBarH; // 38
    const int libBarH = 34;

    const int scaleBarY = libBarY + libBarH; // 72
    const int scaleBarH = 32;

    const int bottomDeckH = 96;
    const int bottomDeckY = h - bottomDeckH;

    const int chordArpBarH = 30;
    const int chordArpBarY = bottomDeckY - chordArpBarH;

    const int pianoRollY = scaleBarY + scaleBarH; // 104
    const int pianoRollH = chordArpBarY - pianoRollY;

    // ==========================================
    // ROW 1: TOP BAR (Branding, Active, Dice, Preset, Transport)
    // ==========================================
    activeToggle.setBounds(104, 5, 75, 28);
    randomDiceButton.setBounds(182, 5, 34, 28);
    presetLabel.setBounds(222, 5, 46, 28);
    presetSelector.setBounds(270, 5, 180, 28);

    loopButton.setBounds(w - 62, 5, 52, 28);
    stopButton.setBounds(w - 114, 5, 48, 28);
    playButton.setBounds(w - 170, 5, 52, 28);
    transportStatusLabel.setBounds(w - 245, 5, 70, 28);

    // ==========================================
    // ROW 2: LIBRARY & DAW EXPORT + BPM
    // ==========================================
    libraryFileSelector.setBounds(10, libBarY + 4, 175, 26);
    scanFolderButton.setBounds(190, libBarY + 4, 105, 26);
    browseButton.setBounds(300, libBarY + 4, 80, 26);
    exportHandle.setBounds(386, libBarY + 4, 120, 26);

    syncModeSelector.setBounds(514, libBarY + 4, 115, 26);
    manualTempoSlider.setBounds(634, libBarY + 4, 95, 26);
    bpmDisplayLabel.setBounds(734, libBarY + 4, 75, 26);

    // ==========================================
    // ROW 3: SCALE SYNC & QUANTIZE
    // ==========================================
    keyDetectionBadge.setBounds(10, scaleBarY + 4, 140, 24);
    scaleRootSelector.setBounds(156, scaleBarY + 4, 48, 24);
    scaleTypeSelector.setBounds(208, scaleBarY + 4, 118, 24);
    scaleLockToggle.setBounds(330, scaleBarY + 4, 90, 24);

    quantizeGridSelector.setBounds(428, scaleBarY + 4, 95, 24);
    quantizeTimeButton.setBounds(528, scaleBarY + 4, 92, 24);

    harmUp3rdButton.setBounds(628, scaleBarY + 4, 40, 24);
    harmDown3rdButton.setBounds(671, scaleBarY + 4, 40, 24);
    harmUp5thButton.setBounds(714, scaleBarY + 4, 40, 24);
    harmDown5thButton.setBounds(757, scaleBarY + 4, 40, 24);
    harmUp8veButton.setBounds(800, scaleBarY + 4, 40, 24);

    // ==========================================
    // CENTER: PIANO ROLL CANVAS (EDGES MATCH WINDOW, INTERNAL RULER & KEYS)
    // ==========================================
    pianoRoll.setBounds(0, pianoRollY, w, pianoRollH);

    // ==========================================
    // ROW 4: REAL-TIME CHORD VISUALIZER & ARPEGGIATOR BAR
    // ==========================================
    chordBadge.setBounds(12, chordArpBarY + 3, 125, 24);
    chordFormulaLabel.setBounds(140, chordArpBarY + 3, 105, 24);
    chordNotesLabel.setBounds(248, chordArpBarY + 3, 170, 24);

    arpToggle.setBounds(430, chordArpBarY + 3, 56, 24);
    arpModeSelector.setBounds(490, chordArpBarY + 3, 82, 24);
    arpRateSelector.setBounds(576, chordArpBarY + 3, 72, 24);
    arpOctavesLabel.setBounds(652, chordArpBarY + 3, 28, 24);
    arpOctavesSlider.setBounds(682, chordArpBarY + 3, 50, 24);

    doubleLengthButton.setBounds(w - 194, chordArpBarY + 3, 65, 24);
    halveLengthButton.setBounds(w - 126, chordArpBarY + 3, 65, 24);
    zoomInButton.setBounds(w - 58, chordArpBarY + 3, 24, 24);
    zoomOutButton.setBounds(w - 32, chordArpBarY + 3, 24, 24);

    // ==========================================
    // ROW 5: BOTTOM ROTARY DECK (4 MODULAR WELLS)
    // ==========================================
    // Card 1: TRANSPOSE
    transposeLabel.setBounds(8, bottomDeckY + 8, 140, 16);
    transposeSlider.setBounds(14, bottomDeckY + 24, 75, 64);
    resetTransposeButton.setBounds(96, bottomDeckY + 40, 38, 24);

    // Card 2: SPEED
    speedLabel.setBounds(156, bottomDeckY + 8, 180, 16);
    speedSlider.setBounds(162, bottomDeckY + 24, 75, 64);
    halfSpeedButton.setBounds(246, bottomDeckY + 25, 78, 18);
    normalSpeedButton.setBounds(246, bottomDeckY + 46, 78, 18);
    doubleSpeedButton.setBounds(246, bottomDeckY + 67, 78, 18);

    // Card 3: VELOCITY DYNAMICS
    velocityScaleLabel.setBounds(348, bottomDeckY + 8, 110, 16);
    velocityOffsetLabel.setBounds(464, bottomDeckY + 8, 110, 16);
    velocityScaleSlider.setBounds(348, bottomDeckY + 24, 110, 64);
    velocityOffsetSlider.setBounds(464, bottomDeckY + 24, 110, 64);

    // Card 4: HUMANISE ENGINE
    humanizeButton.setBounds(598, bottomDeckY + 34, 115, 28);
    humanizeRangeSlider.setBounds(720, bottomDeckY + 34, std::max(120, w - 732), 28);
}

static void drawAllenHeadScrew(juce::Graphics& g, float cx, float cy)
{
    float r = 5.5f;
    // Outer milled counter-sunk ring
    g.setColour(juce::Colour(0xff18191c));
    g.fillEllipse(cx - r, cy - r, r * 2.0f, r * 2.0f);
    g.setColour(juce::Colour(0xff383b42));
    g.drawEllipse(cx - r, cy - r, r * 2.0f, r * 2.0f, 1.0f);

    // Inner Allen hex socket
    float hexR = 2.8f;
    juce::Path hex;
    for (int i = 0; i < 6; ++i)
    {
        float angle = static_cast<float>(i) * juce::MathConstants<float>::pi / 3.0f;
        float px = cx + hexR * std::cos(angle);
        float py = cy + hexR * std::sin(angle);
        if (i == 0) hex.startNewSubPath(px, py);
        else hex.lineTo(px, py);
    }
    hex.closeSubPath();
    g.setColour(juce::Colour(0xff0a0b0d));
    g.fillPath(hex);
    g.setColour(juce::Colour(0xff222428));
    g.strokePath(hex, juce::PathStrokeType(0.8f));
}

void MidiPreviewerAudioProcessorEditor::paint(juce::Graphics& g)
{
    const int w = getWidth();
    const int h = getHeight();

    // Match exact vertical geometry with resized()
    const int topBarY = 0;
    const int topBarH = 38;

    const int libBarY = topBarY + topBarH; // 38
    const int libBarH = 34;

    const int scaleBarY = libBarY + libBarH; // 72
    const int scaleBarH = 32;

    const int bottomDeckH = 96;
    const int bottomDeckY = h - bottomDeckH;

    const int chordArpBarH = 30;
    const int chordArpBarY = bottomDeckY - chordArpBarH;

    // Authentic Dark Brushed Gunmetal Anodized Aluminum Chassis
    juce::ColourGradient chassisGrad(juce::Colour(0xff1c1e22), 0.0f, 0.0f,
                                     juce::Colour(0xff141618), 0.0f, (float)h, false);
    g.setGradientFill(chassisGrad);
    g.fillRect(0, 0, w, h);

    // 1px Metallic milled edge bevels
    g.setColour(juce::Colours::white.withAlpha(0.12f));
    g.drawHorizontalLine(0, 0.0f, (float)w);
    g.setColour(juce::Colours::black.withAlpha(0.9f));
    g.drawHorizontalLine(h - 1, 0.0f, (float)w);

    // Modular Channel Strip Dividers (recessed grooved channels)
    auto drawGroove = [&](int y) {
        g.setColour(juce::Colours::black.withAlpha(0.85f));
        g.drawHorizontalLine(y, 0.0f, (float)w);
        g.setColour(juce::Colours::white.withAlpha(0.06f));
        g.drawHorizontalLine(y + 1, 0.0f, (float)w);
    };

    // Section 1: Top Bar (Header & Brand & Transport)
    g.setColour(juce::Colour(0xff1c1e22));
    g.fillRect(0, topBarY, w, topBarH);
    drawGroove(topBarY + topBarH);

    // Section 2: Library & Transport/Sync Bar
    g.setColour(juce::Colour(0xff181a1e));
    g.fillRect(0, libBarY, w, libBarH);
    drawGroove(libBarY + libBarH);

    // Section 3: Musical Key & Scale Bar
    g.setColour(juce::Colour(0xff15171a));
    g.fillRect(0, scaleBarY, w, scaleBarH);
    drawGroove(scaleBarY + scaleBarH);

    // Section 4: Chord Visualizer / CRT Display Deck Trench
    g.setColour(juce::Colour(0xff131518));
    g.fillRect(0, chordArpBarY, w, chordArpBarH);
    drawGroove(chordArpBarY);

    auto chordGlassCard = juce::Rectangle<float>(8.0f, (float)chordArpBarY + 3.0f, 416.0f, 24.0f);
    g.setColour(juce::Colour(0xff070d09)); // Deep CRT night-green
    g.fillRoundedRectangle(chordGlassCard, 4.0f);
    g.setColour(juce::Colour(0xff1b2b20));
    g.drawRoundedRectangle(chordGlassCard, 4.0f, 1.0f);

    // Section 5: Bottom Rotary Strip
    g.setColour(juce::Colour(0xff16181b));
    g.fillRect(0, bottomDeckY, w, bottomDeckH);
    drawGroove(bottomDeckY);

    // Draw the 4 Stamped Modular Control Wells at the bottom
    auto drawCardWell = [&](juce::Rectangle<float> card) {
        g.setColour(juce::Colour(0xff0c0e10));
        g.fillRoundedRectangle(card, 4.0f);
        // Stamped inner recess shadow
        g.setColour(juce::Colours::black.withAlpha(0.6f));
        g.drawRoundedRectangle(card, 4.0f, 1.0f);
        // 1px Bottom metallic highlight
        g.setColour(juce::Colours::white.withAlpha(0.05f));
        g.drawHorizontalLine(static_cast<int>(card.getBottom()), card.getX() + 2, card.getRight() - 2);
    };

    // Card 1: TRANSPOSE
    auto card1 = juce::Rectangle<float>(8.0f, (float)bottomDeckY + 6.0f, 140.0f, 84.0f);
    drawCardWell(card1);

    // Card 2: SPEED
    auto card2 = juce::Rectangle<float>(156.0f, (float)bottomDeckY + 6.0f, 180.0f, 84.0f);
    drawCardWell(card2);

    // Card 3: VELOCITY DYNAMICS
    auto card3 = juce::Rectangle<float>(344.0f, (float)bottomDeckY + 6.0f, 236.0f, 84.0f);
    drawCardWell(card3);

    // Card 4: HUMANISE ENGINE
    auto card4 = juce::Rectangle<float>(588.0f, (float)bottomDeckY + 6.0f, (float)w - 596.0f, 84.0f);
    drawCardWell(card4);

    // Card 4 Header Label
    g.setFont(juce::Font(10.5f, juce::Font::bold));
    g.setColour(juce::Colour(0xff94a3b8));
    g.drawText("HUMANISE ENGINE", juce::Rectangle<int>(598, bottomDeckY + 10, 160, 16), juce::Justification::left);

    // Milled Aluminum Hardware Brandplate on top left
    auto logoArea = juce::Rectangle<int>(10, 6, 86, 26);
    juce::ColourGradient logoGrad(juce::Colour(0xff2a2d33), (float)logoArea.getX(), (float)logoArea.getY(),
                                  juce::Colour(0xff1c1e22), (float)logoArea.getRight(), (float)logoArea.getBottom(), false);
    g.setGradientFill(logoGrad);
    g.fillRoundedRectangle(logoArea.toFloat(), 4.0f);
    g.setColour(juce::Colour(0xff3d414a));
    g.drawRoundedRectangle(logoArea.toFloat(), 4.0f, 1.0f);

    g.setFont(juce::Font(11.0f, juce::Font::bold));
    g.setColour(juce::Colours::white);
    g.drawText("MIDILENS", logoArea.withTrimmedBottom(8), juce::Justification::centred);

    g.setFont(juce::Font(7.0f, juce::Font::plain));
    g.setColour(juce::Colour(0xff94a3b8));
    g.drawText("AUDIO UNIT", logoArea.withTrimmedTop(14), juce::Justification::centred);

    // Flush-countersunk Allen-head rack screws in the four corners
    drawAllenHeadScrew(g, 14.0f, 18.0f);                      // Top-left
    drawAllenHeadScrew(g, (float)w - 14.0f, 18.0f);            // Top-right
    drawAllenHeadScrew(g, 14.0f, (float)h - 14.0f);            // Bottom-left
    drawAllenHeadScrew(g, (float)w - 14.0f, (float)h - 14.0f);  // Bottom-right

    // External file drag overlay
    if (isDraggingExternalFile)
    {
        g.setColour(juce::Colour(0x88059669));
        g.fillRect(getLocalBounds());
        g.setColour(juce::Colours::white);
        g.setFont(juce::Font(20.0f, juce::Font::bold));
        g.drawText("DROP MIDI FILE HERE TO AUDITION", getLocalBounds(), juce::Justification::centred);
    }
}

void MidiPreviewerAudioProcessorEditor::timerCallback()
{
    // Sync Playhead in Piano Roll
    double ppq = audioProcessor.getCurrentPlayheadPpq();
    pianoRoll.setPlayheadPositionPpq(ppq);

    // Host Tempo / Manual Tempo
    bool isSyncedToDaw = (syncModeSelector.getSelectedId() == 1);
    if (isSyncedToDaw)
    {
        double hostBpm = audioProcessor.getHostBpm();
        bpmDisplayLabel.setText(juce::String(hostBpm, 1) + " BPM", juce::dontSendNotification);
        manualTempoSlider.setEnabled(false);
    }
    else
    {
        float manualBpm = audioProcessor.apvts.getRawParameterValue(MidiPreviewerAudioProcessor::paramManualTempo)->load();
        bpmDisplayLabel.setText(juce::String(manualBpm, 0) + " BPM", juce::dontSendNotification);
        manualTempoSlider.setEnabled(true);
    }

    bool isPlaying = audioProcessor.isAudioPlaying() || audioProcessor.isHostPlaying();
    transportStatusLabel.setText(isPlaying ? "PLAYING" : "STOPPED", juce::dontSendNotification);
    transportStatusLabel.setColour(juce::Label::textColourId,
                                  isPlaying ? juce::Colour(0xff34d399) : juce::Colour(0xff94a3b8));

    if (playButton.getToggleState() != isPlaying)
    {
        playButton.setToggleState(isPlaying, juce::dontSendNotification);
        playButton.setButtonText(isPlaying ? "Pause" : "Play");
        playButton.repaint();
    }

    // Update Real-Time Chord Visualizer
    updateChordVisualizer();
}

void MidiPreviewerAudioProcessorEditor::updateKeyBadge()
{
    auto keyRes = audioProcessor.getDetectedKey();
    if (keyRes.keyName.isNotEmpty())
    {
        keyDetectionBadge.setText("KEY: " + keyRes.keyName, juce::dontSendNotification);
        confidenceLabel.setText(juce::String(static_cast<int>(keyRes.confidence * 100.0f)) + "% Match", juce::dontSendNotification);

        // Turn 1 User Request: Automatically update the SCALE selector to match detected key!
        scaleRootSelector.setSelectedId(keyRes.rootPitch + 1, juce::dontSendNotification);
        scaleTypeSelector.setSelectedId(keyRes.isMinor ? 3 : 2, juce::dontSendNotification); // Natural Minor (3) or Major (2)
        updatePianoRollScale();
    }
    else
    {
        keyDetectionBadge.setText("KEY: Unknown", juce::dontSendNotification);
        confidenceLabel.setText("", juce::dontSendNotification);
    }
}

void MidiPreviewerAudioProcessorEditor::updateChordVisualizer()
{
    auto pitches = pianoRoll.getCurrentlyAuditioningPitches();
    if (!pitches.empty())
    {
        auto res = ChordDetector::detectChord(pitches);
        chordBadge.setText(res.fullName, juce::dontSendNotification);
        chordFormulaLabel.setText(res.quality, juce::dontSendNotification);

        juce::String notesText = "Notes: ";
        for (size_t i = 0; i < res.pitches.size(); ++i)
        {
            if (i > 0) notesText += ", ";
            int p = res.pitches[i];
            notesText += KeyDetector::getNoteName(p % 12) + juce::String((p / 12) - 1);
        }
        chordNotesLabel.setText(notesText, juce::dontSendNotification);
    }
    else
    {
        chordBadge.setText("CHORD: None Active", juce::dontSendNotification);
        chordFormulaLabel.setText("Auditioning silence", juce::dontSendNotification);
        chordNotesLabel.setText("Click notes or play sequence", juce::dontSendNotification);
    }
}

void MidiPreviewerAudioProcessorEditor::applyArpeggiator()
{
    if (!arpToggle.getToggleState())
        return;

    auto snap = audioProcessor.getSequenceSnapshot();
    if (snap == nullptr || snap->events.empty())
        return;

    ArpMode mode = static_cast<ArpMode>(arpModeSelector.getSelectedId() - 1);
    ArpRate rate = static_cast<ArpRate>(arpRateSelector.getSelectedId() - 1);
    int octaves = static_cast<int>(arpOctavesSlider.getValue());

    auto arpeggiated = ArpEngine::processArpeggio(snap->events, snap->totalLengthPpq, mode, rate, octaves);
    if (!arpeggiated.empty())
    {
        auto updated = std::make_shared<SequenceSnapshot>(*snap);
        updated->events = arpeggiated;
        audioProcessor.setSequenceSnapshot(updated);
        pianoRoll.setSequenceSnapshot(updated);
        updateChordVisualizer();
    }
}

void MidiPreviewerAudioProcessorEditor::pickRandomFile()
{
    if (!libraryFiles.isEmpty())
    {
        int idx = juce::Random::getSystemRandom().nextInt(libraryFiles.size());
        auto chosen = libraryFiles[idx];
        audioProcessor.loadMidiSequenceFromFile(chosen);
        currentFileNameLabel.setText(chosen.getFileName(), juce::dontSendNotification);
        libraryFileSelector.setText(chosen.getFileName(), juce::dontSendNotification);
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
        updateKeyBadge();
        updateChordVisualizer();
    }
    else
    {
        int presetIdx = 1 + juce::Random::getSystemRandom().nextInt(7);
        presetSelector.setSelectedId(presetIdx, juce::sendNotificationSync);
    }
}

void MidiPreviewerAudioProcessorEditor::loadPresetByIndex(int index)
{
    auto snap = std::make_shared<SequenceSnapshot>();
    snap->timeSigNumerator = 4;
    snap->timeSigDenominator = 4;
    snap->totalLengthPpq = 16.0;

    int nextId = 1;
    auto addChord = [&](double startPpq, double durationPpq, const std::vector<int>& notes, float vel) {
        for (int n : notes)
        {
            PlaybackEvent ev;
            ev.ppqPosition = startPpq;
            ev.ppqDuration = durationPpq;
            ev.message = juce::MidiMessage::noteOn(1, n, vel);
            ev.noteId = nextId++;
            snap->events.push_back(ev);
        }
    };

    switch (index)
    {
        case 1: // Ambient Ethereal Wash (Eb Major)
            snap->sequenceName = "Ambient Ethereal Wash (Eb Major)";
            snap->nativeBpm = 68.0;
            addChord(0.0, 3.8, { 39, 51, 58, 62, 65, 70 }, 0.65f); // Ebmaj9
            addChord(4.0, 3.8, { 32, 48, 55, 60, 63, 67 }, 0.68f); // Abmaj7
            addChord(8.0, 3.8, { 36, 48, 55, 58, 63, 65 }, 0.66f); // Cm11
            addChord(12.0, 3.8, { 29, 48, 53, 56, 60, 67 }, 0.70f); // Fm9
            break;

        case 2: // Dark Ambient Drone (C Phrygian)
            snap->sequenceName = "Dark Ambient Drone (C Phrygian)";
            snap->nativeBpm = 58.0;
            addChord(0.0, 15.8, { 24, 36 }, 0.88f); // C0/C1 Sub Drone
            addChord(2.0, 5.8, { 49 }, 0.72f);      // Db2 b2 tension
            addChord(6.0, 9.8, { 56 }, 0.75f);      // Ab2 b6 tension
            addChord(10.0, 5.8, { 62 }, 0.82f);     // D3
            addChord(14.0, 1.8, { 71 }, 0.88f);     // B3
            break;

        case 3: // Synthwave Outrun Bass (F Minor)
            snap->sequenceName = "Synthwave Outrun Bass (F Minor)";
            snap->nativeBpm = 124.0;
            for (int step = 0; step < 16; ++step)
            {
                int p1 = (step < 4) ? 29 : (step < 8) ? 27 : (step < 12) ? 25 : 24;
                int p2 = p1 + 12;
                addChord(step * 1.0, 0.22, { p1 }, 0.95f);
                addChord(step * 1.0 + 0.25, 0.22, { p2 }, 0.82f);
            }
            break;

        case 4: // Synthwave Cyber Arp (A Minor)
            snap->sequenceName = "Synthwave Cyber Arp (A Minor)";
            snap->nativeBpm = 128.0;
            addChord(0.0, 3.8, { 33 }, 0.95f); // A1
            {
                std::vector<int> arp = { 57, 60, 64, 69, 64, 60, 57, 64, 69, 72, 69, 64, 60, 57, 60, 64 };
                for (size_t i = 0; i < arp.size(); ++i)
                    addChord(i * 0.25, 0.22, { arp[i] }, 0.85f);
            }
            break;

        case 5: // Deep House Velvet (A Minor)
            snap->sequenceName = "Deep House Velvet (A Minor)";
            snap->nativeBpm = 122.0;
            addChord(0.0, 0.8, { 33, 57, 60, 64, 67, 71 }, 0.90f); // Am9
            addChord(1.5, 0.8, { 57, 60, 64, 67, 71 }, 0.84f);
            addChord(2.75, 1.0, { 57, 60, 64, 67, 71 }, 0.88f);
            addChord(4.0, 0.8, { 38, 57, 60, 65, 69, 72 }, 0.88f); // Dm9
            addChord(8.0, 0.8, { 40, 59, 62, 67, 71, 74 }, 0.90f); // Em9
            addChord(12.0, 1.8, { 41, 60, 64, 67, 72 }, 0.91f);    // Fmaj7
            addChord(14.0, 1.8, { 40, 58, 62, 68 }, 0.93f);       // E7alt
            break;

        case 6: // Chicago House Stabs (C Minor)
            snap->sequenceName = "Chicago House Stabs (C Minor)";
            snap->nativeBpm = 126.0;
            addChord(0.0, 0.4, { 36, 60, 63, 67, 70 }, 0.92f); // Cm7
            addChord(1.5, 0.4, { 60, 63, 67, 70 }, 0.85f);
            addChord(2.75, 0.8, { 60, 63, 67, 70 }, 0.90f);
            addChord(4.0, 0.4, { 41, 60, 63, 68, 72 }, 0.90f); // Fm7
            addChord(8.0, 0.4, { 43, 62, 65, 68, 72 }, 0.92f); // Gm7
            addChord(12.0, 0.4, { 32, 59, 63, 67, 70 }, 0.94f); // Abmaj7
            break;

        case 7: // Berlin Hypnotic Techno (C Minor)
            snap->sequenceName = "Berlin Hypnotic Techno (C Minor)";
            snap->nativeBpm = 132.0;
            {
                std::vector<int> tech = { 36, 48, 51, 36, 55, 48, 58, 51, 36, 60, 58, 55, 51, 48, 36, 48 };
                for (size_t i = 0; i < tech.size(); ++i)
                    addChord(i * 0.25, 0.22, { tech[i] }, (i % 4 == 0) ? 0.98f : 0.78f);
            }
            break;

        case 8: // Acid 303 Squelch (D Minor)
            snap->sequenceName = "Acid 303 Squelch (D Minor)";
            snap->nativeBpm = 130.0;
            {
                std::vector<int> acid = { 38, 38, 50, 41, 38, 45, 53, 50, 38, 38, 57, 41, 38, 48, 55, 50 };
                for (size_t i = 0; i < acid.size(); ++i)
                    addChord(i * 0.25, 0.22, { acid[i] }, (i % 3 == 0) ? 0.98f : 0.75f);
            }
            break;

        case 9: // Neo-Soul Silk Chords (C Minor)
            snap->sequenceName = "Neo-Soul Silk Chords (C Minor)";
            snap->nativeBpm = 104.0;
            addChord(0.0, 3.8, { 36, 63, 67, 70, 74 }, 0.75f); // Cm9
            addChord(4.0, 3.8, { 41, 63, 68, 72, 79 }, 0.78f); // Fm9
            addChord(8.0, 3.8, { 46, 62, 68, 72, 79 }, 0.82f); // Bb13
            addChord(12.0, 3.8, { 39, 62, 67, 70, 77 }, 0.74f); // Ebmaj9
            break;

        case 10: // Lo-Fi Chill Hop (F Major)
            snap->sequenceName = "Lo-Fi Chill Hop (F Major)";
            snap->nativeBpm = 84.0;
            addChord(0.0, 3.6, { 41, 57, 60, 64, 67 }, 0.72f); // Fmaj9
            addChord(4.0, 3.6, { 38, 57, 60, 65, 69 }, 0.75f); // Dm9
            addChord(8.0, 3.6, { 43, 58, 62, 65, 69 }, 0.74f); // Gm9
            addChord(12.0, 3.6, { 36, 55, 58, 62, 65 }, 0.76f); // C9sus4
            break;

        case 11: // Cinematic Epic (D Major)
            snap->sequenceName = "Cinematic Epic (D Major)";
            snap->nativeBpm = 96.0;
            addChord(0.0, 3.8, { 38, 45, 50, 54, 57, 64 }, 0.88f); // D(add9)
            addChord(4.0, 3.8, { 35, 42, 47, 50, 54, 57 }, 0.86f); // Bm7
            addChord(8.0, 3.8, { 31, 38, 43, 47, 50, 57 }, 0.89f); // G(add9)
            addChord(12.0, 3.8, { 33, 40, 45, 49, 52, 59 }, 0.91f); // A(sus4)
            break;

        case 12: // Funk Clavinet (E Dorian)
        default:
            snap->sequenceName = "Funk Clavinet (E Dorian)";
            snap->nativeBpm = 114.0;
            addChord(0.0, 0.4, { 28 }, 0.95f);
            addChord(0.75, 0.3, { 55, 62, 64 }, 0.88f);
            addChord(4.0, 0.4, { 33 }, 0.92f);
            addChord(4.75, 0.35, { 55, 61, 64, 69 }, 0.89f);
            addChord(8.0, 0.4, { 35 }, 0.93f);
            addChord(8.75, 0.35, { 57, 62, 66 }, 0.91f);
            addChord(12.0, 0.4, { 28 }, 0.96f);
            break;
    }

    KeyDetector detector;
    std::array<float, 12> pitchWeights {};
    for (const auto& ev : snap->events)
    {
        int pc = ev.message.getNoteNumber() % 12;
        pitchWeights[static_cast<size_t>(pc)] += static_cast<float>(ev.ppqDuration) * ev.message.getFloatVelocity();
    }
    auto keyRes = detector.analyzeNoteWeights(pitchWeights);
    snap->detectedKeyName = keyRes.keyName;
    snap->detectedRootPitch = keyRes.rootPitch;
    snap->detectedIsMinor = keyRes.isMinor;
    snap->keyConfidence = keyRes.confidence;

    audioProcessor.setSequenceSnapshot(snap);
    pianoRoll.setSequenceSnapshot(snap);
    currentFileNameLabel.setText(snap->sequenceName, juce::dontSendNotification);
    updateKeyBadge();
    updateChordVisualizer();
}

void MidiPreviewerAudioProcessorEditor::applyDawKeyMatch()
{
    auto keyRes = audioProcessor.getDetectedKey();
    if (keyRes.keyName.isEmpty()) return;

    int selectedId = targetKeySelector.getSelectedId() - 1;
    int targetRoot = selectedId % 12;
    bool targetIsMinor = (selectedId >= 12);

    int semitones = keyRes.semitonesToTarget(targetRoot, targetIsMinor);
    transposeSlider.setValue(semitones);
}

void MidiPreviewerAudioProcessorEditor::loadEmbeddedDemoGroove()
{
    loadPresetByIndex(1);
}

bool MidiPreviewerAudioProcessorEditor::isInterestedInFileDrag(const juce::StringArray& files)
{
    for (const auto& f : files)
    {
        if (f.endsWithIgnoreCase(".mid") || f.endsWithIgnoreCase(".midi")) return true;
    }
    return false;
}

void MidiPreviewerAudioProcessorEditor::fileDragEnter(const juce::StringArray& /*files*/, int /*x*/, int /*y*/)
{
    isDraggingExternalFile = true;
    repaint();
}

void MidiPreviewerAudioProcessorEditor::fileDragExit(const juce::StringArray& /*files*/)
{
    isDraggingExternalFile = false;
    repaint();
}

void MidiPreviewerAudioProcessorEditor::filesDropped(const juce::StringArray& files, int /*x*/, int /*y*/)
{
    isDraggingExternalFile = false;
    for (const auto& f : files)
    {
        if (f.endsWithIgnoreCase(".mid") || f.endsWithIgnoreCase(".midi"))
        {
            juce::File midiFile(f);
            audioProcessor.loadMidiSequenceFromFile(midiFile);
            currentFileNameLabel.setText(midiFile.getFileName(), juce::dontSendNotification);
            pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
            updateKeyBadge();
            updateChordVisualizer();
            break;
        }
    }
    repaint();
}

} // namespace MidiPreviewer
