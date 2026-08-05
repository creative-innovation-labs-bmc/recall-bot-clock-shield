# Project brief

## Description

Three-panel Recall-Bot video clock for a 3840 × 804 NVIDIA Shield signage screen.

## Build brief

Purpose:
Create a lightweight Shield-compatible clock framework for the fixed 3840 × 804 ultra-wide signage screen.

Layout:
- Native canvas 3840 × 804.
- Three equal panels, each 1280 × 804.
- Left to right: HOUR, MINUTE, SECOND.
- Each panel has a top-left date overlay.
- Each panel has a bottom-left small live clock.
- Background #373A36.
- Aurecon green accent #89C925, near-black #1C1B1C, white text.

Typography:
- Use locally hosted Open Sans for sans-serif UI text.
- Use locally hosted PT Serif Bold for serif clock numerals.
- Copy the proven local font setup used by the recent PT Serif / Open Sans clock repositories.
- No runtime Google Fonts requests.

Prototype content:
- Include three lightweight local H.264 MP4 placeholder loops at 1280 × 804, 15 fps, muted, autoplay, playsinline and looped.
- Placeholder videos should visibly identify Hour, Minute and Second and demonstrate independent playback.
- Keep video assets in an obvious replaceable assets structure.

Runtime:
- Vanilla HTML, CSS and JavaScript only.
- Lock displayed time to Australia/Melbourne using Intl.DateTimeFormat.
- Automatically scale the native 3840 × 804 stage to browser/mobile previews while preserving aspect ratio.
- Add resilient autoplay handling and poster fallbacks.
- Prepare the code structure for later hour asset switching, minute asset switching and a synchronised 60-second seconds video.
- Avoid WebGL and heavy frameworks.

Privacy / deployment:
- GitHub Pages enabled.
- Root page should remain blank and non-descriptive.
- Production screen should be hosted under a non-descriptive path.
- Include noindex, nofollow, noarchive, nosnippet and noimageindex directives.
- Include robots.txt that disallows crawling.
- Add a restrictive CSP that still permits local video, fonts, CSS and JavaScript.

QC:
- Validate native 3840 × 804 layout and mobile scaling.
- Validate all three videos load and play.
- Validate fonts are local-only.
- Validate no console errors.
- Validate no horizontal or vertical overflow.
- Add a debug mode using ?debug=1 showing viewport, scale, clock value and video state.
- Document build, asset replacement and Shield test notes in README.md.
