"""Remove only connected checkerboard background and pack dialogue sprites.

Usage: python3 scripts/prepare-story-atlas.py INPUT_PNG OUTPUT_PNG
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src = Image.open(sys.argv[1]).convert('RGB')
rgb = np.asarray(src).astype(float)
neutral = (rgb.max(2)-rgb.min(2)<18) & (rgb.min(2)>180)
labels, count = ndi.label(neutral)
sizes = np.bincount(labels.ravel())
background = np.zeros(neutral.shape, dtype=bool)
expected_light = (rgb[0].mean(1)>235)[None,:] == (rgb[:,0].mean(1)>235)[:,None]
for label in range(1, count+1):
    if sizes[label] < 60:
        continue
    component = labels == label
    values = rgb[component].mean(1)
    # The checkerboard has both pale gray and near-white squares. Interior
    # highlights without this pattern remain opaque.
    touches_edge = any((component[0].any(), component[-1].any(), component[:,0].any(), component[:,-1].any()))
    pattern_match = np.mean((values>235)==expected_light[component])
    cy,cx=ndi.center_of_mass(component)
    # These two white sleeve details were checked against the source artwork.
    sleeve = 260<cy<290 and (390<cx<420 or 505<cx<530)
    if not sleeve and (touches_edge or (sizes[label]>200 and np.mean(values<224)>.15 and np.mean(values>244)>.15)):
        background |= component

alpha = (~background).astype(float)
# Subpixel smoothing of the extracted silhouette, never the character colors.
alpha = ndi.gaussian_filter(alpha, .45)
alpha[alpha<.08]=0
alpha[alpha>.92]=1
rgba = np.dstack((rgb.astype('uint8'), (alpha*255).astype('uint8')))
cutout = Image.fromarray(rgba)
# Per-character bounds keep the original nonuniform row spacing out of CSS.
boxes = [(20,10,302,440),(319,8,615,440),(632,35,956,439),(958,82,1254,440),
         (4,449,355,862),(357,443,614,864),(632,444,958,864),(960,438,1254,864),
         (22,873,302,1245),(332,860,615,1245),(626,860,957,1245),(957,888,1254,1245)]
atlas=Image.new('RGBA',(1280,1280))
for i,box in enumerate(boxes):
    tile=cutout.crop(box)
    tile.thumbnail((294,394),Image.Resampling.LANCZOS)
    x=i%4*320+(320-tile.width)//2
    y=round((i//4+1)*1280/3)-14-tile.height
    atlas.alpha_composite(tile,(x,y))
out=Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True)
atlas.save(out,optimize=True,quality=92)
preview=Image.new('RGBA',atlas.size,'#25443b');preview.alpha_composite(atlas)
preview.convert('RGB').save('/tmp/story-cutouts-preview.jpg')
print(f'{out}: RGBA, {np.mean(np.asarray(atlas)[:,:,3]==0):.1%} transparent pixels')
