"""Run against npm run dev: python tests/crop-browser.py."""
import io
import os
import shutil
from PIL import Image
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(os.environ.get('APP_URL','http://127.0.0.1:3000'))
    expect(page.locator('#save-status')).to_contain_text('gespeichert')
    image=io.BytesIO(); Image.new('RGB',(900,600),'red').save(image,format='PNG')
    page.locator('#photos-input').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':image.getvalue()})
    expect(page.locator('#photo-count')).to_have_text('1 / 9')
    frame=page.locator('[data-frame="0"]'); box=frame.bounding_box()
    x=box['x']+box['width']/2; y=box['y']+box['height']/2
    cdp=context.new_cdp_session(page)
    def touch(kind, points):
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':a,'y':b,'id':i,'radiusX':2,'radiusY':2} for i,a,b in points]})
    def photo():
        return page.evaluate('''() => new Promise(resolve=>{
            const r=indexedDB.open('logbuch-studio',1);
            r.onsuccess=()=>{const db=r.result;const q=db.transaction('projects').objectStore('projects').get('active');q.onsuccess=()=>{resolve(q.result.photos[0]);db.close()}};
        })''')
    # One-finger drag can leave the old frame boundaries entirely.
    touch('touchStart',[(1,x,y)])
    touch('touchMove',[(1,x+160,y+50)])
    touch('touchEnd',[])
    page.wait_for_timeout(350)
    moved=photo(); assert moved['offsetX']>400 and moved['offsetY']>100,moved
    page.locator('#undo-button').click(); page.wait_for_timeout(100)
    assert photo().get('offsetX',0)==0
    # Add a second finger, pinch, lift it, continue dragging with the first.
    touch('touchStart',[(1,x-12,y)])
    touch('touchStart',[(1,x-12,y),(2,x+12,y)])
    touch('touchMove',[(1,x-17,y-12),(2,x+17,y+22)])
    touch('touchEnd',[(1,x-17,y-12)])
    touch('touchMove',[(1,x-2,y-2)])
    touch('touchEnd',[])
    page.wait_for_timeout(350)
    pinched=photo(); assert abs(pinched['zoom']-2)<.05,pinched
    assert abs(pinched['rotation']-45)<1,pinched
    assert pinched['offsetY']>0,{k:v for k,v in pinched.items() if k!='src'}
    page.locator('#undo-button').click(); page.wait_for_timeout(100)
    assert photo()['zoom']==1 and photo().get('offsetX',0)==0
    page.locator('#redo-button').click(); page.wait_for_timeout(100)
    assert photo()==pinched
    # Wheel notch stays under a 5% change, with an inverse restoring zoom.
    frame.hover(); page.mouse.wheel(0,120); page.wait_for_timeout(400)
    wheeled=photo(); assert .95<wheeled['zoom']/pinched['zoom']<1
    page.mouse.wheel(0,-120); page.wait_for_timeout(400)
    assert abs(photo()['zoom']-pinched['zoom'])<1e-10
    page.reload(); expect(page.locator('#photo-count')).to_have_text('1 / 9')
    assert abs(photo()['zoom']-pinched['zoom'])<1e-10
    assert not errors,errors
    print('PASS real Chromium touch input: free pan, pinch with rotation, finger transitions, single-gesture undo/redo, gentle wheel and saved restoration')
    browser.close()
