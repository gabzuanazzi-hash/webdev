import numpy as np, sys
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
OUT='/home/user/webdev/hustleville/assets/wardrobe/'
def extract(name, b, slot=None, thr=36):
    base=np.array(Image.open(f'base_{b}.png').convert('RGB')).astype(int); e=np.array(Image.open(name+'.png').convert('RGB')).astype(int)
    d=np.abs(e-base).max(2); m=d>thr
    H=m.shape[0]
    if slot=='head': m[int(H*0.42):]=False
    if slot=='shoes': m[:int(H*0.80)]=False
    if slot in ('top','bottom'): m[:int(H*0.17)]=False; m[int(H*0.93):]=False
    if slot in ('bottom','dress'):                       # also replace the plain grey shorts the base wears, so no waistband peeks out
        r,g,b=base[...,0],base[...,1],base[...,2]; gray=(abs(r-g)<14)&(abs(g-b)<22)&(r>95)&(r<180); gray[:int(H*0.40)]=False; gray[int(H*0.72):]=False
        gl,gn=ndi.label(gray)
        if gn:
            gs=ndi.sum(gray,gl,range(1,gn+1)); gray=np.isin(gl,[i+1 for i,z in enumerate(gs) if z>=0.2*gs.max()])
        fp=ndi.binary_fill_holes(ndi.binary_dilation(gray,iterations=5)); m=m|fp
    m=ndi.binary_opening(m,iterations=1); lab,n=ndi.label(ndi.binary_dilation(m,iterations=4))
    if n:
        sizes=ndi.sum(m,lab,range(1,n+1)); keep=[i+1 for i,z in enumerate(sizes) if z>=400]; m=m&np.isin(lab,keep)
    m=ndi.binary_closing(m,iterations=3); m=ndi.binary_fill_holes(m); m=ndi.binary_dilation(m,iterations=2)
    # include the dark outline that borders the garment
    alpha=np.array(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0)))
    out=e.astype(np.uint8).copy()
    if slot=='top' and b=='w':                            # crop tops: the grey waistband of the base shorts shows through; paint it as midriff skin
        r,g,b=e[...,0],e[...,1],e[...,2]; gray=(abs(r-g)<14)&(abs(g-b)<22)&(r>95)&(r<180)&m; gray[:int(H*0.36)]=False; gray[int(H*0.70):]=False
        gl,gn=ndi.label(gray)
        if gn:
            gs=ndi.sum(gray,gl,range(1,gn+1)); gray=np.isin(gl,[i+1 for i,z in enumerate(gs) if z>=60])
        if gray.any():
            reg=base[int(H*0.74):int(H*0.82), int(768*0.2):int(768*0.8)].reshape(-1,3); reg=reg[reg.sum(1)>240]
            q=(reg//8).astype(int); vals,cnt=np.unique(q,axis=0,return_counts=True); skin=(vals[cnt.argmax()]*8+4)
            out[ndi.binary_dilation(gray,iterations=2)&m]=skin
    rgba=np.dstack([out,alpha]); im=Image.fromarray(rgba,'RGBA')
    return im
if __name__=='__main__':
    import os; os.makedirs(OUT,exist_ok=True)
    for n,b,slot in [('m_hoodie','m','top'),('m_cargo','m','bottom'),('m_hightop','m','shoes'),('m_cap','m','head'),('w_cargo','w','bottom'),('w_platform','w','shoes'),('w_beanie','w','head')]:
        im=extract(n,b,slot); im.save('lay_'+n+'.png')
