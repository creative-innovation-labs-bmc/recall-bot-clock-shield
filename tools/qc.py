from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCREEN = ROOT / 'screen-b7f4e2'


def probe(path: Path) -> dict[str, object]:
    output = subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,r_frame_rate,pix_fmt,has_b_frames,duration',
        '-of', 'json', str(path),
    ], text=True)
    return json.loads(output)['streams'][0]


def main() -> None:
    videos = sorted((SCREEN / 'assets' / 'videos').glob('*.mp4'))
    assert len(videos) == 3, f'Expected three videos, found {len(videos)}'
    for video in videos:
        data = probe(video)
        assert data['codec_name'] == 'h264', (video, data)
        assert data['width'] == 1280 and data['height'] == 804, (video, data)
        assert data['r_frame_rate'] == '15/1', (video, data)
        assert data['pix_fmt'] == 'yuv420p', (video, data)
        assert data['has_b_frames'] == 0, (video, data)
        assert 11.9 <= float(data['duration']) <= 12.1, (video, data)

    required = [
        'index.html', 'style.css', 'app.js',
        'fonts/PTSerif-Bold.woff2',
        'fonts/OpenSans-Regular.woff2',
        'fonts/OpenSans-SemiBold.woff2',
    ]
    for relative in required:
        assert (SCREEN / relative).exists(), relative

    html = (SCREEN / 'index.html').read_text(encoding='utf-8')
    css = (SCREEN / 'style.css').read_text(encoding='utf-8')
    js = (SCREEN / 'app.js').read_text(encoding='utf-8')
    root_html = (ROOT / 'index.html').read_text(encoding='utf-8')

    assert html.count('<video') == 3
    assert 'id="stage-shell"' in html
    assert 'noindex,nofollow,noarchive,nosnippet,noimageindex' in html
    assert "width:var(--stage-width)" in css and "height:var(--stage-height)" in css
    assert '--stage-width:3840px' in css and '--stage-height:804px' in css
    assert 'OpenSans-Regular.woff2' in css and 'PTSerif-Bold.woff2' in css
    assert "Australia/Melbourne" in js
    assert 'nativeWidth: 3840' in js and 'nativeHeight: 804' in js
    assert '__RECALL_CLOCK_QC__' in js
    assert 'noindex,nofollow,noarchive,nosnippet,noimageindex' in root_html

    combined = '\n'.join([html, css, js])
    assert not re.search(r'https?://', combined), 'Production route must not request external runtime assets'

    for font in (SCREEN / 'fonts').glob('*.woff2'):
        assert font.read_bytes()[:4] == b'wOF2', f'Invalid WOFF2 file: {font}'

    print('QC passed: fixed 3840×804 layout, three H.264 placeholders, local fonts and privacy directives.')


if __name__ == '__main__':
    main()
