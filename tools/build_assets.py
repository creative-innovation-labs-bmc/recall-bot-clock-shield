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
    open_sans = FONTS / 'OpenSans-SemiBold.ttf'
    regular = FONTS / 'OpenSans-Regular.ttf'
    vf = (
        f"drawbox=x='250+22*sin(2*PI*(t+{offset})/6)':y='208+12*sin(2*PI*(t+{offset})/4)':w=780:h=390:color=#F5F4F2:t=fill,"
        f"drawbox=x='250+22*sin(2*PI*(t+{offset})/6)':y='208+12*sin(2*PI*(t+{offset})/4)':w=780:h=390:color=#CFCFCA:t=4,"
        f"drawtext=fontfile='{open_sans}':text='{label} VIDEO PLACEHOLDER':fontcolor=#373A36:fontsize=35:x='(w-text_w)/2+22*sin(2*PI*(t+{offset})/6)':y='350+12*sin(2*PI*(t+{offset})/4)',"
        f"drawtext=fontfile='{regular}':text='1280 x 804   15 FPS   H.264':fontcolor=#4E5859:fontsize=25:x='(w-text_w)/2+22*sin(2*PI*(t+{offset})/6)':y='414+12*sin(2*PI*(t+{offset})/4)',"
        f"drawbox=x='502+22*sin(2*PI*(t+{offset})/6)':y='477+12*sin(2*PI*(t+{offset})/4)':w=276:h=7:color=#89C925:t=fill"
    )
    run('ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=#373A36:s=1280x804:r=15:d=12','-vf',vf,'-c:v','libx264','-profile:v','main','-level','4.1','-pix_fmt','yuv420p','-r','15','-g','15','-keyint_min','15','-sc_threshold','0','-bf','0','-crf','21','-movflags','+faststart','-an',str(output))


def main() -> None:
    FONTS.mkdir(parents=True, exist_ok=True); VIDEOS.mkdir(parents=True, exist_ok=True); LICENSES.mkdir(parents=True, exist_ok=True)
    sources = {
        'OpenSans-Regular.ttf': Path('/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'),
        'OpenSans-SemiBold.ttf': Path('/usr/share/fonts/truetype/open-sans/OpenSans-Semibold.ttf'),
        'PTSerif-Bold.ttf': Path('/usr/share/fonts/truetype/paratype/PTF75F.ttf'),
    }
    for name, source in sources.items(): shutil.copy2(source, FONTS / name)
    convert_font(FONTS/'OpenSans-Regular.ttf', FONTS/'OpenSans-Regular.woff2')
    convert_font(FONTS/'OpenSans-SemiBold.ttf', FONTS/'OpenSans-SemiBold.woff2')
    convert_font(FONTS/'PTSerif-Bold.ttf', FONTS/'PTSerif-Bold.woff2')
    shutil.copy2('/usr/share/doc/fonts-open-sans/copyright', LICENSES/'OpenSans-copyright.txt')
    shutil.copy2('/usr/share/doc/fonts-paratype/copyright', LICENSES/'PTSerif-copyright.txt')
    build_video('hour','HOUR',0.0); build_video('minute','MINUTE',1.3); build_video('second','SECOND',2.6)
    for ttf in FONTS.glob('*.ttf'): ttf.unlink()


if __name__ == '__main__': main()

# Asset build trigger: 2026-08-05
