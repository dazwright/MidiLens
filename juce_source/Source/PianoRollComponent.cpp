#include "PianoRollComponent.h"
#include "KeyDetector.h"
#include <algorithm>
#include <cmath>

namespace MidiPreviewer
{

static const std::vector<int>& getScaleIntervals(MusicalScale scale)
{
    static const std::vector<int> chromatic = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 };
    static const std::vector<int> major     = { 0, 2, 4, 5, 7, 9, 11 };
    static const std::vector<int> natMinor  = { 0, 2, 3, 5, 7, 8, 10 };
    static const std::vector<int> harmMinor = { 0, 2, 3, 5, 7, 8, 11 };
    static const std::vector<int> melMinor  = { 0, 2, 3, 5, 7, 9, 11 };
    static const std::vector<int> dorian    = { 0, 2, 3, 5, 7, 9, 10 };
    static const std::vector<int> phrygian  = { 0, 1, 3, 5, 7, 8, 10 };
    static const std::vector<int> lydian    = { 0, 2, 4, 6, 7, 9, 11 };
    static const std::vector<int> mixolyd   = { 0, 2, 4, 5, 7, 9, 10 };
    static const std::vector<int> pentMaj   = { 0, 2, 4, 7, 9 };
    static const std::vector<int> pentMin   = { 0, 3, 5, 7, 10 };
    static const std::vector<int> blues     = { 0, 3, 5, 6, 7, 10 };

    switch (scale)
    {
        case MusicalScale::Major:           return major;
        case MusicalScale::NaturalMinor:    return natMinor;
        case MusicalScale::HarmonicMinor:   return harmMinor;
        case MusicalScale::MelodicMinor:    return melMinor;
        case MusicalScale::Dorian:          return dorian;
        case MusicalScale::Phrygian:        return phrygian;
        case MusicalScale::Lydian:          return lydian;
        case MusicalScale::Mixolydian:      return mixolyd;
        case MusicalScale::PentatonicMajor: return pentMaj;
        case MusicalScale::PentatonicMinor: return pentMin;
        case MusicalScale::Blues:           return blues;
        case MusicalScale::Chromatic:
        default:                            return chromatic;
    }
}

PianoRollComponent::PianoRollComponent()
{
    setWantsKeyboardFocus(true);
}

void PianoRollComponent::setSequenceSnapshot(std::shared_ptr<const SequenceSnapshot> snapshot)
{
    currentSnapshot = snapshot;
    editableEvents.clear();
    selectedNoteIds.clear();

    if (snapshot != nullptr)
    {
        editableEvents = snapshot->events;

        int low = 127;
        int high = 0;
        for (const auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn())
            {
                low = std::min(low, ev.message.getNoteNumber());
                high = std::max(high, ev.message.getNoteNumber());
            }
        }
        if (low <= high)
        {
            minPitch = std::max(0, low - 4);
            maxPitch = std::min(127, high + 4);
        }
    }
    resized();
    repaint();
}

void PianoRollComponent::setPlayheadPositionPpq(double ppq)
{
    if (std::abs(playheadPpq - ppq) > 0.001)
    {
        playheadPpq = ppq;
        repaint();
    }
}

void PianoRollComponent::setTransposeOffset(int semitones)
{
    if (previewTranspose != semitones)
    {
        previewTranspose = semitones;
        repaint();
    }
}

void PianoRollComponent::setScale(int rootPitch, MusicalScale scale, bool enableLock)
{
    scaleRoot = rootPitch;
    currentScale = scale;
    scaleLockActive = enableLock;
    repaint();
}

void PianoRollComponent::setTimeSignature(int numerator, int denominator)
{
    timeSigNumerator = std::max(1, numerator);
    timeSigDenominator = std::max(1, denominator);
    repaint();
}

bool PianoRollComponent::isPitchInActiveScale(int pitch) const
{
    if (currentScale == MusicalScale::Chromatic)
        return true;

    int pc = (pitch % 12 + 12) % 12;
    const auto& intervals = getScaleIntervals(currentScale);
    for (int interval : intervals)
    {
        if ((scaleRoot + interval) % 12 == pc)
            return true;
    }
    return false;
}

int PianoRollComponent::snapPitchToActiveScale(int pitch) const
{
    if (currentScale == MusicalScale::Chromatic || isPitchInActiveScale(pitch))
        return pitch;

    for (int offset = 1; offset <= 6; ++offset)
    {
        int down = pitch - offset;
        if (down >= 0 && isPitchInActiveScale(down))
            return down;

        int up = pitch + offset;
        if (up <= 127 && isPitchInActiveScale(up))
            return up;
    }
    return pitch;
}

void PianoRollComponent::setZoom(float newZoomX, float newZoomY)
{
    zoomX = juce::jlimit(0.4f, 4.0f, newZoomX);
    zoomY = juce::jlimit(0.6f, 3.0f, newZoomY);
    resized();
    repaint();
}

void PianoRollComponent::doubleSequenceLength()
{
    if (currentSnapshot == nullptr)
        return;

    double oldLen = currentSnapshot->totalLengthPpq;
    double newLen = oldLen * 2.0;

    int maxId = 0;
    for (const auto& ev : editableEvents)
        maxId = std::max(maxId, ev.noteId);

    auto copied = editableEvents;
    for (auto& ev : copied)
    {
        ev.noteId = ++maxId;
        ev.ppqPosition += oldLen;
        editableEvents.push_back(ev);
    }

    if (onLengthChanged != nullptr)
        onLengthChanged(newLen);

    notifySequenceChanged();
    repaint();
}

void PianoRollComponent::halveSequenceLength()
{
    if (currentSnapshot == nullptr)
        return;

    double newLen = std::max(4.0, currentSnapshot->totalLengthPpq * 0.5);

    editableEvents.erase(
        std::remove_if(editableEvents.begin(), editableEvents.end(),
                       [newLen](const PlaybackEvent& ev) {
                           return ev.ppqPosition >= newLen;
                       }),
        editableEvents.end());

    if (onLengthChanged != nullptr)
        onLengthChanged(newLen);

    notifySequenceChanged();
    repaint();
}

void PianoRollComponent::resized()
{
    if (currentSnapshot != nullptr && currentSnapshot->totalLengthPpq > 0.0)
    {
        float availableWidth = static_cast<float>(getWidth() - pianoKeysWidth - 50);
        basePixelsPerPpq = std::max(40.0f, availableWidth / static_cast<float>(currentSnapshot->totalLengthPpq));
    }

    int pitchSpan = std::max(1, maxPitch - minPitch + 1);
    float availableHeight = static_cast<float>(getHeight() - rulerHeight);
    noteHeightPixels = std::max(8.0f, (availableHeight / static_cast<float>(pitchSpan)) * zoomY);
}

int PianoRollComponent::pitchAtY(int y) const
{
    if (y < rulerHeight)
        return -1;

    float relY = static_cast<float>(y - rulerHeight);
    int offsetFromTop = static_cast<int>(relY / noteHeightPixels);
    return juce::jlimit(minPitch, maxPitch, maxPitch - offsetFromTop);
}

double PianoRollComponent::ppqAtX(int x) const
{
    if (x < pianoKeysWidth)
        return 0.0;

    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    float relX = static_cast<float>(x - pianoKeysWidth);
    return std::max(0.0, static_cast<double>(relX / currentPixelsPerPpq));
}

juce::Rectangle<float> PianoRollComponent::getNoteRectangle(const PlaybackEvent& ev) const
{
    if (!ev.message.isNoteOn())
        return {};

    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    int pitch = ev.message.getNoteNumber() + previewTranspose;
    float x = pianoKeysWidth + static_cast<float>(ev.ppqPosition) * currentPixelsPerPpq;
    float w = std::max(6.0f, static_cast<float>(ev.ppqDuration) * currentPixelsPerPpq);
    float y = rulerHeight + static_cast<float>(maxPitch - pitch) * noteHeightPixels;
    float h = noteHeightPixels;

    return { x, y, w, h };
}

int PianoRollComponent::findNoteAt(juce::Point<int> pos, bool& outNearEdge) const
{
    outNearEdge = false;
    for (int i = static_cast<int>(editableEvents.size()) - 1; i >= 0; --i)
    {
        auto rect = getNoteRectangle(editableEvents[static_cast<size_t>(i)]);
        if (rect.contains(pos.toFloat()))
        {
            if (pos.x >= rect.getRight() - 6.0f)
                outNearEdge = true;
            return editableEvents[static_cast<size_t>(i)].noteId;
        }
    }
    return -1;
}

juce::Colour PianoRollComponent::getVelocityColour(float velocity) const
{
    // Light green lowest velocity -> yellow/amber mid -> bright red highest velocity
    float v = juce::jlimit(0.0f, 1.0f, velocity);

    if (v < 0.5f)
    {
        float t = v / 0.5f;
        // Light green (134, 239, 172) to Yellow (250, 204, 21)
        int r = static_cast<int>(134 + t * (250 - 134));
        int g = static_cast<int>(239 + t * (204 - 239));
        int b = static_cast<int>(172 + t * (21 - 172));
        return juce::Colour(static_cast<juce::uint8>(r), static_cast<juce::uint8>(g), static_cast<juce::uint8>(b));
    }
    else
    {
        float t = (v - 0.5f) / 0.5f;
        // Yellow (250, 204, 21) to Red (239, 68, 68)
        int r = static_cast<int>(250 + t * (239 - 250));
        int g = static_cast<int>(204 + t * (68 - 204));
        int b = static_cast<int>(21 + t * (68 - 21));
        return juce::Colour(static_cast<juce::uint8>(r), static_cast<juce::uint8>(g), static_cast<juce::uint8>(b));
    }
}

void PianoRollComponent::paint(juce::Graphics& g)
{
    // Authentic Phosphor CRT Screen Background
    g.fillAll(juce::Colour(0xff070d09));

    auto bounds = getLocalBounds();
    auto rulerBounds = bounds.removeFromTop(rulerHeight);
    auto velBounds = bounds.removeFromBottom(velocityBarHeight);
    auto keysBounds = bounds.removeFromLeft(pianoKeysWidth);
    auto gridBounds = bounds;

    drawGrid(g, gridBounds);
    drawPianoKeys(g, keysBounds);
    drawNotes(g, gridBounds);
    drawPlayhead(g, gridBounds);
    drawRuler(g, rulerBounds);
    drawVelocityHeatmap(g, velBounds);

    if (currentDragMode == DragMode::MarqueeSelect && !marqueeRect.isEmpty())
    {
        g.setColour(juce::Colour(0x33f59e0b));
        g.fillRect(marqueeRect);
        g.setColour(juce::Colour(0xfff59e0b));
        g.drawRect(marqueeRect, 1.0f);
    }
}

void PianoRollComponent::drawRuler(juce::Graphics& g, juce::Rectangle<int> area)
{
    g.setColour(juce::Colour(0xff161820));
    g.fillRect(area);
    g.setColour(juce::Colour(0xff2d3139));
    g.drawHorizontalLine(area.getBottom() - 1, static_cast<float>(area.getX()), static_cast<float>(area.getRight()));

    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    double totalPpq = (currentSnapshot != nullptr) ? currentSnapshot->totalLengthPpq : 16.0;
    double barPpq = static_cast<double>(timeSigNumerator) * (4.0 / static_cast<double>(timeSigDenominator));
    double beatPpq = 4.0 / static_cast<double>(timeSigDenominator);
    int numBars = static_cast<int>(std::ceil(totalPpq / barPpq)) + 2;

    g.setFont(juce::Font(11.0f, juce::Font::bold));

    for (int bar = 0; bar <= numBars; ++bar)
    {
        float x = pianoKeysWidth + static_cast<float>(static_cast<double>(bar) * barPpq) * currentPixelsPerPpq;
        if (x > area.getRight())
            break;

        g.setColour(juce::Colour(0xff64748b));
        g.drawVerticalLine(static_cast<int>(x), static_cast<float>(area.getY() + 14), static_cast<float>(area.getBottom()));

        g.setColour(juce::Colour(0xff94a3b8));
        g.drawText(juce::String(bar + 1), static_cast<int>(x) + 4, area.getY() + 2, 30, 16, juce::Justification::left);

        for (int beat = 1; beat < timeSigNumerator; ++beat)
        {
            float beatX = x + static_cast<float>(static_cast<double>(beat) * beatPpq) * currentPixelsPerPpq;
            if (beatX < area.getRight())
            {
                g.setColour(juce::Colour(0xff3f4553));
                g.drawVerticalLine(static_cast<int>(beatX), static_cast<float>(area.getY() + 20), static_cast<float>(area.getBottom()));
            }
        }
    }

    // Draggable Length Handle on Ruler
    float lengthX = pianoKeysWidth + static_cast<float>(totalPpq) * currentPixelsPerPpq;
    juce::Rectangle<float> handleRect(lengthX - 10.0f, 4.0f, 20.0f, static_cast<float>(area.getHeight() - 8));
    g.setColour(juce::Colour(0xfff59e0b));
    g.fillRoundedRectangle(handleRect, 3.0f);
    g.setColour(juce::Colour(0xff18181b));
    g.setFont(juce::Font(9.0f, juce::Font::bold));
    g.drawText("END", handleRect, juce::Justification::centred);
}

void PianoRollComponent::drawGrid(juce::Graphics& g, juce::Rectangle<int> area)
{
    for (int p = minPitch; p <= maxPitch; ++p)
    {
        float y = rulerHeight + static_cast<float>(maxPitch - p) * noteHeightPixels;
        int semitone = p % 12;
        bool isBlackKey = (semitone == 1 || semitone == 3 || semitone == 6 || semitone == 8 || semitone == 10);
        bool inScale = isPitchInActiveScale(p);

        if (!inScale && currentScale != MusicalScale::Chromatic)
        {
            // Out of scale lane: Clean, deep night-green/obsidian phosphor black
            g.setColour(isBlackKey ? juce::Colour(0xff040705) : juce::Colour(0xff060a07));
            g.fillRect(static_cast<float>(area.getX()), y, static_cast<float>(area.getWidth()), noteHeightPixels);
        }
        else
        {
            // In scale lane: Deep phosphor night-green CRT matrix
            g.setColour(isBlackKey ? juce::Colour(0xff09130d) : juce::Colour(0xff0c1911));
            g.fillRect(static_cast<float>(area.getX()), y, static_cast<float>(area.getWidth()), noteHeightPixels);
        }

        if (semitone == 0)
        {
            // Octave divider line (Phosphor green accent)
            g.setColour(juce::Colour(0xff22422d));
            g.drawHorizontalLine(static_cast<int>(y + noteHeightPixels), static_cast<float>(area.getX()), static_cast<float>(area.getRight()));
        }
        else
        {
            g.setColour(inScale ? juce::Colour(0xff142419) : juce::Colour(0xff09110c));
            g.drawHorizontalLine(static_cast<int>(y + noteHeightPixels), static_cast<float>(area.getX()), static_cast<float>(area.getRight()));
        }
    }

    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    double totalPpq = (currentSnapshot != nullptr) ? currentSnapshot->totalLengthPpq : 16.0;
    double barPpq = static_cast<double>(timeSigNumerator) * (4.0 / static_cast<double>(timeSigDenominator));
    double beatPpq = 4.0 / static_cast<double>(timeSigDenominator);
    int numBars = static_cast<int>(std::ceil(totalPpq / barPpq)) + 2;

    for (int bar = 0; bar <= numBars; ++bar)
    {
        float x = pianoKeysWidth + static_cast<float>(static_cast<double>(bar) * barPpq) * currentPixelsPerPpq;
        g.setColour(juce::Colour(0xff23422e));
        g.drawVerticalLine(static_cast<int>(x), static_cast<float>(area.getY()), static_cast<float>(area.getBottom()));

        for (int beat = 1; beat < timeSigNumerator; ++beat)
        {
            float beatX = x + static_cast<float>(static_cast<double>(beat) * beatPpq) * currentPixelsPerPpq;
            g.setColour(juce::Colour(0xff122318));
            g.drawVerticalLine(static_cast<int>(beatX), static_cast<float>(area.getY()), static_cast<float>(area.getBottom()));
        }
    }

    // Sequence end line
    float lengthX = pianoKeysWidth + static_cast<float>(totalPpq) * currentPixelsPerPpq;
    g.setColour(juce::Colour(0xfff59e0b));
    g.drawVerticalLine(static_cast<int>(lengthX), static_cast<float>(area.getY()), static_cast<float>(area.getBottom()));

    // Shading beyond end
    if (lengthX < area.getRight())
    {
        g.setColour(juce::Colour(0x88000000));
        g.fillRect(lengthX, static_cast<float>(area.getY()), area.getRight() - lengthX, static_cast<float>(area.getHeight()));
    }
}

void PianoRollComponent::drawPianoKeys(juce::Graphics& g, juce::Rectangle<int> area)
{
    g.setColour(juce::Colour(0xff09110c));
    g.fillRect(area);
    g.setFont(juce::Font(9.0f));

    for (int p = minPitch; p <= maxPitch; ++p)
    {
        float y = rulerHeight + static_cast<float>(maxPitch - p) * noteHeightPixels;
        int semitone = p % 12;
        bool isBlackKey = (semitone == 1 || semitone == 3 || semitone == 6 || semitone == 8 || semitone == 10);
        bool inScale = isPitchInActiveScale(p);

        if (isBlackKey)
        {
            g.setColour(inScale ? juce::Colour(0xff152018) : juce::Colour(0xff090f0b));
            g.fillRect(static_cast<float>(area.getX()), y, static_cast<float>(area.getWidth() - 14), noteHeightPixels - 1.0f);
        }
        else
        {
            g.setColour(inScale ? juce::Colour(0xff1b2b20) : juce::Colour(0xff0e1711));
            g.fillRect(static_cast<float>(area.getX()), y, static_cast<float>(area.getWidth()), noteHeightPixels);

            g.setColour(inScale ? juce::Colour(0xff233a2a) : juce::Colour(0xff131e17));
            g.drawHorizontalLine(static_cast<int>(y + noteHeightPixels - 1), static_cast<float>(area.getX()), static_cast<float>(area.getRight()));

            if (semitone == 0)
            {
                int octave = (p / 12) - 1;
                g.setColour(inScale ? juce::Colour(0xff34d399) : juce::Colour(0xff6b7280));
                g.drawText("C" + juce::String(octave), area.getX() + 4, static_cast<int>(y), area.getWidth() - 8, static_cast<int>(noteHeightPixels), juce::Justification::centredLeft);
            }
        }

        // Scale marker dot (Phosphor Green indicator)
        if (currentScale != MusicalScale::Chromatic)
        {
            g.setColour(inScale ? juce::Colour(0xff10b981) : juce::Colour(0xff1f2e24));
            g.fillEllipse(static_cast<float>(area.getRight() - 8), y + noteHeightPixels * 0.5f - 2.0f, inScale ? 4.0f : 2.0f, inScale ? 4.0f : 2.0f);
        }
    }

    g.setColour(juce::Colour(0xff23422e));
    g.drawVerticalLine(area.getRight() - 1, static_cast<float>(area.getY()), static_cast<float>(area.getBottom()));
}

void PianoRollComponent::drawNotes(juce::Graphics& g, juce::Rectangle<int> area)
{
    juce::Graphics::ScopedSaveState sss(g);
    g.reduceClipRegion(area);

    for (const auto& ev : editableEvents)
    {
        if (!ev.message.isNoteOn())
            continue;

        auto rect = getNoteRectangle(ev);
        bool isSelected = selectedNoteIds.count(ev.noteId) > 0;
        int effPitch = ev.message.getNoteNumber() + previewTranspose;
        bool inScale = isPitchInActiveScale(effPitch);

        // Rectangular Phosphor Traces (CRT lab equipment aesthetic)
        juce::Colour noteBase;
        if (!inScale)
            noteBase = juce::Colour(0xff3a433e);
        else if (isSelected)
            noteBase = juce::Colour(0xfff59e0b); // Warm vintage amber
        else
            noteBase = juce::Colour(0xff10b981); // Vivid phosphor green

        // Note body (flat rectangular trace)
        g.setColour(noteBase);
        g.fillRoundedRectangle(rect.reduced(0.5f, 1.0f), 2.0f);

        // Phosphor highlight top shine
        g.setColour(noteBase.brighter(0.4f).withAlpha(0.6f));
        g.fillRect(rect.getX() + 1.0f, rect.getY() + 1.0f, rect.getWidth() - 2.0f, 1.2f);

        // Outer glow border
        g.setColour(isSelected ? juce::Colour(0xfffbbf24) : (inScale ? juce::Colour(0xff34d399) : juce::Colour(0xff252c28)));
        g.drawRoundedRectangle(rect.reduced(0.5f, 1.0f), 2.0f, isSelected ? 1.8f : 1.0f);

        // Note Name text on note
        if (rect.getWidth() >= 16.0f)
        {
            int noteNum = ev.message.getNoteNumber();
            juce::String noteName = KeyDetector::getNoteName(noteNum % 12, false) + juce::String((noteNum / 12) - 1);
            g.setFont(juce::Font(juce::jmin(10.0f, rect.getHeight() - 2.0f), juce::Font::bold));
            g.setColour(isSelected ? juce::Colours::black : juce::Colours::white);
            g.drawText(noteName, rect.reduced(2.0f, 0.0f).toNearestInt(), juce::Justification::centred, true);
        }
    }
}

void PianoRollComponent::drawPlayhead(juce::Graphics& g, juce::Rectangle<int> area)
{
    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    float x = pianoKeysWidth + static_cast<float>(playheadPpq) * currentPixelsPerPpq;
    if (x < pianoKeysWidth || x > area.getRight())
        return;

    // Laser phosphor green bloom halo
    g.setColour(juce::Colour(0x3310b981));
    g.fillRect(x - 3.0f, static_cast<float>(rulerHeight), 7.0f, static_cast<float>(getHeight() - rulerHeight));

    // Sharp phosphor laser beam
    g.setColour(juce::Colour(0xff10b981));
    g.drawVerticalLine(static_cast<int>(x), static_cast<float>(rulerHeight), static_cast<float>(getHeight()));

    // Indicator head
    juce::Path triangle;
    triangle.addTriangle(x - 6.0f, static_cast<float>(rulerHeight - 12),
                         x + 6.0f, static_cast<float>(rulerHeight - 12),
                         x, static_cast<float>(rulerHeight));
    g.fillPath(triangle);
}

void PianoRollComponent::copySelectedNotes()
{
    noteClipboard.clear();
    if (selectedNoteIds.empty())
        return;

    double minPpq = 1e9;
    for (const auto& ev : editableEvents)
    {
        if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
            minPpq = std::min(minPpq, ev.ppqPosition);
    }

    for (const auto& ev : editableEvents)
    {
        if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
        {
            ClipboardNote c;
            c.pitch = ev.message.getNoteNumber();
            c.offsetPpq = ev.ppqPosition - minPpq;
            c.durationPpq = ev.ppqDuration;
            c.velocity = ev.message.getFloatVelocity();
            c.channel = ev.message.getChannel();
            noteClipboard.push_back(c);
        }
    }
}

void PianoRollComponent::cutSelectedNotes()
{
    copySelectedNotes();
    if (!selectedNoteIds.empty())
    {
        editableEvents.erase(
            std::remove_if(editableEvents.begin(), editableEvents.end(),
                           [this](const PlaybackEvent& ev) {
                               return selectedNoteIds.count(ev.noteId) > 0;
                           }),
            editableEvents.end());

        selectedNoteIds.clear();
        notifySequenceChanged();
        repaint();
    }
}

void PianoRollComponent::pasteNotesAt(double targetPpq, int targetPitch)
{
    if (noteClipboard.empty())
        return;

    int maxId = 0;
    for (const auto& ev : editableEvents)
        maxId = std::max(maxId, ev.noteId);

    selectedNoteIds.clear();
    double basePpq = std::max(0.0, targetPpq);

    for (const auto& clip : noteClipboard)
    {
        PlaybackEvent ev;
        ev.noteId = ++maxId;
        ev.ppqPosition = basePpq + clip.offsetPpq;
        ev.ppqDuration = clip.durationPpq;

        int pitch = clip.pitch;
        if (targetPitch >= 0 && noteClipboard.size() == 1)
            pitch = targetPitch;

        if (scaleLockActive && currentScale != MusicalScale::Chromatic)
            pitch = snapPitchToActiveScale(pitch);

        pitch = juce::jlimit(0, 127, pitch);
        ev.message = juce::MidiMessage::noteOn(clip.channel > 0 ? clip.channel : 1, pitch, clip.velocity);

        editableEvents.push_back(ev);
        selectedNoteIds.insert(ev.noteId);
    }

    notifySequenceChanged();
    repaint();
}

void PianoRollComponent::mouseDown(const juce::MouseEvent& e)
{
    grabKeyboardFocus();
    dragStartPos = e.getPosition();

    if (e.mods.isPopupMenu())
    {
        juce::PopupMenu m;
        m.addItem(1, "Add Note");
        m.addSeparator();

        m.addItem(2, "Cut", !selectedNoteIds.empty());
        m.addItem(3, "Copy", !selectedNoteIds.empty());
        m.addItem(4, "Paste", !noteClipboard.empty());

        if (!selectedNoteIds.empty())
        {
            m.addSeparator();
            m.addItem(5, "Delete Selected Note(s)");
            m.addItem(6, "Duplicate Selected Note(s)");
            m.addItem(7, "Octave Up (+12)");
            m.addItem(8, "Octave Down (-12)");
        }
        m.addSeparator();
        m.addItem(9, "Select All Notes");
        m.addItem(10, "Deselect All");

        m.showMenuAsync(juce::PopupMenu::Options().withTargetScreenArea(juce::Rectangle<int>(e.getScreenPosition().x, e.getScreenPosition().y, 1, 1)),
            [this, e](int result)
            {
                if (result == 1) // Add Note
                {
                    int pitch = pitchAtY(e.y);
                    if (scaleLockActive && currentScale != MusicalScale::Chromatic)
                        pitch = snapPitchToActiveScale(pitch);

                    double ppq = std::max(0.0, std::round(ppqAtX(e.x) * 4.0) / 4.0);

                    PlaybackEvent newEv;
                    newEv.ppqPosition = ppq;
                    newEv.ppqDuration = 1.0;
                    newEv.message = juce::MidiMessage::noteOn(1, pitch, 0.75f);

                    int maxId = 0;
                    for (const auto& ev : editableEvents)
                        maxId = std::max(maxId, ev.noteId);
                    newEv.noteId = maxId + 1;

                    editableEvents.push_back(newEv);
                    selectedNoteIds.clear();
                    selectedNoteIds.insert(newEv.noteId);

                    if (onSequenceEdited != nullptr)
                        onSequenceEdited(editableEvents);
                    repaint();
                }
                else if (result == 2) // Cut
                {
                    cutSelectedNotes();
                }
                else if (result == 3) // Copy
                {
                    copySelectedNotes();
                }
                else if (result == 4) // Paste
                {
                    pasteNotesAt(std::max(0.0, std::round(ppqAtX(e.x) * 4.0) / 4.0), pitchAtY(e.y));
                }
                else if (result == 5) // Delete Selected
                {
                    editableEvents.erase(
                        std::remove_if(editableEvents.begin(), editableEvents.end(),
                            [this](const PlaybackEvent& ev) { return selectedNoteIds.count(ev.noteId) > 0; }),
                        editableEvents.end());
                    selectedNoteIds.clear();
                    if (onSequenceEdited != nullptr)
                        onSequenceEdited(editableEvents);
                    repaint();
                }
                else if (result == 6) // Duplicate Selected
                {
                    std::vector<PlaybackEvent> dups;
                    int maxId = 0;
                    for (const auto& ev : editableEvents)
                        maxId = std::max(maxId, ev.noteId);

                    for (const auto& ev : editableEvents)
                    {
                        if (selectedNoteIds.count(ev.noteId) > 0)
                        {
                            PlaybackEvent d = ev;
                            d.noteId = ++maxId;
                            d.ppqPosition += d.ppqDuration;
                            dups.push_back(d);
                        }
                    }
                    selectedNoteIds.clear();
                    for (const auto& d : dups)
                    {
                        selectedNoteIds.insert(d.noteId);
                        editableEvents.push_back(d);
                    }
                    if (onSequenceEdited != nullptr)
                        onSequenceEdited(editableEvents);
                    repaint();
                }
                else if (result == 7) // Octave Up
                {
                    for (auto& ev : editableEvents)
                    {
                        if (selectedNoteIds.count(ev.noteId) > 0)
                        {
                            int np = std::min(127, ev.message.getNoteNumber() + 12);
                            ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), np, ev.message.getFloatVelocity());
                        }
                    }
                    if (onSequenceEdited != nullptr)
                        onSequenceEdited(editableEvents);
                    repaint();
                }
                else if (result == 8) // Octave Down
                {
                    for (auto& ev : editableEvents)
                    {
                        if (selectedNoteIds.count(ev.noteId) > 0)
                        {
                            int np = std::max(0, ev.message.getNoteNumber() - 12);
                            ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), np, ev.message.getFloatVelocity());
                        }
                    }
                    if (onSequenceEdited != nullptr)
                        onSequenceEdited(editableEvents);
                    repaint();
                }
                else if (result == 9) // Select All
                {
                    selectAllNotes();
                }
                else if (result == 10) // Deselect All
                {
                    deselectAllNotes();
                }
            });
        return;
    }

    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;
    double totalPpq = (currentSnapshot != nullptr) ? currentSnapshot->totalLengthPpq : 16.0;
    float lengthX = pianoKeysWidth + static_cast<float>(totalPpq) * currentPixelsPerPpq;

    // Check if clicked the Draggable Length Handle in the ruler
    if (e.y <= rulerHeight && std::abs(static_cast<float>(e.x) - lengthX) <= 14.0f)
    {
        currentDragMode = DragMode::DragLengthHandle;
        dragInitialTotalLength = totalPpq;
        return;
    }

    if (e.y <= rulerHeight)
    {
        currentDragMode = DragMode::ScrubRuler;
        double newPpq = ppqAtX(e.x);
        if (onSeekRequested != nullptr)
            onSeekRequested(newPpq);
        return;
    }

    // Check if clicked the Velocity Heatmap Bar at the bottom
    if (e.y >= getHeight() - velocityBarHeight)
    {
        // "SELECT ALL" button on left
        if (e.x <= 84)
        {
            selectAllNotes();
            repaint();
            return;
        }

        // Velocity Slider interaction
        if (selectedNoteIds.empty())
            selectAllNotes();

        currentDragMode = DragMode::DragVelocitySlider;
        dragStartPos = e.getPosition();
        dragInitialAvgVelocity = getSelectedAverageVelocity();
        dragInitialNoteVelocities.clear();

        for (const auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
                dragInitialNoteVelocities.push_back({ ev.noteId, ev.message.getFloatVelocity() });
        }

        float laneStart = 88.0f;
        float laneWidth = static_cast<float>(std::max(50, getWidth() - 110 - 88));
        float newVel = juce::jlimit(0.01f, 1.0f, (static_cast<float>(e.x) - laneStart) / laneWidth);
        setSelectedVelocity(newVel);
        repaint();
        return;
    }

    bool nearEdge = false;
    int hitNoteId = findNoteAt(e.getPosition(), nearEdge);

    if (hitNoteId >= 0)
    {
        if (e.mods.isAltDown())
        {
            // Alt-drag note duplication: duplicate selected notes or hitNoteId immediately
            if (selectedNoteIds.count(hitNoteId) == 0 && !e.mods.isShiftDown())
            {
                selectedNoteIds.clear();
                selectedNoteIds.insert(hitNoteId);
            }

            std::vector<PlaybackEvent> dups;
            int maxId = 0;
            for (const auto& ev : editableEvents)
                maxId = std::max(maxId, ev.noteId);

            std::set<int> newDupIds;
            int newDraggingId = -1;

            for (const auto& ev : editableEvents)
            {
                if (selectedNoteIds.count(ev.noteId) > 0)
                {
                    PlaybackEvent d = ev;
                    d.noteId = ++maxId;
                    if (ev.noteId == hitNoteId)
                        newDraggingId = d.noteId;
                    dups.push_back(d);
                    newDupIds.insert(d.noteId);
                }
            }

            selectedNoteIds = newDupIds;
            for (const auto& d : dups)
                editableEvents.push_back(d);

            draggingNoteId = (newDraggingId >= 0) ? newDraggingId : (dups.empty() ? hitNoteId : dups[0].noteId);

            for (const auto& ev : editableEvents)
            {
                if (ev.noteId == draggingNoteId)
                {
                    dragInitialPpq = ev.ppqPosition;
                    dragInitialPitch = ev.message.getNoteNumber();
                    break;
                }
            }

            currentDragMode = DragMode::MoveNotes;
            notifySequenceChanged();
        }
        else
        {
            draggingNoteId = hitNoteId;

            if (!e.mods.isShiftDown() && selectedNoteIds.count(hitNoteId) == 0)
            {
                selectedNoteIds.clear();
                selectedNoteIds.insert(hitNoteId);
            }
            else if (e.mods.isShiftDown())
            {
                selectedNoteIds.insert(hitNoteId);
            }

            for (const auto& ev : editableEvents)
            {
                if (ev.noteId == hitNoteId)
                {
                    dragInitialPpq = ev.ppqPosition;
                    dragInitialPitch = ev.message.getNoteNumber();
                    break;
                }
            }

            currentDragMode = nearEdge ? DragMode::ResizeNoteEnd : DragMode::MoveNotes;
        }
    }
    else
    {
        if (!e.mods.isShiftDown())
            selectedNoteIds.clear();

        currentDragMode = DragMode::MarqueeSelect;
        marqueeRect = juce::Rectangle<int>(e.getPosition(), e.getPosition());
    }

    repaint();
}

void PianoRollComponent::mouseDrag(const juce::MouseEvent& e)
{
    float currentPixelsPerPpq = basePixelsPerPpq * zoomX;

    if (currentDragMode == DragMode::DragLengthHandle)
    {
        double currentPpq = ppqAtX(e.x);
        double snapped = std::max(4.0, std::round(currentPpq * 2.0) / 2.0);
        if (onLengthChanged != nullptr)
            onLengthChanged(snapped);
        repaint();
    }
    else if (currentDragMode == DragMode::ScrubRuler)
    {
        double newPpq = ppqAtX(e.x);
        if (onSeekRequested != nullptr)
            onSeekRequested(newPpq);
    }
    else if (currentDragMode == DragMode::MoveNotes && draggingNoteId >= 0)
    {
        double deltaPpq = static_cast<double>(e.x - dragStartPos.x) / currentPixelsPerPpq;
        double quantizedDeltaPpq = std::round(deltaPpq * 4.0) / 4.0;

        int rawPitch = pitchAtY(e.y);
        int targetPitch = (rawPitch >= 0) ? (rawPitch - previewTranspose) : dragInitialPitch;

        // When scale lock is active, snap pitch so notes cannot be dropped onto out-of-scale pitches
        if (scaleLockActive && currentScale != MusicalScale::Chromatic)
        {
            targetPitch = snapPitchToActiveScale(targetPitch);
        }

        int pitchDelta = targetPitch - dragInitialPitch;

        for (auto& ev : editableEvents)
        {
            if (selectedNoteIds.count(ev.noteId) > 0)
            {
                ev.ppqPosition = std::max(0.0, dragInitialPpq + quantizedDeltaPpq);
                int transposed = juce::jlimit(0, 127, dragInitialPitch + pitchDelta);
                if (scaleLockActive && currentScale != MusicalScale::Chromatic)
                    transposed = snapPitchToActiveScale(transposed);

                ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), transposed, ev.message.getFloatVelocity());
            }
        }
        repaint();
    }
    else if (currentDragMode == DragMode::ResizeNoteEnd && draggingNoteId >= 0)
    {
        double currentPpq = ppqAtX(e.x);
        for (auto& ev : editableEvents)
        {
            if (ev.noteId == draggingNoteId)
            {
                double newDuration = std::max(0.25, currentPpq - ev.ppqPosition);
                ev.ppqDuration = std::round(newDuration * 4.0) / 4.0;
                break;
            }
        }
        repaint();
    }
    else if (currentDragMode == DragMode::DragVelocitySlider)
    {
        float laneStart = 88.0f;
        float laneWidth = static_cast<float>(std::max(50, getWidth() - 110 - 88));
        float currentXRatio = (static_cast<float>(e.x) - laneStart) / laneWidth;
        float delta = currentXRatio - ((static_cast<float>(dragStartPos.x) - laneStart) / laneWidth);

        if (selectedNoteIds.size() == 1)
        {
            setSelectedVelocity(currentXRatio);
        }
        else
        {
            // Proportionately scale all selected notes based on drag
            for (const auto& initItem : dragInitialNoteVelocities)
            {
                float newV = juce::jlimit(0.01f, 1.0f, initItem.second + delta);
                for (auto& ev : editableEvents)
                {
                    if (ev.noteId == initItem.first && ev.message.isNoteOn())
                    {
                        ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), ev.message.getNoteNumber(), newV);
                    }
                }
            }
            repaint();
        }
    }
    else if (currentDragMode == DragMode::MarqueeSelect)
    {
        marqueeRect = juce::Rectangle<int>(dragStartPos, e.getPosition());
        for (const auto& ev : editableEvents)
        {
            auto rect = getNoteRectangle(ev).toNearestInt();
            if (marqueeRect.intersects(rect))
                selectedNoteIds.insert(ev.noteId);
        }
        repaint();
    }
}

void PianoRollComponent::mouseUp(const juce::MouseEvent& /*e*/)
{
    if (currentDragMode == DragMode::MoveNotes || currentDragMode == DragMode::ResizeNoteEnd || currentDragMode == DragMode::DragVelocitySlider)
    {
        notifySequenceChanged();
    }

    currentDragMode = DragMode::None;
    draggingNoteId = -1;
    marqueeRect = {};
    repaint();
}

void PianoRollComponent::selectAllNotes()
{
    selectedNoteIds.clear();
    for (const auto& ev : editableEvents)
    {
        if (ev.message.isNoteOn())
            selectedNoteIds.insert(ev.noteId);
    }
    repaint();
}

void PianoRollComponent::deselectAllNotes()
{
    selectedNoteIds.clear();
    repaint();
}

float PianoRollComponent::getSelectedAverageVelocity() const
{
    if (selectedNoteIds.empty())
        return 0.75f;

    float sum = 0.0f;
    int count = 0;
    for (const auto& ev : editableEvents)
    {
        if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
        {
            sum += ev.message.getFloatVelocity();
            count++;
        }
    }
    return count > 0 ? (sum / static_cast<float>(count)) : 0.75f;
}

void PianoRollComponent::setSelectedVelocity(float newVel)
{
    float clamped = juce::jlimit(0.01f, 1.0f, newVel);

    if (selectedNoteIds.size() <= 1)
    {
        for (auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
            {
                ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), ev.message.getNoteNumber(), clamped);
            }
        }
    }
    else
    {
        // Proportionately scaling
        float currentAvg = getSelectedAverageVelocity();
        float delta = clamped - currentAvg;
        for (auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
            {
                float v = juce::jlimit(0.01f, 1.0f, ev.message.getFloatVelocity() + delta);
                ev.message = juce::MidiMessage::noteOn(ev.message.getChannel(), ev.message.getNoteNumber(), v);
            }
        }
    }
    repaint();
}

std::vector<int> PianoRollComponent::getCurrentlyAuditioningPitches() const
{
    std::vector<int> pitches;
    if (!selectedNoteIds.empty())
    {
        for (const auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn() && selectedNoteIds.count(ev.noteId) > 0)
                pitches.push_back(ev.message.getNoteNumber() + previewTranspose);
        }
    }
    else
    {
        for (const auto& ev : editableEvents)
        {
            if (ev.message.isNoteOn() && playheadPpq >= ev.ppqPosition && playheadPpq < ev.ppqPosition + ev.ppqDuration)
                pitches.push_back(ev.message.getNoteNumber() + previewTranspose);
        }
    }
    return pitches;
}

void PianoRollComponent::drawVelocityHeatmap(juce::Graphics& g, juce::Rectangle<int> area)
{
    g.setColour(juce::Colour(0xff0b0d12));
    g.fillRect(area);
    g.setColour(juce::Colour(0xff222736));
    g.drawHorizontalLine(area.getY(), static_cast<float>(area.getX()), static_cast<float>(area.getRight()));

    auto r = area.reduced(4, 2);

    // "SELECT ALL" button on left
    auto selectAllRect = r.removeFromLeft(76).reduced(1, 2);
    g.setColour(juce::Colour(0xff1e2433));
    g.fillRoundedRectangle(selectAllRect.toFloat(), 4.0f);
    g.setColour(juce::Colour(0xff38bdf8));
    g.drawRoundedRectangle(selectAllRect.toFloat(), 4.0f, 1.0f);
    g.setFont(juce::Font(9.0f, juce::Font::bold));
    g.setColour(juce::Colour(0xffe0f2fe));
    g.drawText("SELECT ALL", selectAllRect, juce::Justification::centred);

    r.removeFromLeft(8);

    // Slider Lane bounds
    int laneRight = r.getRight() - 110;
    juce::Rectangle<float> laneRect(static_cast<float>(r.getX()), static_cast<float>(r.getY() + 4),
                                    static_cast<float>(std::max(50, laneRight - r.getX())), static_cast<float>(r.getHeight() - 8));

    // Gradient Heatmap bar
    juce::ColourGradient grad(juce::Colour(0xff34d399), laneRect.getX(), laneRect.getY(),
                              juce::Colour(0xfff43f5e), laneRect.getRight(), laneRect.getY(), false);
    grad.addColour(0.5, juce::Colour(0xfffbbf24));
    g.setGradientFill(grad);
    g.fillRoundedRectangle(laneRect, 3.0f);

    g.setColour(juce::Colour(0x55000000));
    g.drawRoundedRectangle(laneRect, 3.0f, 1.0f);

    // Slider handle and readout
    float avgVel = getSelectedAverageVelocity();
    bool hasSelection = !selectedNoteIds.empty();

    if (hasSelection)
    {
        float handleX = laneRect.getX() + (avgVel * laneRect.getWidth());
        // Handle line & circle
        g.setColour(juce::Colour(0xffffffff));
        g.drawLine(handleX, static_cast<float>(area.getY()), handleX, static_cast<float>(area.getBottom()), 2.5f);
        g.setColour(juce::Colour(0xfffbbf24));
        g.fillEllipse(handleX - 5.0f, laneRect.getCentreY() - 5.0f, 10.0f, 10.0f);
        g.setColour(juce::Colour(0xff18181b));
        g.drawEllipse(handleX - 5.0f, laneRect.getCentreY() - 5.0f, 10.0f, 10.0f, 1.5f);
    }

    // Readout label on right
    auto readoutRect = r.removeFromRight(100);
    g.setFont(juce::Font(10.0f, juce::Font::bold));
    if (hasSelection)
    {
        int velInt = static_cast<int>(std::round(avgVel * 127.0f));
        g.setColour(juce::Colour(0xfffcd34d));
        juce::String txt = (selectedNoteIds.size() == 1)
            ? "VEL: " + juce::String(velInt)
            : "AVG: " + juce::String(velInt) + " (" + juce::String(selectedNoteIds.size()) + ")";
        g.drawText(txt, readoutRect, juce::Justification::centredRight);
    }
    else
    {
        g.setColour(juce::Colour(0xff64748b));
        g.drawText("Velocity Fader", readoutRect, juce::Justification::centredRight);
    }
}

bool PianoRollComponent::keyPressed(const juce::KeyPress& key)
{
    if (key.isKeyCode(juce::KeyPress::deleteKey) || key.isKeyCode(juce::KeyPress::backspaceKey))
    {
        if (!selectedNoteIds.empty())
        {
            cutSelectedNotes();
            return true;
        }
    }
    else if (key.getModifiers().isCommandDown() || key.getModifiers().isCtrlDown())
    {
        int code = key.getKeyCode();
        if (code == 'C' || code == 'c')
        {
            copySelectedNotes();
            return true;
        }
        else if (code == 'X' || code == 'x')
        {
            cutSelectedNotes();
            return true;
        }
        else if (code == 'V' || code == 'v')
        {
            pasteNotesAt(playheadPpq);
            return true;
        }
        else if (code == 'A' || code == 'a')
        {
            selectAllNotes();
            return true;
        }
    }
    return false;
}

void PianoRollComponent::notifySequenceChanged()
{
    if (onSequenceEdited != nullptr)
        onSequenceEdited(editableEvents);
}

} // namespace MidiPreviewer

