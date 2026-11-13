cmake_minimum_required(VERSION 3.22)
project(MIDI_PREVIEWER VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# macOS configuration: target macOS 11.0+ and native architecture for local builds
if(APPLE)
    enable_language(OBJCXX)
    set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS deployment target")
endif()

# Suppress harmless third-party diagnostics from bundled libraries (e.g., HarfBuzz in juce_graphics on Apple Clang)
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|AppleClang")
    add_compile_options(-Wno-nontrivial-memcall -Wno-deprecated-declarations)
endif()

# Fetch or locate JUCE 8
include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG        8.0.4
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(JUCE)

# Embed self-contained offline React + Tailwind v4 WebUI assets directly into the C++ binary
# Zero Node/npm, zero internet/CDNs, and zero external file paths required inside Logic Pro's sandbox
juce_add_binary_data(MidiLensWebUIData
    HEADER_NAME "WebUIData.h"
    NAMESPACE   "WebUIData"
    SOURCES
        WebUI/index.html
        WebUI/app.css
        WebUI/app.js
        WebUI/icon.svg
)

# Declare JUCE Plugin with AU, VST3, and Standalone
# NOTE: For Logic Pro MIDI FX, FORMATS must include AU, and the target must be configured with IS_MIDI_EFFECT TRUE.
juce_add_plugin(MidiPreviewer
    COMPANY_NAME                "Daz Corp"
    BUNDLE_ID                   "com.dazcorp.midilens"
    IS_SYNTH                    FALSE
    NEEDS_MIDI_INPUT            TRUE
    NEEDS_MIDI_OUTPUT           TRUE
    IS_MIDI_EFFECT              TRUE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    PLUGIN_MANUFACTURER_CODE    "DazC"
    PLUGIN_CODE                 "MPrv"
    FORMATS                     AU VST3 Standalone
    PRODUCT_NAME                "MidiLens"
    DESCRIPTION                 "MidiLens real-time MIDI auditioning, scale lock & FX suite"
)

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
        Source/ArpEngine.h
        Source/MidiLensLookAndFeel.h
        Source/CloudFileReader.h
)

if(APPLE)
    target_sources(MidiPreviewer PRIVATE Source/CloudFileReader.mm)
    set_source_files_properties(Source/CloudFileReader.mm PROPERTIES COMPILE_FLAGS "-fobjc-arc")
endif()

target_compile_definitions(MidiPreviewer
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0
        JUCE_REPORT_APP_USAGE=0
        JUCE_STRICT_REFCOUNTEDPOINTER=1
)

if(WIN32)
    target_compile_definitions(MidiPreviewer PUBLIC JUCE_USE_WIN_WEBVIEW2=1)
endif()

target_link_libraries(MidiPreviewer
    PRIVATE
        MidiLensWebUIData
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
)

# Custom configuration for macOS AU WebKit linkage & hardened runtime compatibility
if(APPLE)
    target_compile_options(MidiPreviewer PRIVATE -Wno-deprecated-declarations -Wno-nontrivial-memcall)
    target_link_libraries(MidiPreviewer PRIVATE "-framework WebKit" "-framework Foundation" "-framework AppKit")
    set_target_properties(MidiPreviewer PROPERTIES
        XCODE_ATTRIBUTE_ENABLE_HARDENED_RUNTIME "YES"
    )
endif()
