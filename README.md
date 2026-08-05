# Recall-Bot Clock Shield

Three-panel Recall-Bot video clock framework for a fixed **3840 × 804** NVIDIA Shield signage screen.

## Live screen

`/screen-b7f4e2/`

The root page is intentionally blank. The production route is non-descriptive and blocked from indexing. This reduces casual discovery but is not access control.

## Layout

- Native canvas: 3840 × 804
- Three equal panels: 1280 × 804 each
- Left to right: Hour, Minute, Second
- Top-left: panel label plus Melbourne date
- Bottom-left: small live Melbourne clock
- Background: #373A36

## Typography

All fonts are generated and stored locally in the production screen folder.

- Sans-serif UI: Open Sans Regular and SemiBold
- Serif numerals: PT Serif Bold
- No runtime Google Fonts calls

## Prototype videos

The build workflow creates three lightweight local placeholder MP4 loops:

- H.264 AVC Main profile
- 1280 × 804
- 15 fps constant frame rate
- yuv420p
- muted, autoplay, playsinline and looped

Replace files under `screen-b7f4e2/assets/videos/` without changing the HTML structure.

## Testing

Append `?debug=1` to the screen URL to show:

- viewport and scaled stage size
- Melbourne time
- playback state for all three videos
- font loading state

The layout automatically scales for desktop and mobile testing while preserving the 3840:804 aspect ratio.

## Next implementation stages

1. Add 24 hour assets and hourly selection.
2. Add 60 minute assets and minute-boundary switching.
3. Replace the seconds placeholder with an exact 60-second 00–59 video.
4. Add frame-aware drift correction against Melbourne system time.
5. Add managed media hosting and local cache strategy for the production video library.
