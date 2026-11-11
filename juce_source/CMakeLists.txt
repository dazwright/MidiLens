cmake_minimum_required(VERSION 3.22)
project(MIDI_PREVIEWER VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# macOS Universal Binary configuration (Apple Silicon M1/M2/M3/M4 & Intel x86_64)
if(APPLE)
    set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Build universal binary for macOS" FORCE)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS deployment target" FORCE)
endif()

# Fetch or locate JUCE (supports both local add_subdirectory or CMake FetchContent)
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.4 # or 7.0.12
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(JUCE)

# Declare JUCE Plugin with AU, VST3, Standalone, and legacy VST (if Steinberg VST2 SDK is provided)
# NOTE: For Logic Pro MIDI FX, FORMATS must include AU, and the target must be configured with IS_MIDI_EFFECT TRUE.
juce_add_plugin(MidiPreviewer
    COMPANY_NAME                "AudioDSP"
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            TRUE
    NEEDS_MIDI_OUTPUT           TRUE
    IS_MIDI_EFFECT              TRUE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    PLUGIN_MANUFACTURER_CODE    "Adsp"
    PLUGIN_CODE                 "MPrv"
    FORMATS                     AU VST3 Standalone # Add VST if VST2 SDK is present
    PRODUCT_NAME                "MidiLens"
    DESCRIPTION                 "MidiLens real-time MIDI auditioning, scale lock & FX suite"
)

# Crucial AudioUnit property for Apple Logic Pro:
# Logic Pro specifically looks for 'aumf' (AudioUnit MIDI Effect) components
# placed in the MIDI FX slot ahead of software instruments.
# JUCE automatically maps IS_MIDI_EFFECT to 'aumf' for AU plugins when audio I/O is disabled.

target_sources(MidiPreviewer
    PRIVATE
        Source/PluginProcessor.h
        Source/PluginProcessor.cpp
        Source/PluginEditor.h
        Source/PluginEditor.cpp
        Source/KeyDetector.h
        Source/KeyDetector.cpp
        Source/PianoRollComponent.h
        Source/PianoRollComponent.cpp
        Source/LockFreeMidiFifo.h
        Source/MidiFileExporter.h
        Source/MidiFileExporter.cpp
)

target_compile_definitions(MidiPreviewer
    PUBLIC
        JUCE_WEB_BROWSER=0
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_DISPLAY_SPLASH_SCREEN=0
        JUCE_REPORT_APP_USAGE=0
        JUCE_STRICT_REFCOUNTEDPOINTER=1
)

target_link_libraries(MidiPreviewer
    PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_plugin_client
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags
)

# Custom post-build logic for macOS AU installation and validation
if(APPLE)
    # Enable hardened runtime for modern macOS / Logic Pro notarization compatibility
    set_target_properties(MidiPreviewer PROPERTIES
        XCODE_ATTRIBUTE_ENABLE_HARDENED_RUNTIME "YES"
    )
endif()
