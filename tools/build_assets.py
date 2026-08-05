from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SCREEN = ROOT / 'screen-b7f4e2'
FONTS = SCREEN / 'fonts'
VIDEOS = SCREEN / 'assets' / 'videos'
LICENSES = SCREEN / 'licenses'


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def convert_font(source: Path, target: Path) -> None:
    font = TTFont(source)
    font.flavor = 'woff2'
    font.save(target)


def build_video(kind: str, label: str, offset: float) -> None:
    output = VIDEOS / f'{kind}-placeholder.mp4'
    semibold = FONTS / 'OpenSans-SemiBold.ttf'
    x = f'250+22*sin(2*PI*(t+{offset})/6)'
    y = f'208+12*sin(2*PI*(t+{offset})/4)'
    vf = ','.join([
        f"drawbox=x='{x}':y='{y}':w=780:h=390:color=#F5F4F2:t=fill",
        f"drawbox=x='{x}':y='{y}':w=780:h=390:color=#CFCFCA:t=4",
        f"drawbox=x='{x}+18':y='{y}+126':w=7:h=138:color=#89C925:t=fill",
        f"drawbox=x='{x}+755':y='{y}+126':w=7:h=138:color=#89C925:t=fill",
        f"drawtext=fontfile='{semibold}':text='{label} PLACEHOLDER':fontcolor=#4E5859:fontsize=25:x='(w-text_w)/2+22*sin(2*PI*(t+{offset})/6)':y='535+12*sin(2*PI*(t+{offset})/4)'",
    ])
    run(
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', 'color=c=#373A36:s=1280x804:r=15:d=12',
        '-vf', vf,
        '-c:v', 'libx264', '-profile:v', 'main', '-level', '4.1',
        '-pix_fmt', 'yuv420p', '-r', '15', '-g', '15', '-keyint_min', '15',
        '-sc_threshold', '0', '-bf', '0', '-crf', '21', '-movflags', '+faststart',
        '-an', str(output),
    )


def main() -> None:
    FONTS.mkdir(parents=True, exist_ok=True)
    VIDEOS.mkdir(parents=True, exist_ok=True)
    LICENSES.mkdir(parents=True, exist_ok=True)

    sources = {
        'OpenSans-Regular.ttf': Path('/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'),
        'OpenSans-SemiBold.ttf': Path('/usr/share/fonts/truetype/open-sans/OpenSans-Semibold.ttf'),
        'PTSerif-Bold.ttf': Path('/usr/share/fonts/truetype/paratype/PTF75F.ttf'),
    }
    for name, source in sources.items():
        shutil.copy2(source, FONTS / name)

    convert_font(FONTS / 'OpenSans-Regular.ttf', FONTS / 'OpenSans-Regular.woff2')
    convert_font(FONTS / 'OpenSans-SemiBold.ttf', FONTS / 'OpenSans-SemiBold.woff2')
    convert_font(FONTS / 'PTSerif-Bold.ttf', FONTS / 'PTSerif-Bold.woff2')

    shutil.copy2('/usr/share/doc/fonts-open-sans/copyright', LICENSES / 'OpenSans-copyright.txt')
    shutil.copy2('/usr/share/doc/fonts-paratype/copyright', LICENSES / 'PTSerif-copyright.txt')

    build_video('hour', 'HOUR', 0.0)
    build_video('minute', 'MINUTE', 1.3)
    build_video('second', 'SECOND', 2.6)

    for ttf in FONTS.glob('*.ttf'):
        ttf.unlink()


if __name__ == '__main__':
    main()
