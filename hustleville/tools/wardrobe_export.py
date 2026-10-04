import sys, os, numpy as np, colorsys
sys.path.insert(0,'.')
from ext import extract
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
OUT='/home/user/webdev/hustleville/assets/wardrobe/'; os.makedirs(OUT,exist_ok=True)
W=400; H=716
def unbg(rgb_img, alpha=None):
    a=np.array(rgb_img.convert('RGB')).astype(int); ref=np.array([a[:8,:8].reshape(-1,3).mean(0)]).reshape(3)
    d=np.abs(a-ref).sum(2); near=d<46
    lab,n=ndi.label(near); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge)); al=np.where(bg,0,255).astype(np.uint8)
    return a.astype(np.uint8),al
def save_layer(im, name):
    a=np.array(im); rgb=a[:,:,:3].astype(int); al=a[:,:,3].astype(float)
    ref=np.array([40,70,120])  # bg approx; measured below per image
    return a
# measure bg from base
BASES={'m':Image.open('base_m.png').convert('RGB'),'w':Image.open('base_w.png').convert('RGB')}
BG={k:np.array(v)[:8,:8].reshape(-1,3).mean(0) for k,v in BASES.items()}
def finish_layer(im,b,fn):
    a=np.array(im).astype(float); rgb=a[:,:,:3]; al=a[:,:,3]
    d=np.abs(rgb-BG[b]).sum(2); al=np.where(d<40,0,al)             # drop leftover background-blue pixels at the edges
    al=np.array(Image.fromarray(al.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)))
    out=Image.fromarray(np.dstack([rgb.astype(np.uint8),al]),'RGBA').resize((W,H),Image.LANCZOS); out.save(OUT+fn,quality=88,method=6)
    bb=out.getbbox(); return out,bb
ITEMS={'m_hoodie':('m','top','u_m_hoodie'),'m_cargo':('m','bottom','u_m_cargo'),'m_hightop':('m','shoes','u_m_hightop'),'m_cap':('m','head','u_m_cap'),
'w_jacket':('w','top','u_w_jacket'),'w_cargo':('w','bottom','u_w_cargo'),'w_platform':('w','shoes','u_w_platform'),'w_beanie':('w','head','u_w_beanie'),
's_m_floral':('m','top','s_m_floral'),'s_m_board':('m','bottom','s_m_board'),'s_m_sandal':('m','shoes','s_m_sandal'),'s_m_shades':('m','face','s_m_shades'),
's_w_sundress':('w','dress','s_w_sundress'),'s_w_denim':('w','bottom','s_w_denim'),'s_w_sunhat':('w','head','s_w_sunhat'),'s_w_sandal':('w','shoes','s_w_sandal'),
'v_m_suit':('m','top','v_m_suit'),'v_m_trousers':('m','bottom','v_m_trousers'),'v_m_oxford':('m','shoes','v_m_oxford'),
'v_w_gown':('w','dress','v_w_gown'),'v_w_blazer':('w','top','v_w_blazer'),'v_w_heels':('w','shoes','v_w_heels'),
'a_m_top':('m','top','a_m_top'),'a_m_track':('m','bottom','a_m_track'),'a_m_run':('m','shoes','a_m_run'),
'a_w_top':('w','top','a_w_top'),'a_w_leggings':('w','bottom','a_w_leggings'),'a_w_train':('w','shoes','a_w_train')}
for f,(b,slot,iid) in ITEMS.items():
    es={'dress':'dress','face':'head'}.get(slot,slot)
    im=extract(f,b,es)
    if slot=='face':
        a=np.array(im); a[:,:,3][:int(a.shape[0]*0.08)]=0; a[:,:,3][int(a.shape[0]*0.27):]=0; im=Image.fromarray(a,'RGBA')   # glasses live around the eyes only
    out,bb=finish_layer(im,b,f'g-{iid}.webp')
    # thumbnail: layer cropped to its bounding box on a transparent square
    c=out.crop(bb); s=max(c.size); pad=int(s*0.08); T=Image.new('RGBA',(s+2*pad,s+2*pad),(0,0,0,0)); T.paste(c,(pad+(s-c.width)//2,pad+(s-c.height)//2)); T=T.resize((120,120),Image.LANCZOS); T.save(OUT+f't-{iid}.webp',quality=88,method=6)
    print('layer',iid,bb)
# bodies
BODY={'amara':('w','base_w.png'),'diego':('m','base_m.png'),'yuki':('w','fb_yuki.png'),'priya':('w','fb_priya.png'),'sofia':('w','fb_sofia.png'),'olga':('w','fb_olga.png'),
      'kenji':('m','fb_kenji.png'),'omar':('m','fb_omar.png'),'liam':('m','fb_liam.png'),'noah':('m','fb_noah.png')}
for k,(b,fn) in BODY.items():
    img=Image.open(fn).convert('RGB')
    if k=='omar':
        a=np.array(img).astype(float)/255; r,g,bl=a[...,0],a[...,1],a[...,2]; mx=a.max(2); mn=a.min(2); d=np.maximum(mx-mn,1e-6)
        h=np.where(mx==r,((g-bl)/d)%6,np.where(mx==g,(bl-r)/d+2,(r-g)/d+4))*60; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
        m=(h>38)&(h<80)&(s>0.3)&(mx>0.32)
        out=a.copy(); 
        for y,x in zip(*np.where(m)):
            hh,ss,vv=colorsys.rgb_to_hsv(*a[y,x]); out[y,x]=colorsys.hsv_to_rgb(28/360,min(1,ss*0.95),vv)
        img=Image.fromarray((out*255).astype(np.uint8))
    rgb,al=unbg(img); al=np.array(Image.fromarray(al).filter(ImageFilter.GaussianBlur(0.6)))
    Image.fromarray(np.dstack([rgb,al]),'RGBA').resize((W,H),Image.LANCZOS).save(OUT+f'body-{k}.webp',quality=90,method=6)
print('done')
