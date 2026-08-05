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

## Production asset map

`screen-b7f4e2/asset-config.js` controls the transition from placeholders to final media.

Current mode:

```text
placeholder
```

Prepared production paths:

```text
assets/hour/00.mp4 to assets/hour/23.mp4
assets/minute/00.mp4 to assets/minute/59.mp4
assets/second/seconds-00-59.mp4
```

Hour and minute media switch only when their clock values change. The second panel uses one continuous clock-aligned cycle.

## Clock-aligned video synchronisation

The system clock remains the timing authority. Video time is treated as presentation state and corrected against the clock.

The current implementation:

- calculates the correct phase for hour, minute and second videos
- aligns each video after metadata loads
- uses `requestVideoFrameCallback()` where available
- falls back to watchdog-based checks where it is unavailable
- ignores drift below 70 ms
- gently corrects small drift at `0.98×` or `1.02×`
- seeks directly when drift exceeds 180 ms
- forces a resynchronisation after visibility changes or stalled playback
- uses circular drift calculations across loop boundaries

The 12-second placeholders are already clock-phase aligned. When the final 60-second seconds video is enabled, it will be aligned to milliseconds elapsed within the current minute.

## Runtime resilience

The framework also includes:

- Melbourne time locked with `Intl.DateTimeFormat`
- whole-second aligned clock updates
- muted autoplay recovery
- stalled and waiting playback handling
- a six-second playback watchdog
- visibility and orientation recovery
- automatic fallback to placeholder media when a production asset fails
- video dropped-frame reporting where supported

## Debug view

Append `?debug=1` to show:

- native and viewport dimensions
- actual stage scale
- active asset mode
- Melbourne date and time
- playback state and media time for all three videos
- playback rate, measured drift and correction mode
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
- production asset paths
- frame callback, playback-rate and seek correction code
- local-only production runtime files
- noindex privacy directives

`tools/qc_browser.mjs` uses Playwright to validate:

- native 3840 × 804 playback layout
- 1600 × 900 desktop scaling
- 390 × 844 mobile scaling
- three 1280 × 804 internal panels
- date visibility at every test size
- local font loading
- active placeholder asset mode
- sync diagnostics for all three panels
- no page or console errors
- no external runtime requests
- no horizontal or vertical overflow

QC screenshots are uploaded as a GitHub Actions artifact for 14 days.

## Asset build

The asset workflow runs `tools/build_assets.py`, then the static/media QC. It creates the local font files and placeholder MP4s, and commits changed generated assets back to `main`.

## Next implementation stages

1. Upload the 24 hour assets and enable the hour mapping.
2. Upload the 60 minute assets and enable minute-boundary switching.
3. Upload the exact 60-second `00–59` sequence and enable the second mapping.
4. Add managed media hosting and a local cache strategy for the production video library.
5. Run extended soak testing on the installed Shield.
