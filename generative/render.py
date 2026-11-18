"""Three authored, periodic glyph worlds. Python 3 + NumPy + Pillow; no inference.
Run from any directory: python3 generative/render.py [--smoke].
The retained atlas contains four measured density choices per available style.
"""
from pathlib import Path
import colorsys, hashlib, json, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/generative'
OUT.mkdir(parents=True, exist_ok=True)
A = np.load(Path(__file__).with_name('glyphs.npz'))
ATLAS, TAGS = A['atlas'], A['tags']
W, H = 800, 550
C, R = W // 8, H // 11
N = 5400
I = np.arange(N)
U = (I % 120) / 120 * 2 * np.pi
V = (I // 120) / 45 * 2 * np.pi
GLYPH = (I % (len(ATLAS)//4))*4 + ((I*17//(len(ATLAS)//4))%4)
COLORS = np.array([colorsys.hsv_to_rgb((.47 + .39*x/N)%1, .62, 1) for x in I])*255
YY, XX = np.mgrid[:R,:C]
# Independent background: etched hills, receding ground and a sparsely lit sky.
RIDGE = 23 + 2*np.sin(XX*.085) + 1.2*np.cos(XX*.19)
GROUND = YY > RIDGE
BACK = np.zeros((R,C,3)) + [5,9,18]
BACK += GROUND[...,None] * np.array([8,13,19])
contour = np.abs(YY-RIDGE)<.6
grid = GROUND & (((YY-25)%5==0) | (np.abs(((XX-50)/np.maximum(YY-23,1)*14+4)%12-6)<.45))
BACK[grid] = [19,35,46]
BACK[contour] = [34,50,62]
BACK[(~GROUND)&((XX*47+YY*83)%139==0)] = [32,48,63]
BGID = ((XX*13+YY*29)%len(ATLAS)).astype(int)

def geometry(name,t):
    if name == 'tidal-weave':
        x=(U/np.pi-1)*2.8; z=(V/np.pi-1)*2
        y=-.1+.38*np.sin(2.3*x+t)*np.cos(2*z-t)+.15*np.sin(4*z+2*t)
        # Traveling crests and crossing strands on an actual undulating sheet.
        strength=.55+.45*np.cos(2.3*x+2*z-t)**2
    elif name == 'breathing-knot':
        r=1.18+.42*np.cos(3*U+t)
        cx=r*np.cos(2*U); cy=.62*np.sin(3*U+t); cz=r*np.sin(2*U)
        tube=.24+.07*np.sin(2*t+U)
        x=cx+tube*np.cos(V)*np.cos(2*U)
        y=cy+tube*np.sin(V)+.45
        z=cz+tube*np.cos(V)*np.sin(2*U)
        strength=.65+.35*np.sin(V+t)**2
    else:
        # Distinct birds follow closed trajectories, rather than a moving camera.
        bird=I//30; wing=(I%30)/29*2-1
        phase=bird*2.399963229728653
        a=t+phase
        radius=.7+1.5*((bird*37)%180)/180
        x=radius*np.cos(a)+.24*wing
        y=.7+.66*np.sin(2*a+phase*.13)+.22*np.abs(wing)*np.sin(6*t+phase)
        z=.7*radius*np.sin(a)+.11*wing
        strength=.65+.35*np.cos(phase+t)**2
    return np.stack([x,y,z],axis=1),strength

def frame(name,t):
    p,light=geometry(name,t)
    # Fixed viewing angle, depth-sorted occupied cells, crisp glyph compositing.
    yaw=.34
    x=p[:,0]*np.cos(yaw)+p[:,2]*np.sin(yaw)
    z=-p[:,0]*np.sin(yaw)+p[:,2]*np.cos(yaw)
    y=p[:,1]*.91-z*.4
    depth=7-z
    gx=np.rint(C/2+24*x*7/depth).astype(int)
    gy=np.rint(25-15*y*7/depth).astype(int)
    keep=(gx>=0)&(gx<C)&(gy>=2)&(gy<R-4)
    ids=np.flatnonzero(keep); pix=gy[ids]*C+gx[ids]
    order=np.lexsort((depth[ids],pix));ids=ids[order];pix=pix[order]
    _,first=np.unique(pix,return_index=True);ids=ids[first];pix=pix[first]
    glyph=BGID.copy().ravel(); color=(BACK.copy()*1.5).reshape(-1,3)
    glyph[pix]=GLYPH[ids]
    color[pix]=np.minimum(COLORS[ids]*light[ids,None]*1.35,255)
    masks=ATLAS[glyph].reshape(R,C,11,8).transpose(0,2,1,3).reshape(H,W)
    rgb=color.reshape(R,C,3).repeat(11,0).repeat(8,1)
    im=Image.fromarray(np.clip(masks[:,:,None]*rgb,0,255).astype('uint8'))
    return im,set(TAGS[GLYPH[ids]].tolist())

def main():
    smoke='--smoke' in sys.argv
    count=4 if smoke else 72
    records=[]; samples=[]
    for name in ['tidal-weave','breathing-knot','night-murmuration']:
        frames=[]; styles=set()
        palette_sheet=Image.new('RGB',(W,H*3))
        for k in range(3):palette_sheet.paste(frame(name,2*np.pi*k/3)[0],(0,H*k))
        palette=palette_sheet.quantize(colors=96,method=Image.Quantize.MEDIANCUT)
        for i in range(count):
            im,seen=frame(name,2*np.pi*i/count);styles|=seen
            frames.append(im.quantize(palette=palette,dither=Image.Dither.NONE))
            if i in [0,count//3,2*count//3]:samples.append((name,i,im))
        dest=OUT/(name+('-smoke' if smoke else '')+'.gif')
        frames[0].save(dest,save_all=True,append_images=frames[1:],duration=80,loop=0,optimize=True,disposal=1)
        records.append(dict(file=dest.name,frames=count,styles_visible=len(styles),available_styles=len(set(TAGS)),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
        print(records[-1],flush=True)
    sheet=Image.new('RGB',(1200,3*300),(5,9,18)); draw=ImageDraw.Draw(sheet)
    for j,(name,i,im) in enumerate(samples):
        x=(j%3)*400;y=(j//3)*300
        sheet.paste(im.resize((400,275)),(x,y+22));draw.text((x+8,y+6),f'{name} / frame {i}',fill='white')
    sheet.save(OUT/'review.png')
    if not smoke:
        manifest=dict(method='Deterministic periodic parametric geometry; authored motion and independent terrain. No learned model or hash-chain proof.',seed='deterministic integer identities',dimensions=[W,H],duration_seconds=count*.08,atlas_sha256=hashlib.sha256(Path(__file__).with_name('glyphs.npz').read_bytes()).hexdigest(),records=records)
        (OUT/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
