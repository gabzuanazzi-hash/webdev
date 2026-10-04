import sys, numpy as np, colorsys
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
OUT='/home/user/webdev/hustleville/assets/avatars/'
orig={k:Image.open(OUT+k+'.webp').convert('RGBA') for k in ['auburn','fade']}
def cell(im,i,cw,ch): return im.crop(((i%4)*cw,(i//4)*ch,(i%4)*cw+cw,(i//4)*ch+ch))
def keybg(c):
    a=np.array(c.convert('RGB')).astype(int); h,w,_=a.shape
    ref=np.median(np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3),a[:,:6].reshape(-1,3),a[:,-6:].reshape(-1,3)]),axis=0)
    d=np.abs(a-ref).sum(2); near=d<70
    lab,n=ndi.label(near); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge)); alpha=np.where(bg,0,255).astype(np.uint8)
    alpha=np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
    rgba=np.dstack([a.astype(np.uint8),alpha]); return Image.fromarray(rgba,'RGBA')
def sq(c,size=192,margin=0.06):
    a=np.array(c)[:,:,3]>40; ys,xs=np.where(a)
    if len(xs)==0: return c.resize((size,size))
    x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max(); s=max(x1-x0,y1-y0)*(1+margin*2); cx=(x0+x1)/2; cy=(y0+y1)/2
    # keep bust bottoms anchored: centre on bbox
    box=(int(cx-s/2),int(cy-s/2),int(cx+s/2),int(cy+s/2))
    pad=Image.new('RGBA',(c.width+400,c.height+400),(0,0,0,0)); pad.paste(c,(200,200))
    return pad.crop((box[0]+200,box[1]+200,box[2]+200,box[3]+200)).resize((size,size),Image.LANCZOS)
def recolor_baby(base,skin,blanket_hue=None,sat=1.0):
    a=np.array(base).astype(float); rgb=a[:,:,:3]/255; out=rgb.copy()
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    mx=rgb.max(2); mn=rgb.min(2); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    h=np.zeros_like(mx); d=np.maximum(mx-mn,1e-6)
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    skin_m=(h>8)&(h<38)&(s>0.18)&(s<0.65)&(v>0.55)
    ref=np.array([0.94,0.74,0.63]); lum=(0.3*r+0.59*g+0.11*b)/ (0.3*ref[0]+0.59*ref[1]+0.11*ref[2])
    tgt=np.array(skin)/255
    for c in range(3): out[...,c]=np.where(skin_m,np.clip(tgt[c]*lum,0,1),out[...,c])
    if blanket_hue is not None:
        bm=((h>300)|(h<5))&(s>0.15)&(v>0.5)&(~skin_m)|((h>90)&(h<200)&(s>0.15)) 
        bm=bm&(~skin_m)
        hh=np.where(bm,blanket_hue,h)/60
        # hsv->rgb
        i=np.floor(hh).astype(int)%6; f=hh-np.floor(hh); p=v*(1-s); q=v*(1-s*f); t=v*(1-s*(1-f))
        R=np.choose(i,[v,q,p,p,t,v]);G=np.choose(i,[t,v,v,q,p,p]);B=np.choose(i,[p,p,t,v,v,q])
        for c,X in enumerate([R,G,B]): out[...,c]=np.where(bm,X,out[...,c])
    res=np.dstack([out*255,a[:,:,3]]).astype(np.uint8); return Image.fromarray(res,'RGBA')
CH={ # name:(file,key,label,who,skin)
 'amara':('Amara','Woman',(150,98,70)),'diego':('Diego','Man',(214,160,118)),'yuki':('Yuki','Woman',(250,214,190)),'kenji':('Kenji','Man',(236,196,160)),
 'priya':('Priya','Woman',(190,134,98)),'omar':('Omar','Man',(184,130,92)),'sofia':('Sofia','Woman',(222,170,128)),'liam':('Liam','Man',(250,214,194)),
 'olga':('Olga','Woman',(248,216,196)),'noah':('Noah','Man',(246,206,176))}
def build(k):
    im=Image.open(k+'.png').convert('RGB'); cw,chh=im.width//4,im.height//2; cells=[]
    for i in range(8):
        c0=cell(im,i,cw,chh); c0=c0.crop((5,5,c0.width-5,c0.height-2)); c=keybg(c0); cells.append(sq(c))
    who=CH[k][1]; skin=CH[k][2]
    # baby: recoloured original layout; ghost: original ghost
    base=cell(orig['auburn'],0,192,192) if skin[0]>200 or True else None
    baby=recolor_baby(base,skin,blanket_hue=(330 if who=='Woman' else 215))
    cells[0]=baby; cells[7]=cell(orig['auburn'],7,192,192)
    atlas=Image.new('RGBA',(768,384),(0,0,0,0))
    for i,c in enumerate(cells): atlas.paste(c,((i%4)*192,(i//4)*192))
    atlas.save(OUT+k+'.webp',quality=90,method=6); atlas.save('prev_'+k+'.png')
if __name__=='__main__':
    for k in sys.argv[1:]: build(k); print('built',k)
