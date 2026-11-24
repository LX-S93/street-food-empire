"""Ping-pong loop and compress a ComfyUI animated WebP for the game."""
import sys
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src);fr=[]
for i in range(im.n_frames):
    im.seek(i);fr.append(im.convert('RGB').resize((480,328),Image.LANCZOS))
fr=fr[:-2]  # last frames tend to drift
seq=fr+fr[-2:0:-1]
seq[0].save(dst,'WEBP',save_all=True,append_images=seq[1:],duration=90,loop=0,quality=60,method=3)
print(dst,len(seq))
