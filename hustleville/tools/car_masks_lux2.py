import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-webdev/eb1e90b8-8466-5206-a755-d461a4da82f4/scratchpad/car')
from paintlib import *
import numpy as np, cv2, json, os
OUT='/home/user/webdev/hustleville/assets/garage'
meta_f=json.load(open('frame/meta.json')); meta=json.load(open(OUT+'/meta.json'))
D={
'scar0':([(370,120,42,12,20),(492,102,9,7,40)],[(50,118,30,45),(280,152,36,48)]),
'scar1':([(367,135,27,11,14),(480,100,9,8,40)],[(55,135,30,48),(282,175,38,52)]),
'scar2':([(365,150,40,13,25),(480,112,7,13,70)],[(60,135,30,45),(277,182,38,52)]),
'scar3':([(332,135,38,12,30),(490,105,8,18,60)],[(42,128,28,40),(247,170,40,52)]),
'bell0':([(310,115,28,9,6),(480,110,22,8,-15)],[(35,127,28,45),(225,155,40,55)]),
'bell1':([(310,115,28,9,6),(480,110,22,8,-15)],[(40,128,28,45),(222,152,40,55)]),
'bell2':([(332,107,22,6,5),(479,98,17,6,-10)],[(47,122,28,48),(245,150,42,58)]),
'bell3':([(303,118,28,9,8),(480,114,20,8,-12)],[(32,134,25,45),(215,156,40,55)]),
'zef0':([(298,132,26,15,40),(457,102,12,14,60)],[(37,100,30,52),(232,167,48,56)]),
'zef1':([(297,133,26,15,40),(457,106,12,14,60)],[(40,111,30,52),(232,166,48,56)]),
'zef2':([(327,145,26,15,35),(481,117,10,14,60)],[(47,142,32,50),(265,182,44,56)]),
'zef3':([(322,130,26,15,35),(472,97,12,14,60)],[(40,122,30,50),(260,162,44,56)]),
'kron0':([(315,167,32,10,30),(476,117,7,22,70)],[(45,145,30,50),(252,210,42,62)]),
'kron1':([(311,187,32,10,30),(476,140,7,22,70)],[(42,160,28,50),(252,217,42,62)]),
'kron2':([(311,180,32,10,30),(480,130,7,22,70)],[(40,150,30,48),(245,215,42,60)]),
'kron3':([(311,158,32,10,30),(482,101,7,22,70)],[(37,126,28,50),(250,206,42,62)])}
LOWV={'zef2':(0.12,0.3),'bell1':(0.2,0.42),'bell0':(0.14,0.35),'bell2':(0.2,0.4),'kron2':(0.14,0.3)}
def hue_mask(rgba,excl=None,key=None):
    H=hsv(rgba); a=rgba[:,:,3]>200; h,s,v=H[:,:,0],H[:,:,1]/255,H[:,:,2]/255
    sel=(s>0.45)&(v>0.25)&a; hist=np.bincount(h[sel].astype(int)%256,minlength=256).astype(float)
    hist=np.convolve(np.concatenate([hist[-8:],hist,hist[:8]]),np.ones(9)/9,'same')[8:-8]; pk=int(np.argmax(hist))
    def hm(lo,hi):
        lo%=256;hi%=256; return ((h>=lo)|(h<=hi)) if lo>hi else ((h>=lo)&(h<=hi))
    dark=(120<=pk<=215); vmin=0.34 if dark else 0.22; smin=0.42
    if key in LOWV: vmin,smin=LOWV[key]
    core=hm(pk-18,pk+18)&(s>(0.40 if not dark else smin))&(v>vmin)&a
    if excl is not None: core&=(excl==0)
    core=clean(core,1,3,150,300)
    loose=hm(pk-34,pk+34)&(s>0.12)&(v>(0.2 if dark else 0.08))&a
    if excl is not None: loose&=(excl==0)
    g=cv2.dilate(core.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
    core=(core|(g&loose)).astype(np.uint8); core=clean(core,1,3,150,300)
    hl=(v>0.78)&(s>0.10)&a&hm(pk-45,pk+45); g2=cv2.dilate(core,np.ones((5,5),np.uint8)).astype(bool); core=(core|(hl&g2)).astype(np.uint8)
    return clean(core,1,3,150,300),pk
tiles=[]; keys=list(D)
for k in keys:
    mf=meta_f[k]; A=np.array(mf['A']); s=float(np.sqrt(A[0,0]**2+A[1,0]**2)); variants=['stock','wide'] if mf['wide'] else ['stock']
    meta[k]={'w':560,'h':0,'wide':mf['wide']}
    for var in variants:
        fr=load(f'frame/{k}_{var}.png'); h,w=fr.shape[:2]
        ex=np.zeros((h,w),np.uint8)
        for cx,cy,rx,ry in D[k][1]:
            x=A[0,0]*cx+A[0,1]*cy+A[0,2]; y=A[1,0]*cx+A[1,1]*cy+A[1,2]; cv2.ellipse(ex,(int(x),int(y)),(int(rx*s*0.85),int(ry*s*0.85)),-8,0,360,1,-1)
        for cx,cy,rx,ry,ang in D[k][0]:
            x=A[0,0]*cx+A[0,1]*cy+A[0,2]; y=A[1,0]*cx+A[1,1]*cy+A[1,2]; cv2.ellipse(ex,(int(x),int(y)),(int(rx*s*1.1),int(ry*s*1.1)),ang,0,360,1,-1)
        m,pk=hue_mask(fr,ex,k)
        if m.sum()<8000: m,pk=hue_mask(fr,None,k); print('fallback',k,var,int(m.sum()))
        ms=cv2.GaussianBlur(m.astype(np.float32),(0,0),0.7); Y=luma(fr); yref=np.percentile(Y[m>0],70)
        R=np.clip(Y/yref*150,0,255); pm=np.dstack([R,ms*255,np.zeros_like(R)]).astype(np.uint8)
        tw=560; sc=tw/w; th=int(round(h*sc))
        Image.fromarray(cv2.resize(fr,(tw,th),interpolation=cv2.INTER_AREA),'RGBA').save(f'{OUT}/{k}-{var}.webp',quality=92,alpha_quality=100,method=6)
        Image.fromarray(cv2.resize(pm,(tw,th),interpolation=cv2.INTER_AREA),'RGB').save(f'{OUT}/{k}-{var}-pm.png',optimize=True)
        meta[k]['h']=th
        if var=='stock':
            lamps=[];
            for cx,cy,rx,ry,ang in D[k][0]:
                x=A[0,0]*cx+A[0,1]*cy+A[0,2]; y=A[1,0]*cx+A[1,1]*cy+A[1,2]; lamps.append([round(x/w,4),round(y/h,4),round(rx*s/w,4),round(ry*s/h,4),ang])
            meta[k]['lamps']=lamps
            wl=[]
            for cx,cy,rx,ry in D[k][1]:
                x=A[0,0]*cx+A[0,1]*cy+A[0,2]; y=A[1,0]*cx+A[1,1]*cy+A[1,2]; wl.append([round(x/w,4),round(y/h,4),round(rx*s*0.74/w,4),round(ry*s*0.74/h,4),-8])
            meta[k].setdefault('wheels',{})['stock']=wl; meta[k]['wheels']['wide']=[[a,b,c*1.05,d*1.05,e] for a,b,c,d,e in wl]
        print(k,var,'hue',pk,'mask',int(m.sum()))
        tiles.append(overlay_mask(fr,m,col=(0,255,80),alpha=0.6))
json.dump(meta,open(OUT+'/meta.json','w'))
# icon atlas
S=256; atlas=Image.new('RGBA',(4*S,4*S),(0,0,0,0))
for i,k in enumerate(keys):
    im=Image.open(f'frame/{k}_stock.png').convert('RGBA'); w,h=im.size; sc=min((S-8)/w,(S-8)/h); im=im.resize((int(w*sc),int(h*sc)),Image.LANCZOS)
    atlas.alpha_composite(im,((i%4)*S+(S-im.width)//2,(i//4)*S+(S-im.height)//2))
atlas.save('/home/user/webdev/hustleville/assets/garage/lux-icons.webp',quality=90,method=6)
cols=4; W=max(t.width for t in tiles);Hh=max(t.height for t in tiles); rows=(len(tiles)+cols-1)//cols
sh=Image.new('RGB',(W*cols,Hh*rows))
for i,t in enumerate(tiles): sh.paste(t,((i%cols)*W,(i//cols)*Hh))
sh.save('/tmp/lx/masks.png'); print(sh.size)
