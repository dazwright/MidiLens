#include "CloudFileReader.h"

#if defined(__APPLE__)
#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#include <sys/stat.h>
#include <thread>
#include <chrono>

#ifndef SF_DATALESS
#define SF_DATALESS 0x40000000
#endif

namespace MidiPreviewer
{

namespace
{
    bool isDatalessPlaceholder(const char* utf8Path)
    {
        if (utf8Path == nullptr)
            return false;
        struct stat st {};
        if (::stat(utf8Path, &st) == 0)
            return (st.st_flags & SF_DATALESS) != 0;
        return false;
    }

    NSData* readViaFileCoordinator(NSURL* url, NSError** outCoordError, NSError** outReadError)
    {
        __block NSData* resultData = nil;
        __block NSError* localReadError = nil;

        NSFileCoordinator* coordinator = [[NSFileCoordinator alloc] initWithFilePresenter:nil];
        [coordinator coordinateReadingItemAtURL:url
                                        options:0
                                          error:outCoordError
                                     byAccessor:^(NSURL* newURL) {
            resultData = [NSData dataWithContentsOfURL:newURL
                                               options:NSDataReadingUncached
                                                 error:&localReadError];
        }];

        if (outReadError != nullptr)
            *outReadError = localReadError;

        return resultData;
    }
} // namespace

CloudFileReadResult readFileWithCloudHydration(const juce::File& file, int timeoutMs)
{
    CloudFileReadResult result;

    @autoreleasepool
    {
        const juce::String fullPath = file.getFullPathName();
        if (fullPath.isEmpty())
        {
            result.errorMessage = "Invalid or empty file path.";
            return result;
        }

        NSString* nsPath = [NSString stringWithUTF8String:fullPath.toRawUTF8()];
        if (nsPath == nil)
        {
            result.errorMessage = "Could not encode file path.";
            return result;
        }

        NSURL* url = [NSURL fileURLWithPath:nsPath];
        if (url == nil)
        {
            result.errorMessage = "Could not resolve file URL.";
            return result;
        }

        NSFileManager* fm = [NSFileManager defaultManager];

        // Trigger cloud hydration explicitly if the item is managed by File Provider (Google Drive / iCloud)
        NSError* dlTriggerErr = nil;
        [fm startDownloadingUbiquitousItemAtURL:url error:&dlTriggerErr];

        NSError* coordErr = nil;
        NSError* readErr = nil;
        NSData* data = readViaFileCoordinator(url, &coordErr, &readErr);

        const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(std::max(500, timeoutMs));
        while ((data == nil || data.length == 0) && std::chrono::steady_clock::now() < deadline)
        {
            [fm startDownloadingUbiquitousItemAtURL:url error:nil];
            std::this_thread::sleep_for(std::chrono::milliseconds(250));
            coordErr = nil;
            readErr = nil;
            data = readViaFileCoordinator(url, &coordErr, &readErr);
        }

        if (data != nil && data.length > 0)
        {
            const auto* rawBytes = static_cast<const uint8_t*>(data.bytes);
            result.bytes.assign(rawBytes, rawBytes + data.length);
            result.success = true;
            return result;
        }

        // Fallback to direct JUCE read in case the provider resolved late
        juce::MemoryBlock mb;
        if (file.existsAsFile() && file.loadFileAsData(mb) && mb.getSize() > 0)
        {
            const auto* rawBytes = static_cast<const uint8_t*>(mb.getData());
            result.bytes.assign(rawBytes, rawBytes + mb.getSize());
            result.success = true;
            return result;
        }

        if (isDatalessPlaceholder(fullPath.toRawUTF8()))
        {
            result.errorMessage = "Cloud file is online-only (not yet downloaded to this Mac). Ensure Google Drive is running and online, or mark the folder 'Available offline'.";
        }
        else if (coordErr != nil)
        {
            result.errorMessage = juce::String("Cloud/File Provider error: ") + juce::String([coordErr.localizedDescription UTF8String]);
        }
        else if (readErr != nil)
        {
            result.errorMessage = juce::String("Could not read file: ") + juce::String([readErr.localizedDescription UTF8String]);
        }
        else if (!file.existsAsFile())
        {
            result.errorMessage = "File not found or folder access was denied by the host.";
        }
        else
        {
            result.errorMessage = "File is empty (0 bytes) or still syncing from cloud storage.";
        }
    }

    return result;
}

} // namespace MidiPreviewer

@interface MidiLensDragSource : NSObject <NSDraggingSource>
@end

@implementation MidiLensDragSource
- (NSDragOperation)draggingSession:(NSDraggingSession*)session
sourceOperationMaskForDraggingContext:(NSDraggingContext)context
{
    (void)session;
    (void)context;
    return NSDragOperationCopy;
}
@end

namespace MidiPreviewer
{

bool startExternalMidiFileDrag(void* nativeViewHandle, const juce::File& midiFile)
{
    if (nativeViewHandle == nullptr || !midiFile.existsAsFile())
        return false;

    @autoreleasepool
    {
        NSView* view = (__bridge NSView*)nativeViewHandle;
        if (view == nil)
            return false;

        NSWindow* win = [view window];
        if (win == nil)
            return false;

        NSString* nsPath = [NSString stringWithUTF8String:midiFile.getFullPathName().toRawUTF8()];
        if (nsPath == nil)
            return false;

        NSURL* fileUrl = [NSURL fileURLWithPath:nsPath];
        if (fileUrl == nil)
            return false;

        NSDraggingItem* dragItem = [[NSDraggingItem alloc] initWithPasteboardWriter:fileUrl];
        if (dragItem == nil)
            return false;

        // Render a crisp .mid drag badge under the mouse cursor
        const NSSize badgeSize = NSMakeSize(164.0, 28.0);
        NSString* label = [NSString stringWithUTF8String:midiFile.getFileName().toRawUTF8()];
        if (label == nil)
            label = @"MidiLens_Clip.mid";

        NSImage* badgeImage = [NSImage imageWithSize:badgeSize
                                             flipped:NO
                                      drawingHandler:^BOOL(NSRect dstRect)
        {
            NSBezierPath* bg = [NSBezierPath bezierPathWithRoundedRect:NSInsetRect(dstRect, 1.0, 1.0)
                                                               xRadius:5.0
                                                               yRadius:5.0];
            [[NSColor colorWithCalibratedRed:0.06 green:0.12 blue:0.09 alpha:0.95] setFill];
            [bg fill];
            [[NSColor colorWithCalibratedRed:0.06 green:0.73 blue:0.51 alpha:0.95] setStroke];
            [bg setLineWidth:1.5];
            [bg stroke];

            NSDictionary* attrs = @{
                NSFontAttributeName: [NSFont monospacedSystemFontOfSize:11.0 weight:NSFontWeightBold],
                NSForegroundColorAttributeName: [NSColor colorWithCalibratedRed:0.43 green:0.91 blue:0.72 alpha:1.0]
            };
            [label drawInRect:NSMakeRect(10.0, 6.0, dstRect.size.width - 20.0, 16.0) withAttributes:attrs];
            return YES;
        }];

        NSPoint screenPt = [NSEvent mouseLocation];
        NSPoint winPt = [win convertPointFromScreen:screenPt];
        NSPoint viewPt = [view convertPoint:winPt fromView:nil];
        NSRect dragFrame = NSMakeRect(viewPt.x - badgeSize.width * 0.5,
                                      viewPt.y - badgeSize.height * 0.5,
                                      badgeSize.width,
                                      badgeSize.height);
        [dragItem setDraggingFrame:dragFrame contents:badgeImage];

        NSEvent* cur = [NSApp currentEvent];
        NSEvent* dragEvent = nil;
        if (cur != nil
            && [cur windowNumber] == [win windowNumber]
            && [cur type] == NSEventTypeLeftMouseDragged)
        {
            dragEvent = cur;
        }
        else
        {
            dragEvent = [NSEvent mouseEventWithType:NSEventTypeLeftMouseDragged
                                            location:winPt
                                       modifierFlags:0
                                           timestamp:[[NSProcessInfo processInfo] systemUptime]
                                        windowNumber:[win windowNumber]
                                             context:nil
                                         eventNumber:0
                                          clickCount:1
                                            pressure:1.0];
        }

        if (dragEvent == nil)
            return false;

        static MidiLensDragSource* const dragSource = [[MidiLensDragSource alloc] init];
        NSDraggingSession* session = [view beginDraggingSessionWithItems:@[dragItem]
                                                                   event:dragEvent
                                                                  source:dragSource];
        return session != nil;
    }
}

} // namespace MidiPreviewer
#endif
