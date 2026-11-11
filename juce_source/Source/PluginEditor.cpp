#include "PluginEditor.h"
#include "KeyDetector.h"

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

    g.setFont(juce::FontOptions(11.0f).withStyle("Bold"));
    g.setColour(juce::Colours::white);
    g.drawText("DRAG TO DAW", bounds.removeFromTop(16.0f), juce::Justification::centred);

    g.setFont(juce::FontOptions(9.5f));
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
    : AudioProcessorEditor(&processor),
      audioProcessor(processor)
{
    setSize(960, 640);
    setResizable(true, true);
    setResizeLimits(800, 540, 1600, 1000);

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
                    auto foundFiles = MidiPreviewerAudioProcessor::scanFolderForMidiFiles(dir, true);
                    if (!foundFiles.isEmpty())
                    {
                        // Auto-load first discovered file and show count
                        audioProcessor.loadMidiSequenceFromFile(foundFiles[0]);
                        currentFileNameLabel.setText(foundFiles[0].getFileName() + " (1 of " + juce::String(foundFiles.size()) + ")", juce::dontSendNotification);
                        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
                        updateKeyBadge();
                    }
                    else
                    {
                        currentFileNameLabel.setText("No .mid files found in " + dir.getFileName(), juce::dontSendNotification);
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
        double grid = (idx == 1) ? 1.0 : (idx == 2) ? 0.5 : (idx == 3) ? 0.25 : (idx == 4) ? 0.125 : 0.25;
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
        scaleRootSelector.setSelectedId(projRoot + 1, juce::dontSendNotification);
        scaleTypeSelector.setSelectedId(projScale, juce::dontSendNotification);
        updatePianoRollScale();

        auto detected = audioProcessor.getDetectedKey();
        if (detected.keyName.isNotEmpty())
        {
            int semitones = detected.semitonesToTarget(projRoot, projScale == 3);
            transposeSlider.setValue(semitones);
        }
    };

    // Match Target Key
    matchTargetKeyButton.onClick = [this]() {
        int targetRoot = targetKeyRootSelector.getSelectedId() - 1;
        int targetScale = targetScaleTypeSelector.getSelectedId();
        scaleRootSelector.setSelectedId(targetRoot + 1, juce::dontSendNotification);
        scaleTypeSelector.setSelectedId(targetScale, juce::dontSendNotification);
        updatePianoRollScale();

        auto detected = audioProcessor.getDetectedKey();
        if (detected.keyName.isNotEmpty())
        {
            int semitones = detected.semitonesToTarget(targetRoot, targetScale == 3);
            transposeSlider.setValue(semitones);
        }
    };

    // Harmonize Buttons (+- 3rds, +- 5ths, +- Octaves)
    harmUp3rdButton.onClick    = [this]() { audioProcessor.harmonizeNotes(4);  pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown3rdButton.onClick  = [this]() { audioProcessor.harmonizeNotes(-3); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmUp5thButton.onClick    = [this]() { audioProcessor.harmonizeNotes(7);  pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown5thButton.onClick  = [this]() { audioProcessor.harmonizeNotes(-7); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmUp8veButton.onClick    = [this]() { audioProcessor.harmonizeNotes(12); pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };
    harmDown8veButton.onClick  = [this]() { audioProcessor.harmonizeNotes(-12);pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot()); };

    // Scale selectors and lock toggle
    auto onScaleChanged = [this]() { updatePianoRollScale(); };
    scaleRootSelector.onChange = onScaleChanged;
    scaleTypeSelector.onChange = onScaleChanged;
    scaleLockToggle.onClick    = onScaleChanged;

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

    if (audioProcessor.getSequenceSnapshot() == nullptr)
        loadEmbeddedDemoGroove();
    else
    {
        pianoRoll.setSequenceSnapshot(audioProcessor.getSequenceSnapshot());
        updateKeyBadge();
    }

    updatePianoRollScale();
    startTimerHz(35);
}

MidiPreviewerAudioProcessorEditor::~MidiPreviewerAudioProcessorEditor()
{
    stopTimer();
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

    // Top Header & Browser
    addAndMakeVisible(browseButton);
    addAndMakeVisible(scanFolderButton);
    addAndMakeVisible(loadDemoButton);
    addAndMakeVisible(currentFileNameLabel);
    currentFileNameLabel.setText("No File Loaded", juce::dontSendNotification);
    currentFileNameLabel.setFont(juce::FontOptions(13.0f).withStyle("Bold"));
    currentFileNameLabel.setColour(juce::Label::textColourId, juce::Colour(0xffe2e8f0));

    // Transport
    addAndMakeVisible(playButton);
    addAndMakeVisible(stopButton);
    addAndMakeVisible(loopButton);
    loopButton.setButtonText("Loop");

    addAndMakeVisible(syncModeSelector);
    syncModeSelector.addItem("Follow DAW Transport", 1);
    syncModeSelector.addItem("Free Standalone Audition", 2);

    addAndMakeVisible(transportStatusLabel);
    transportStatusLabel.setFont(juce::FontOptions(11.0f));
    transportStatusLabel.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));

    addAndMakeVisible(bpmDisplayLabel);
    bpmDisplayLabel.setFont(juce::FontOptions(12.0f).withStyle("Bold"));
    bpmDisplayLabel.setColour(juce::Label::textColourId, juce::Colour(0xfff59e0b));

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
    scaleLockToggle.setToggleState(true, juce::dontSendNotification);

    addAndMakeVisible(quantizeScaleButton);

    // Sync to Project Key Controls
    addAndMakeVisible(projectKeyRootSelector);
    projectKeyRootSelector.addItemList(juce::StringArray { "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" }, 1);
    projectKeyRootSelector.setSelectedId(1, juce::dontSendNotification);

    addAndMakeVisible(projectScaleTypeSelector);
    projectScaleTypeSelector.addItemList(juce::StringArray {
        "Chromatic", "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
        "Dorian", "Phrygian", "Lydian", "Mixolydian", "Pentatonic Maj", "Pentatonic Min", "Blues"
    }, 1);
    projectScaleTypeSelector.setSelectedId(3, juce::dontSendNotification);
    addAndMakeVisible(syncProjectKeyButton);

    // Target Key Controls (Selectable Scale)
    addAndMakeVisible(targetKeyRootSelector);
    targetKeyRootSelector.addItemList(juce::StringArray { "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B" }, 1);
    targetKeyRootSelector.setSelectedId(1, juce::dontSendNotification);

    addAndMakeVisible(targetScaleTypeSelector);
    targetScaleTypeSelector.addItemList(juce::StringArray {
        "Chromatic", "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
        "Dorian", "Phrygian", "Lydian", "Mixolydian", "Pentatonic Maj", "Pentatonic Min", "Blues"
    }, 1);
    targetScaleTypeSelector.setSelectedId(3, juce::dontSendNotification);
    addAndMakeVisible(matchTargetKeyButton);

    // Harmonize Buttons (+- 3rds, +- 5ths, +- Octaves)
    addAndMakeVisible(harmUp3rdButton);
    addAndMakeVisible(harmDown3rdButton);
    addAndMakeVisible(harmUp5thButton);
    addAndMakeVisible(harmDown5thButton);
    addAndMakeVisible(harmUp8veButton);
    addAndMakeVisible(harmDown8veButton);

    // Timing Quantize
    addAndMakeVisible(quantizeGridSelector);
    quantizeGridSelector.addItemList(juce::StringArray { "1/4 Note", "1/8 Note", "1/16 Note", "1/32 Note" }, 1);
    quantizeGridSelector.setSelectedId(3, juce::dontSendNotification); // 1/16
    addAndMakeVisible(quantizeTimeButton);

    // Humanize Controls
    addAndMakeVisible(humanizeButton);
    addAndMakeVisible(humanizeRangeSlider);
    humanizeRangeSlider.setRange(2, 40, 1);
    humanizeRangeSlider.setValue(18);
    humanizeRangeSlider.setSliderStyle(juce::Slider::LinearHorizontal);
    humanizeRangeSlider.setTextBoxStyle(juce::Slider::TextBoxLeft, false, 35, 18);

    // Zoom and Length Buttons
    addAndMakeVisible(doubleLengthButton);
    addAndMakeVisible(halveLengthButton);
    addAndMakeVisible(zoomInButton);
    addAndMakeVisible(zoomOutButton);

    // Musical Analysis
    addAndMakeVisible(keyDetectionBadge);
    keyDetectionBadge.setFont(juce::FontOptions(13.0f).withStyle("Bold"));
    keyDetectionBadge.setColour(juce::Label::textColourId, juce::Colour(0xff38bdf8));
    keyDetectionBadge.setColour(juce::Label::backgroundColourId, juce::Colour(0xff1e293b));

    addAndMakeVisible(confidenceLabel);
    confidenceLabel.setFont(juce::FontOptions(10.0f));
    confidenceLabel.setColour(juce::Label::textColourId, juce::Colour(0xff64748b));

    addAndMakeVisible(dawMatchButton);

    addAndMakeVisible(targetKeySelector);
    targetKeySelector.addItemList(juce::StringArray {
        "C Maj", "C# Maj", "D Maj", "Eb Maj", "E Maj", "F Maj", "F# Maj", "G Maj", "Ab Maj", "A Maj", "Bb Maj", "B Maj",
        "C Min", "C# Min", "D Min", "Eb Min", "E Min", "F Min", "F# Min", "G Min", "Ab Min", "A Min", "Bb Min", "B Min"
    }, 1);
    targetKeySelector.setSelectedId(1, juce::dontSendNotification);

    auto configureSlider = [this](juce::Slider& s, juce::Label& l, const juce::String& text) {
        addAndMakeVisible(s);
        addAndMakeVisible(l);
        s.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
        s.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 55, 18);
        l.setText(text, juce::dontSendNotification);
        l.setFont(juce::FontOptions(11.0f).withStyle("Bold"));
        l.setJustificationType(juce::Justification::centred);
        l.setColour(juce::Label::textColourId, juce::Colour(0xff94a3b8));
    };

    configureSlider(transposeSlider, transposeLabel, "TRANSPOSE");
    addAndMakeVisible(resetTransposeButton);

    configureSlider(speedSlider, speedLabel, "SPEED");
    addAndMakeVisible(halfSpeedButton);
    addAndMakeVisible(normalSpeedButton);
    addAndMakeVisible(doubleSpeedButton);

    configureSlider(velocityScaleSlider, velocityScaleLabel, "VELOCITY SCALE");
    configureSlider(velocityOffsetSlider, velocityOffsetLabel, "VEL OFFSET");
}

void MidiPreviewerAudioProcessorEditor::resized()
{
    auto area = getLocalBounds().reduced(10);

    // Header Toolbar
    auto headerArea = area.removeFromTop(38);
    browseButton.setBounds(headerArea.removeFromLeft(95).reduced(2));
    scanFolderButton.setBounds(headerArea.removeFromLeft(110).reduced(2));
    loadDemoButton.setBounds(headerArea.removeFromLeft(85).reduced(2));
    currentFileNameLabel.setBounds(headerArea.removeFromLeft(200).reduced(2));

    exportHandle.setBounds(headerArea.removeFromRight(115).reduced(2));
    bpmDisplayLabel.setBounds(headerArea.removeFromRight(75).reduced(2));
    transportStatusLabel.setBounds(headerArea.removeFromRight(80).reduced(2));

    area.removeFromTop(4);

    // Toolbar Row 1: Transport, Grid Quantize, Scale Snap, Humanize
    auto toolbar1 = area.removeFromTop(32);
    playButton.setBounds(toolbar1.removeFromLeft(50).reduced(2));
    stopButton.setBounds(toolbar1.removeFromLeft(50).reduced(2));
    loopButton.setBounds(toolbar1.removeFromLeft(60).reduced(2));
    syncModeSelector.setBounds(toolbar1.removeFromLeft(145).reduced(2));

    toolbar1.removeFromLeft(10);
    quantizeGridSelector.setBounds(toolbar1.removeFromLeft(90).reduced(2));
    quantizeTimeButton.setBounds(toolbar1.removeFromLeft(95).reduced(2));

    toolbar1.removeFromLeft(10);
    scaleRootSelector.setBounds(toolbar1.removeFromLeft(50).reduced(2));
    scaleTypeSelector.setBounds(toolbar1.removeFromLeft(115).reduced(2));
    scaleLockToggle.setBounds(toolbar1.removeFromLeft(90).reduced(2));
    quantizeScaleButton.setBounds(toolbar1.removeFromLeft(95).reduced(2));

    humanizeButton.setBounds(toolbar1.removeFromLeft(80).reduced(2));
    humanizeRangeSlider.setBounds(toolbar1.removeFromLeft(100).reduced(2));

    area.removeFromTop(4);

    // Toolbar Row 2: Zoom & Length Controls + Sync to Project Key & Target Key
    auto toolbar2 = area.removeFromTop(28);
    doubleLengthButton.setBounds(toolbar2.removeFromLeft(75).reduced(2));
    halveLengthButton.setBounds(toolbar2.removeFromLeft(75).reduced(2));
    zoomOutButton.setBounds(toolbar2.removeFromLeft(30).reduced(2));
    zoomInButton.setBounds(toolbar2.removeFromLeft(30).reduced(2));

    toolbar2.removeFromLeft(15);
    // Sync to Project Key Box
    projectKeyRootSelector.setBounds(toolbar2.removeFromLeft(45).reduced(1));
    projectScaleTypeSelector.setBounds(toolbar2.removeFromLeft(105).reduced(1));
    syncProjectKeyButton.setBounds(toolbar2.removeFromLeft(125).reduced(1));

    toolbar2.removeFromLeft(10);
    // Target Key Box
    targetKeyRootSelector.setBounds(toolbar2.removeFromLeft(45).reduced(1));
    targetScaleTypeSelector.setBounds(toolbar2.removeFromLeft(105).reduced(1));
    matchTargetKeyButton.setBounds(toolbar2.removeFromLeft(115).reduced(1));

    toolbar2.removeFromLeft(10);
    keyDetectionBadge.setBounds(toolbar2.removeFromLeft(110).reduced(2));

    area.removeFromTop(6);

    // Bottom Controls Strip
    auto bottomArea = area.removeFromBottom(115);

    // Piano Roll Canvas
    pianoRoll.setBounds(area);

    // Layout Bottom Controls: Transpose + Harmonise, Speed, Velocity
    auto transposeBox = bottomArea.removeFromLeft(150);
    transposeLabel.setBounds(transposeBox.removeFromTop(16));
    auto transposeRow = transposeBox.removeFromTop(70);
    transposeSlider.setBounds(transposeRow.removeFromLeft(95));
    resetTransposeButton.setBounds(transposeRow.removeFromLeft(35).reduced(4, 18));

    // Harmonise Box
    auto harmBox = bottomArea.removeFromLeft(220);
    auto harmLabel = harmBox.removeFromTop(16);
    auto harmRow1 = harmBox.removeFromTop(32);
    harmUp3rdButton.setBounds(harmRow1.removeFromLeft(52).reduced(2));
    harmDown3rdButton.setBounds(harmRow1.removeFromLeft(52).reduced(2));
    harmUp5thButton.setBounds(harmRow1.removeFromLeft(52).reduced(2));
    harmDown5thButton.setBounds(harmRow1.removeFromLeft(52).reduced(2));
    auto harmRow2 = harmBox.removeFromTop(32);
    harmUp8veButton.setBounds(harmRow2.removeFromLeft(52).reduced(2));
    harmDown8veButton.setBounds(harmRow2.removeFromLeft(52).reduced(2));

    auto speedBox = bottomArea.removeFromLeft(190);
    speedLabel.setBounds(speedBox.removeFromTop(16));
    auto speedRow = speedBox.removeFromTop(70);
    speedSlider.setBounds(speedRow.removeFromLeft(90));
    auto speedBtnCol = speedRow.removeFromLeft(75);
    halfSpeedButton.setBounds(speedBtnCol.removeFromTop(22).reduced(2));
    normalSpeedButton.setBounds(speedBtnCol.removeFromTop(22).reduced(2));
    doubleSpeedButton.setBounds(speedBtnCol.removeFromTop(22).reduced(2));

    auto velScaleBox = bottomArea.removeFromLeft(130);
    velocityScaleLabel.setBounds(velScaleBox.removeFromTop(16));
    velocityScaleSlider.setBounds(velScaleBox.removeFromTop(70));

    auto velOffsetBox = bottomArea.removeFromLeft(130);
    velocityOffsetLabel.setBounds(velOffsetBox.removeFromTop(16));
    velocityOffsetSlider.setBounds(velOffsetBox.removeFromTop(70));
}

void MidiPreviewerAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff090a0d));
    g.setColour(juce::Colour(0xff222630));
    g.drawRect(getLocalBounds(), 1);

    if (isDraggingExternalFile)
    {
        g.setColour(juce::Colour(0x66f59e0b));
        g.fillRect(getLocalBounds());
        g.setColour(juce::Colours::white);
        g.setFont(juce::FontOptions(22.0f).withStyle("Bold"));
        g.drawText("DROP MIDI FILE HERE TO AUDITION", getLocalBounds(), juce::Justification::centred);
    }
}

void MidiPreviewerAudioProcessorEditor::timerCallback()
{
    double ppq = audioProcessor.getCurrentPlayheadPpq();
    pianoRoll.setPlayheadPositionPpq(ppq);
    pianoRoll.setTransposeOffset(static_cast<int>(transposeSlider.getValue()));

    double hostBpm = audioProcessor.getHostBpm();
    bpmDisplayLabel.setText(juce::String(hostBpm, 1) + " BPM", juce::dontSendNotification);

    bool isPlaying = audioProcessor.isAudioPlaying() || audioProcessor.isHostPlaying();
    transportStatusLabel.setText(isPlaying ? "PLAYING" : "STOPPED", juce::dontSendNotification);
    transportStatusLabel.setColour(juce::Label::textColourId,
                                  isPlaying ? juce::Colour(0xff4ade80) : juce::Colour(0xff94a3b8));
}

void MidiPreviewerAudioProcessorEditor::updateKeyBadge()
{
    auto keyRes = audioProcessor.getDetectedKey();
    if (keyRes.keyName.isNotEmpty())
    {
        keyDetectionBadge.setText("KEY: " + keyRes.keyName, juce::dontSendNotification);
        confidenceLabel.setText(juce::String(static_cast<int>(keyRes.confidence * 100.0f)) + "% Match", juce::dontSendNotification);
    }
    else
    {
        keyDetectionBadge.setText("KEY: Unknown", juce::dontSendNotification);
        confidenceLabel.setText("", juce::dontSendNotification);
    }
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
    auto snap = std::make_shared<SequenceSnapshot>();
    snap->sequenceName = "Neo-Soul Groove (C Minor)";
    snap->nativeBpm = 110.0;
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

    addChord(0.0, 3.8, { 36, 63, 67, 70, 74 }, 0.75f);
    addChord(4.0, 3.8, { 41, 63, 68, 72, 79 }, 0.78f);
    addChord(8.0, 3.8, { 46, 62, 68, 72, 79 }, 0.82f);
    addChord(12.0, 3.8, { 39, 62, 67, 70, 77 }, 0.74f);

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
            break;
        }
    }
    repaint();
}

} // namespace MidiPreviewer
