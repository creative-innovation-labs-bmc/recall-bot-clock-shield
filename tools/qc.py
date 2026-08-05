from __future__ import annotations
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SCREEN=ROOT/'screen-b7f4e2'
def probe(path:Path)->dict[str,object]:
    output=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,pix_fmt','-of','json',str(path)],text=True)
    return json.loads(output)['streams'][0]
def main()->None:
    videos=sorted((SCREEN/'assets'/'videos').glob('*.mp4'));assert len(videos)==3,f'Expected three videos, found {len(videos)}'
    for video in videos:
        data=probe(video);assert data['codec_name']=='h264',(video,data);assert data['width']==1280 and data['height']==804,(video,data);assert data['r_frame_rate']=='15/1',(video,data);assert data['pix_fmt']=='yuv420p',(video,data)
    for required in ['index.html','style.css','app.js','fonts/PTSerif-Bold.woff2','fonts/OpenSans-Regular.woff2','fonts/OpenSans-SemiBold.woff2']:
        assert (SCREEN/required).exists(),required
    print('QC passed: three H.264 placeholders, local fonts and screen files are present.')
if __name__=='__main__':main()
