# Recall-Bot Clock Shield

Three-panel Recall-Bot video clock framework for a fixed **3840 × 804** NVIDIA Shield signage screen.

## Live screen

Production route:

`/screen-b7f4e2/`

Debug route:

`/screen-b7f4e2/?debug=1`

The root page is intentionally blank. The production route is non-descriptive and blocked from indexing. This reduces casual discovery but is not access control.

## Layout

- Native canvas: 3840 × 804
- Three equal panels: 1280 × 804 each
- Left to right: Hour, Minute, Second
- Top-left: Melbourne date, with a small panel label below it
- Bottom-left: small live Melbourne clock
- Background: `#373A36`
- Aurecon accent: `#89C925`
- Near-black: `#1C1B1C`

The stage always remains a true 3840 × 804 layout. JavaScript scales the complete stage uniformly for desktop and mobile previews, so typography and placement do not reflow at smaller viewport sizes.

## Typography

All fonts are generated and stored locally in the production screen folder.

- Sans-serif UI: Open Sans Regular and SemiBold
- Serif numerals and footer clock: PT Serif Bold
- No runtime Google Fonts calls
- Font licence and copyright files are stored under `screen-b7f4e2/licenses/`

## Prototype videos

The asset workflow creates three local placeholder MP4 loops:

- H.264 AVC Main profile
- 1280 × 804
- 15 fps constant frame rate
- One keyframe per second
- No B-frames
- `yuv420p`
- Muted, autoplay, playsinline and looped

The placeholder sign face is kept clear for the live PT Serif value. The three animations use different phase offsets so simultaneous playback is easy to verify.

Replace files under `screen-b7f4e2/assets/videos/` without changing the HTML structure.

## Runtime resilience

The current framework includes:

- Melbourne time locked with `Intl.DateTimeFormat`
- whole-second aligned clock updates
- muted autoplay recovery
- stalled and waiting playback handling
- a six-second playback watchdog
- visibility and orientation recovery
- video dropped-frame reporting where supported

## Debug view

Append `?debug=1` to show:

- native and viewport dimensions
- actual stage scale
- Melbourne date and time
- playback state and media time for all three videos
- dropped and total video frames where supported
- local font loading state

## Automated QC

`tools/qc.py` validates:

- video codec, resolution, frame rate, pixel format and duration
- no B-frames
- local WOFF2 font files
- exact 3840 × 804 stage declarations
- three panel videos
- Melbourne timezone logic
- local-only production runtime files
- noindex privacy directives

`tools/qc_browser.mjs` uses Playwright to validate:

- native 3840 × 804 playback layout
- 1600 × 900 desktop scaling
- 390 × 844 mobile scaling
- three 1280 × 804 internal panels
- date visibility at every test size
- local font loading
- no page or console errors
- no external runtime requests
- no horizontal or vertical overflow

QC screenshots are uploaded as a GitHub Actions artifact for 14 days.

## Asset build

The asset workflow runs `tools/build_assets.py`, then the static/media QC. It creates the local font files and placeholder MP4s, and commits changed generated assets back to `main`.

## Next implementation stages

1. Add 24 hour assets and hourly source selection.
2. Add 60 minute assets and minute-boundary switching.
3. Replace the seconds placeholder with an exact 60-second `00–59` video.
4. Add frame-aware drift correction against Melbourne system time.
5. Add managed media hosting and a local cache strategy for the production video library.
