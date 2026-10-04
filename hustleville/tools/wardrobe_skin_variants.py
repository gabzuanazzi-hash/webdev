import sys, os, json, numpy as np, colorsys
from PIL import Image
OUT='/home/user/webdev/hustleville/assets/wardrobe/'
def skin_of(path):
    a=np.array(Image.open(path).convert('RGB')).astype(int); H=a.shape[0]
    reg=a[int(H*0.74):int(H*0.82), int(a.shape[1]*0.2):int(a.shape[1]*0.8)].reshape(-1,3); reg=reg[reg.sum(1)>240]
    q=(reg//8); vals,cnt=np.unique(q,axis=0,return_counts=True); return vals[cnt.argmax()]*8+4
def hsv(c): return colorsys.rgb_to_hsv(*(np.array(c)/255.0))
TEMPLATE={'w':'base_w.png','m':'base_m.png'}
BODY={'amara':('w','base_w.png'),'diego':('m','base_m.png'),'yuki':('w','fb_yuki.png'),'priya':('w','fb_priya.png'),'sofia':('w','fb_sofia.png'),'olga':('w','fb_olga.png'),
      'kenji':('m','fb_kenji.png'),'omar':('m','fb_omar.png'),'liam':('m','fb_liam.png'),'noah':('m','fb_noah.png')}
TSK={g:skin_of(p) for g,p in TEMPLATE.items()}
# omar's skin was hue-corrected on export; measure from the exported body instead
SK={}
for k,(g,fn) in BODY.items():
    SK[k]=skin_of(fn) if k!='omar' else None
ob=Image.open(OUT+'body-omar.webp').convert('RGBA'); oa=np.array(ob); H=oa.shape[0]
reg=oa[int(H*0.74):int(H*0.82), int(oa.shape[1]*0.2):int(oa.shape[1]*0.8)]; reg=reg[reg[:,:,3]>200][:,:3].astype(int); reg=reg[reg.sum(1)>240]
q=reg//8; vals,cnt=np.unique(q,axis=0,return_counts=True); SK['omar']=vals[cnt.argmax()]*8+4
print({k:tuple(v) for k,v in SK.items()}, {g:tuple(v) for g,v in TSK.items()})
def recolor(layer, g, target):
    a=np.array(layer).astype(float); rgb=a[:,:,:3]; al=a[:,:,3]
    t=TSK[g].astype(float); th,ts,tv=hsv(t)
    mx=rgb.max(2); mn=rgb.min(2); v=mx/255; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1),0)
    r,gg,b=rgb[...,0],rgb[...,1],rgb[...,2]; d=np.maximum(mx-mn,1e-6)
    h=np.where(mx==r,((gg-b)/d)%6,np.where(mx==gg,(b-r)/d+2,(r-gg)/d+4))/6
    dh=np.minimum(np.abs(h-th),1-np.abs(h-th))
    m=(al>0)&(dh<0.045)&(s>ts*0.55)&(s<ts*1.35)&(v>tv*0.55)&(v<tv*1.25)
    ratio=np.array(target,float)/t
    out=rgb.copy()
    for c in range(3): out[...,c]=np.where(m,np.clip(rgb[...,c]*ratio[c],0,255),rgb[...,c])
    return Image.fromarray(np.dstack([out,al]).astype(np.uint8),'RGBA'), m.sum()
import re
REG={'u_w_jacket':(0.36,0.62),'a_w_top':(0.36,0.62),'s_w_sandal':(0.84,1),'s_m_sandal':(0.84,1),'v_w_heels':(0.84,1),'v_w_gown':(0.15,0.40),'s_w_sundress':(0.15,0.40),'s_m_floral':(0.15,0.40)}
need={}
for iid,(y0,y1) in REG.items():
    g=iid.split('_')[1] if iid.split('_')[1] in 'wm' else iid.split('_')[1]
    g='w' if '_w_' in iid else 'm'
    layer=Image.open(OUT+f'g-{iid}.webp').convert('RGBA'); H=layer.height
    need[iid]=1
    for k,(bg,_) in BODY.items():
        if bg==g and k not in ('amara','diego'):
            im,cnt=recolor(layer,g,SK[k]); a2=np.array(im); orig=np.array(layer)
            keep=np.zeros(a2.shape[:2],bool); keep[int(H*y0):int(H*y1)]=True
            a2[~keep]=orig[~keep]; Image.fromarray(a2,'RGBA').save(OUT+f'g-{iid}@{k}.webp',quality=88,method=6)
print(sorted(need))
json.dump(sorted(need),open('skin_layers.json','w'))
