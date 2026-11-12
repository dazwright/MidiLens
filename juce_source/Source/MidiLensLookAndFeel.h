#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_graphics/juce_graphics.h>
#include <cmath>

namespace MidiPreviewer
{

class MidiLensLookAndFeel : public juce::LookAndFeel_V4
{
public:
    MidiLensLookAndFeel()
    {
        // Dark analog chassis theme color defaults
        setColour(juce::ResizableWindow::backgroundColourId, juce::Colour(0xff16181b));
        setColour(juce::Label::textColourId, juce::Colour(0xffe2e8f0));

        // Popup menu dark theme
        setColour(juce::PopupMenu::backgroundColourId, juce::Colour(0xff16181b));
        setColour(juce::PopupMenu::textColourId, juce::Colour(0xffe2e8f0));
        setColour(juce::PopupMenu::highlightedBackgroundColourId, juce::Colour(0xff2a2d33));
        setColour(juce::PopupMenu::highlightedTextColourId, juce::Colour(0xfffbbf24));

        // ComboBox dark theme - Stamped recessed socket
        setColour(juce::ComboBox::backgroundColourId, juce::Colour(0xff0c0e10));
        setColour(juce::ComboBox::textColourId, juce::Colour(0xfffbbf24));
        setColour(juce::ComboBox::outlineColourId, juce::Colour(0xff3d414a));
        setColour(juce::ComboBox::arrowColourId, juce::Colour(0xfff59e0b));

        // TextButton defaults
        setColour(juce::TextButton::buttonColourId, juce::Colour(0xff1e2126));
        setColour(juce::TextButton::textColourOffId, juce::Colour(0xffe2e8f0));
        setColour(juce::TextButton::textColourOnId, juce::Colour(0xffffffff));

        // Slider textbox
        setColour(juce::Slider::textBoxTextColourId, juce::Colour(0xfffbbf24));
        setColour(juce::Slider::textBoxBackgroundColourId, juce::Colour(0xff0c0e10));
        setColour(juce::Slider::textBoxOutlineColourId, juce::Colour(0xff3d414a));
    }

    void drawButtonBackground(juce::Graphics& g, juce::Button& button, const juce::Colour& backgroundColour,
                              bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        juce::ignoreUnused(backgroundColour);
        auto bounds = button.getLocalBounds().toFloat().reduced(0.5f);
        float cornerSize = 4.0f;
        auto buttonText = button.getButtonText();

        bool isPrimaryAmber = (buttonText.containsIgnoreCase("DRAG") || buttonText.containsIgnoreCase("EXPORT"));
        bool isPlayButton = buttonText.containsIgnoreCase("Play") || buttonText.containsIgnoreCase("PLAY") || buttonText.containsIgnoreCase("PAUSE");
        bool isPlayActive = isPlayButton && (button.getToggleState() || buttonText.containsIgnoreCase("PAUSE"));

        if (isPrimaryAmber)
        {
            // Heavy industrial amber push-button with metallic bevel
            juce::Colour top = shouldDrawButtonAsDown ? juce::Colour(0xffb45309) : (shouldDrawButtonAsHighlighted ? juce::Colour(0xfffbbf24) : juce::Colour(0xfff59e0b));
            juce::Colour bottom = shouldDrawButtonAsDown ? juce::Colour(0xff78350f) : juce::Colour(0xffb45309);

            juce::ColourGradient grad(top, bounds.getX(), bounds.getY(), bottom, bounds.getX(), bounds.getBottom(), false);
            g.setGradientFill(grad);
            g.fillRoundedRectangle(bounds, cornerSize);

            // 1px Milled highlight on top edge
            g.setColour(juce::Colour(0xfffde68a).withAlpha(0.7f));
            g.drawHorizontalLine(static_cast<int>(bounds.getY() + 1), bounds.getX() + 2, bounds.getRight() - 2);

            g.setColour(juce::Colour(0xff78350f));
            g.drawRoundedRectangle(bounds.reduced(0.5f), cornerSize, 1.0f);
        }
        else if (isPlayActive)
        {
            // Vintage tape machine incandescent green lamp
            juce::Colour top = shouldDrawButtonAsDown ? juce::Colour(0xff059669) : juce::Colour(0xff10b981);
            juce::Colour bottom = juce::Colour(0xff047857);
            juce::ColourGradient grad(top, bounds.getX(), bounds.getY(), bottom, bounds.getX(), bounds.getBottom(), false);
            g.setGradientFill(grad);
            g.fillRoundedRectangle(bounds, cornerSize);

            // Incandescent phosphor glow halo
            g.setColour(juce::Colour(0xff34d399));
            g.drawRoundedRectangle(bounds.reduced(0.5f), cornerSize, 1.5f);
        }
        else
        {
            // Tactile anodized aluminum rack push-button with metallic bevel
            juce::Colour top = shouldDrawButtonAsDown ? juce::Colour(0xff14161a)
                              : (shouldDrawButtonAsHighlighted ? juce::Colour(0xff2a2d34) : juce::Colour(0xff22252b));
            juce::Colour bottom = shouldDrawButtonAsDown ? juce::Colour(0xff0d0e11) : juce::Colour(0xff17191d);

            juce::ColourGradient grad(top, bounds.getX(), bounds.getY(), bottom, bounds.getX(), bounds.getBottom(), false);
            g.setGradientFill(grad);
            g.fillRoundedRectangle(bounds, cornerSize);

            // 1px top highlight bevel
            if (!shouldDrawButtonAsDown)
            {
                g.setColour(juce::Colours::white.withAlpha(0.12f));
                g.drawHorizontalLine(static_cast<int>(bounds.getY() + 1), bounds.getX() + 2, bounds.getRight() - 2);
            }

            // Milled dark border
            juce::Colour border = shouldDrawButtonAsHighlighted ? juce::Colour(0xff4b5563) : juce::Colour(0xff2c3038);
            g.setColour(border);
            g.drawRoundedRectangle(bounds.reduced(0.5f), cornerSize, 1.0f);
        }
    }

    void drawButtonText(juce::Graphics& g, juce::TextButton& button,
                        bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        auto bounds = button.getLocalBounds();
        auto text = button.getButtonText();

        bool isPrimaryAmber = (text.containsIgnoreCase("DRAG") || text.containsIgnoreCase("EXPORT"));
        juce::Colour textCol = isPrimaryAmber ? juce::Colour(0xff0f172a) : juce::Colour(0xfff1f5f9);

        if (!button.isEnabled())
            textCol = textCol.withAlpha(0.4f);
        else if (shouldDrawButtonAsDown)
            textCol = textCol.withAlpha(0.85f);

        g.setColour(textCol);
        g.setFont(juce::Font(11.5f, isPrimaryAmber ? juce::Font::bold : juce::Font::plain));
        g.drawText(text, bounds, juce::Justification::centred, true);
    }

    void drawComboBox(juce::Graphics& g, int width, int height, bool isButtonDown,
                      int buttonX, int buttonY, int buttonW, int buttonH, juce::ComboBox& box) override
    {
        juce::ignoreUnused(buttonX, buttonY, buttonW, buttonH, isButtonDown);
        auto bounds = juce::Rectangle<float>(0.5f, 0.5f, (float)width - 1.0f, (float)height - 1.0f);
        float corner = 6.0f;

        g.setColour(box.findColour(juce::ComboBox::backgroundColourId));
        g.fillRoundedRectangle(bounds, corner);

        juce::Colour outline = box.hasKeyboardFocus(true) ? juce::Colour(0xff38bdf8) : juce::Colour(0xff333d52);
        g.setColour(outline);
        g.drawRoundedRectangle(bounds, corner, 1.0f);

        // Modern sleek chevron arrow
        float arrowSize = 4.0f;
        float arrowX = (float)width - 12.0f;
        float arrowY = (float)height * 0.5f - 1.0f;

        juce::Path arrow;
        arrow.startNewSubPath(arrowX - arrowSize, arrowY - arrowSize * 0.5f);
        arrow.lineTo(arrowX, arrowY + arrowSize * 0.5f);
        arrow.lineTo(arrowX + arrowSize, arrowY - arrowSize * 0.5f);

        g.setColour(juce::Colour(0xff94a3b8));
        g.strokePath(arrow, juce::PathStrokeType(1.6f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    }

    void drawPopupMenuBackground(juce::Graphics& g, int width, int height) override
    {
        auto bounds = juce::Rectangle<float>(0.5f, 0.5f, (float)width - 1.0f, (float)height - 1.0f);
        g.setColour(juce::Colour(0xff161925));
        g.fillRoundedRectangle(bounds, 6.0f);
        g.setColour(juce::Colour(0xff334155));
        g.drawRoundedRectangle(bounds, 6.0f, 1.0f);
    }

    void drawPopupMenuItem(juce::Graphics& g, const juce::Rectangle<int>& area,
                           bool isSeparator, bool isActive, bool isHighlighted, bool isTicked,
                           bool hasSubMenu, const juce::String& text, const juce::String& shortcutKeyText,
                           const juce::Drawable* icon, const juce::Colour* textColour) override
    {
        juce::ignoreUnused(isTicked, hasSubMenu, shortcutKeyText, icon);

        if (isSeparator)
        {
            auto r = area.reduced(5, 0);
            g.setColour(juce::Colour(0xff2b3446));
            g.fillRect(r.removeFromTop(1));
            return;
        }

        auto bounds = area.reduced(3, 1).toFloat();
        if (isHighlighted && isActive)
        {
            g.setColour(juce::Colour(0xff252c3d));
            g.fillRoundedRectangle(bounds, 4.0f);
        }

        juce::Colour textCol = (textColour != nullptr) ? *textColour : juce::Colour(0xffe2e8f0);
        if (!isActive)
            textCol = textCol.withAlpha(0.35f);
        else if (isHighlighted)
            textCol = juce::Colour(0xff38bdf8);

        g.setColour(textCol);
        g.setFont(juce::Font(11.5f));
        g.drawText(text, area.reduced(8, 0), juce::Justification::centredLeft, true);
    }

    void drawToggleButton(juce::Graphics& g, juce::ToggleButton& button,
                          bool shouldDrawButtonAsHighlighted, bool shouldDrawButtonAsDown) override
    {
        juce::ignoreUnused(shouldDrawButtonAsDown);
        auto bounds = button.getLocalBounds().toFloat();
        bool isTicked = button.getToggleState();
        auto text = button.getButtonText();

        bool isGreen = text.containsIgnoreCase("ACTIVE");
        bool isAmber = text.containsIgnoreCase("ARP");
        juce::Colour activeColor = isGreen ? juce::Colour(0xff34d399) : (isAmber ? juce::Colour(0xfff59e0b) : juce::Colour(0xff38bdf8));

        float boxSize = 14.0f;
        auto boxRect = juce::Rectangle<float>(2.0f, (bounds.getHeight() - boxSize) * 0.5f, boxSize, boxSize);

        // Box background
        g.setColour(isTicked ? activeColor.withAlpha(0.2f) : juce::Colour(0xff1c202d));
        g.fillRoundedRectangle(boxRect, 4.0f);

        // Box outline
        g.setColour(isTicked ? activeColor : (shouldDrawButtonAsHighlighted ? juce::Colour(0xff64748b) : juce::Colour(0xff374158)));
        g.drawRoundedRectangle(boxRect, 4.0f, isTicked ? 1.5f : 1.0f);

        // Checkmark
        if (isTicked)
        {
            juce::Path tick;
            tick.startNewSubPath(boxRect.getX() + 3.0f, boxRect.getY() + 7.0f);
            tick.lineTo(boxRect.getX() + 6.0f, boxRect.getY() + 10.5f);
            tick.lineTo(boxRect.getX() + 11.0f, boxRect.getY() + 3.5f);

            g.setColour(activeColor);
            g.strokePath(tick, juce::PathStrokeType(1.8f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        }

        // Label Text
        g.setColour(isTicked ? juce::Colour(0xfff8fafc) : juce::Colour(0xff94a3b8));
        g.setFont(juce::Font(11.5f, isTicked ? juce::Font::bold : juce::Font::plain));
        g.drawText(text, bounds.withTrimmedLeft(boxSize + 6.0f).toNearestInt(), juce::Justification::centredLeft, true);
    }

    void drawRotarySlider(juce::Graphics& g, int x, int y, int width, int height,
                          float sliderPosProportional, float rotaryStartAngle, float rotaryEndAngle,
                          juce::Slider& slider) override
    {
        auto bounds = juce::Rectangle<float>((float)x, (float)y, (float)width, (float)height);
        float radius = juce::jmin(bounds.getWidth(), bounds.getHeight()) * 0.5f - 3.0f;
        if (radius < 8.0f) return;

        auto center = bounds.getCentre();
        float currentAngle = rotaryStartAngle + sliderPosProportional * (rotaryEndAngle - rotaryStartAngle);

        // Outer Dark Recessed Track Arc
        float trackRadius = radius - 1.5f;
        juce::Path trackArc;
        trackArc.addCentredArc(center.x, center.y, trackRadius, trackRadius, 0.0f, rotaryStartAngle, rotaryEndAngle, true);
        g.setColour(juce::Colour(0xff12141a));
        g.strokePath(trackArc, juce::PathStrokeType(4.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        g.setColour(juce::Colour(0xff222736));
        g.strokePath(trackArc, juce::PathStrokeType(2.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

        // Value Arc: Distinctive glowing colors per parameter (matching web rack)
        juce::Colour valColor = juce::Colour(0xff38bdf8); // default cyan
        if (slider.getName().containsIgnoreCase("speed") || slider.getName().containsIgnoreCase("tempo"))
            valColor = juce::Colour(0xfff59e0b); // warm amber
        else if (slider.getName().containsIgnoreCase("scale"))
            valColor = juce::Colour(0xff10b981); // emerald green
        else if (slider.getName().containsIgnoreCase("offset"))
            valColor = juce::Colour(0xffc084fc); // soft purple
        else if (slider.getName().containsIgnoreCase("transpose"))
            valColor = juce::Colour(0xff38bdf8); // electric cyan

        if (sliderPosProportional > 0.001f)
        {
            // Soft outer phosphor glow
            juce::Path valArc;
            valArc.addCentredArc(center.x, center.y, trackRadius, trackRadius, 0.0f, rotaryStartAngle, currentAngle, true);
            g.setColour(valColor.withAlpha(0.25f));
            g.strokePath(valArc, juce::PathStrokeType(5.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));

            // Sharp core arc
            g.setColour(valColor);
            g.strokePath(valArc, juce::PathStrokeType(3.0f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
        }

        // Heavy Anodized Aluminum Knob Body Face with Radial Gradient
        float knobRadius = radius - 5.5f;
        juce::ColourGradient knobGrad(juce::Colour(0xff2a2f3d), center.x - knobRadius * 0.3f, center.y - knobRadius * 0.3f,
                                      juce::Colour(0xff12141a), center.x + knobRadius, center.y + knobRadius, false);
        g.setGradientFill(knobGrad);
        g.fillEllipse(center.x - knobRadius, center.y - knobRadius, knobRadius * 2.0f, knobRadius * 2.0f);

        // Milled Beveled Outer Rim
        g.setColour(juce::Colour(0xff3e475c));
        g.drawEllipse(center.x - knobRadius, center.y - knobRadius, knobRadius * 2.0f, knobRadius * 2.0f, 1.2f);
        g.setColour(juce::Colours::white.withAlpha(0.08f));
        g.drawEllipse(center.x - knobRadius + 1.0f, center.y - knobRadius + 1.0f, (knobRadius - 1.0f) * 2.0f, (knobRadius - 1.0f) * 2.0f, 0.8f);

        // Center Recessed Cap
        float capRadius = knobRadius * 0.45f;
        g.setColour(juce::Colour(0xff0d0f14));
        g.fillEllipse(center.x - capRadius, center.y - capRadius, capRadius * 2.0f, capRadius * 2.0f);
        g.setColour(juce::Colour(0xff242b3b));
        g.drawEllipse(center.x - capRadius, center.y - capRadius, capRadius * 2.0f, capRadius * 2.0f, 0.8f);

        // Illuminated Indicator Line Pointer
        float pointerInner = capRadius + 1.0f;
        float pointerOuter = knobRadius - 1.5f;
        float cosA = std::cos(currentAngle - juce::MathConstants<float>::halfPi);
        float sinA = std::sin(currentAngle - juce::MathConstants<float>::halfPi);

        juce::Path pointer;
        pointer.startNewSubPath(center.x + pointerInner * cosA, center.y + pointerInner * sinA);
        pointer.lineTo(center.x + pointerOuter * cosA, center.y + pointerOuter * sinA);

        g.setColour(valColor);
        g.strokePath(pointer, juce::PathStrokeType(2.5f, juce::PathStrokeType::curved, juce::PathStrokeType::rounded));
    }

    void drawLinearSlider(juce::Graphics& g, int x, int y, int width, int height,
                          float sliderPos, float minSliderPos, float maxSliderPos,
                          const juce::Slider::SliderStyle sliderStyle, juce::Slider& slider) override
    {
        juce::ignoreUnused(sliderStyle, minSliderPos, maxSliderPos);
        auto bounds = juce::Rectangle<float>((float)x, (float)y, (float)width, (float)height);

        float trackHeight = 5.0f;
        float trackY = bounds.getCentreY() - trackHeight * 0.5f;
        auto trackRect = juce::Rectangle<float>(bounds.getX(), trackY, bounds.getWidth(), trackHeight);

        // Track background
        g.setColour(juce::Colour(0xff0c0e12));
        g.fillRoundedRectangle(trackRect, 2.5f);
        g.setColour(juce::Colour(0xff2d3342));
        g.drawRoundedRectangle(trackRect, 2.5f, 1.0f);

        juce::Colour valColor = juce::Colour(0xff38bdf8);
        if (slider.getName().containsIgnoreCase("velocity") || slider.getMaximum() <= 1.05)
            valColor = juce::Colour(0xfffbbf24); // warm amber for velocity
        else if (slider.getName().containsIgnoreCase("speed") || slider.getName().containsIgnoreCase("tempo"))
            valColor = juce::Colour(0xfff59e0b);
        else if (slider.getName().containsIgnoreCase("timing"))
            valColor = juce::Colour(0xffc084fc);

        // Filled active track
        float fillW = std::max(0.0f, sliderPos - bounds.getX());
        auto filledRect = juce::Rectangle<float>(bounds.getX(), trackY, fillW, trackHeight);
        g.setColour(valColor);
        g.fillRoundedRectangle(filledRect, 2.5f);

        // Thumb handle (tactile aluminum slider cap)
        float thumbRadius = 7.0f;
        auto thumbBounds = juce::Rectangle<float>(sliderPos - thumbRadius, bounds.getCentreY() - thumbRadius, thumbRadius * 2.0f, thumbRadius * 2.0f);
        juce::ColourGradient thumbGrad(juce::Colour(0xff3d4452), thumbBounds.getX(), thumbBounds.getY(),
                                       juce::Colour(0xff1a1d24), thumbBounds.getRight(), thumbBounds.getBottom(), false);
        g.setGradientFill(thumbGrad);
        g.fillEllipse(thumbBounds);

        g.setColour(valColor);
        g.drawEllipse(thumbBounds, 1.5f);
    }
};

} // namespace MidiPreviewer
