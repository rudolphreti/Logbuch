"""Functional test: run the app first, then python3 tests/browser.py.
Requires Playwright (Python) and Pillow; uses installed Chromium when available.
"""
import base64
import io
import json
import os
import shutil
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright, expect

with tempfile.TemporaryDirectory() as temp, sync_playwright() as p:
    launch = {"headless": True, "args": ["--no-sandbox"]}
    if shutil.which("chromium"):
        launch["executable_path"] = shutil.which("chromium")
    profile = str(Path(temp) / "browser-profile")
    context = p.chromium.launch_persistent_context(profile, viewport={"width": 1440, "height": 1000}, accept_downloads=True, **launch)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(os.environ.get("APP_URL", "http://127.0.0.1:3000"))
    page.wait_for_function('document.querySelector("#save-status").textContent.includes("Zapisano")')
    expect(page.locator(".frame-overlay")).to_have_count(9)
    assert page.locator(".assets-panel,.inspector,#texts-tab").count() == 0
    for field in ["host", "friday", "saturday", "treasure"]:
        assert page.locator(f"#text-{field}").evaluate("e=>!!e.closest('.page-surface')")
    # The blank second page must actually use the replacement artwork.
    page.wait_for_function('''async () => {
        const source=new Image(); source.src='5ea0771d-2f7f-4574-a89c-82a7d4339f16.png'; await source.decode();
        const expected=document.createElement('canvas'); expected.width=1054; expected.height=1492;
        expected.getContext('2d').drawImage(source,0,0,1054,1492);
        return expected.toDataURL()===document.querySelector('#page-1').toDataURL();
    }''')

    files = []
    for i in range(9):
        image = Image.new("RGB", (900, 600), (60 + i * 15, 110 + i * 9, 150 - i * 9))
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, 300, 600), fill=(200, 150, 80))
        draw.ellipse((340, 120, 760, 540), fill=(230, 220, 180))
        path = Path(temp) / f"photo-{i+1}.png"
        image.save(path)
        files.append(str(path))
    # Start by clicking a real, empty frame on the template.
    with page.expect_file_chooser() as chooser:
        page.locator('[data-frame="0"]').click()
    chooser.value.set_files(files[0])
    expect(page.locator("#photo-count")).to_have_text("1 / 9")
    page.locator("#photos-input").set_input_files(files[1:])
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    expect(page.locator("#save-status")).to_contain_text("Zapisano")
    # All eight new frame interiors contain the photos, while decoration stays intact.
    page.wait_for_function('''async () => {
        const source=new Image(); source.src='5ea0771d-2f7f-4574-a89c-82a7d4339f16.png'; await source.decode();
        const expected=document.createElement('canvas'); expected.width=1054; expected.height=1492;
        const reference=expected.getContext('2d'); reference.drawImage(source,0,0,1054,1492);
        const ctx=document.querySelector('#page-1').getContext('2d');
        const pixel=(context,x,y)=>[...context.getImageData(x,y,1,1).data];
        const interiors=[[330,300],[819,248],[190,740],[520,640],[840,680],[510,915],[291,1226],[771,1139]];
        const decorations=[[80,140],[810,75],[80,700],[520,475],[900,520],[390,860],[270,1020],[770,1000]];
        return interiors.every(([x,y])=>pixel(ctx,x,y).slice(0,3).some(v=>v<235))
            && decorations.every(([x,y])=>pixel(ctx,x,y).every((v,i)=>v===pixel(reference,x,y)[i]));
    }''')
    print('PASS replacement artwork, eight new photo positions and preserved frame decorations')
    page.screenshot(path='/tmp/logbuch-all-frames.png',full_page=True)

    # A file dropped onto a specific template frame replaces only that frame.
    transfer = page.evaluate_handle('''data => {
        const transfer = new DataTransfer();
        const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        transfer.items.add(new File([bytes], 'drop-target.png', {type:'image/png'}));
        return transfer;
    }''', base64.b64encode(Path(files[1]).read_bytes()).decode())
    page.locator('[data-frame="1"]').dispatch_event("drop", {"dataTransfer": transfer})
    page.wait_for_function("!document.body.classList.contains('busy')")

    # Cropping, dragging and undo/redo.
    page.locator('[data-frame="0"]').click()
    page.locator("#photo-zoom").fill("2.5")
    page.locator("#photo-zoom").dispatch_event("change")
    expect(page.locator("#photo-scale")).to_have_value("250")
    frame = page.locator('[data-frame="0"]')
    box = frame.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] / 2 + 25, box["y"] + box["height"] / 2 + 12, steps=5)
    page.mouse.up()
    # Type directly into the corresponding blank places on the two templates.
    page.locator("#text-host").click()
    expect(page.locator("#text-host")).to_be_focused()
    expect(page.locator("#photo-toolbar")).to_be_hidden()
    old_canvas = page.locator("#page-0").evaluate("e=>e.toDataURL()")
    page.locator("#text-host").fill("Rodzina Kowalskich")
    page.wait_for_function("old=>document.querySelector('#page-0').toDataURL()!==old", arg=old_canvas)
    expect(page.locator("#text-host")).to_be_focused()
    page.locator("#text-friday").fill("Wyruszyliśmy nad morze. Znaleźliśmy muszle i prawdziwy skarb!")
    page.locator("#text-treasure").fill("Nasz najpiękniejszy weekend")
    expect(page.locator(".mood-button")).to_have_count(0)
    page.locator("#project-title").fill("Wspomnienia z podróży")
    page.locator("#project-title").blur()
    expect(page.locator("#save-status")).to_contain_text("Zapisano")

    def download_json():
        page.locator("#export-button").click()
        with page.expect_download() as pending:
            page.locator("#download-json").click()
        return json.loads(Path(pending.value.path()).read_text())

    project = download_json()
    assert len([photo for photo in project["photos"] if photo]) == 9
    assert project["photos"][0]["zoom"] == 2.5
    assert project["photos"][1]["name"] == "drop-target.png"
    assert project["photos"][0]["offsetX"] != 0 and project["photos"][0]["offsetY"] != 0
    assert project["texts"]["host"] == "Rodzina Kowalskich"
    assert project["mood"] is None
    print("PASS upload 9 photos, crop, pan, text and portable JSON")

    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-toolbar")).to_be_visible()
    with page.expect_file_chooser() as chooser:
        page.locator("#replace-photo").click()
    chooser.value.set_files(files[8])
    expect(page.locator("#photo-scale")).to_have_value("100")
    page.locator("#remove-photo").click()
    expect(page.locator("#photo-count")).to_have_text("8 / 9")
    page.locator("#undo-button").click()
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    page.locator("#redo-button").click()
    expect(page.locator("#photo-count")).to_have_text("8 / 9")

    saved = Path(temp) / "project.json"
    saved.write_text(json.dumps(project))
    page.locator("#json-input").set_input_files(str(saved))
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-scale")).to_have_value("250")
    bad = Path(temp) / "bad.json"
    bad.write_text('{"version":999}')
    page.locator("#json-input").set_input_files(str(bad))
    expect(page.locator("#toast")).to_contain_text("nie jest plik projektu")
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    print("PASS replacement, removal, undo/redo and atomic JSON import")

    # Shrink below the frame, then drag across white space in the natural direction.
    page.locator('[data-frame="0"]').click()
    page.locator("#reset-crop").click()
    page.locator("#photo-scale").fill("20")
    page.locator("#photo-scale").blur()
    page.wait_for_function("""() => {
        const ctx=document.querySelector('#page-0').getContext('2d');
        const white=ctx.getImageData(100,160,1,1).data;
        const photo=ctx.getImageData(237,249,1,1).data;
        return [...white].every(v=>v===255) && photo[0]<250;
    }""")
    frame = page.locator('[data-frame="0"]')
    box = frame.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down()
    page.mouse.move(box['x']+box['width']/2+12,box['y']+box['height']/2+10,steps=5)
    page.mouse.up()
    page.locator("#photo-scale").fill("0")
    expect(page.locator("#photo-scale")).to_have_attribute("aria-invalid","true")
    page.locator("#photo-scale").blur()
    expect(page.locator("#photo-scale")).to_have_value("20")

    # Percentage entry, buttons and wheel all support values far below 1%.
    page.locator('[data-frame="1"]').click()
    page.locator("#photo-scale").fill("0.0000001")
    page.locator("#photo-scale").blur()
    for _ in range(12):
        page.locator("#photo-minus").click()
    tiny_percent=float(page.locator("#photo-scale").input_value())
    assert 0 < tiny_percent < 0.0000001
    page.locator('[data-frame="1"]').hover()
    page.mouse.wheel(0,120)
    page.wait_for_function("old=>Number(document.querySelector('#photo-scale').value)<old",arg=tiny_percent)
    page.locator("#photo-plus").click()
    page.locator("#photo-scale").fill("0.0000001")
    page.locator("#photo-scale").blur()
    project=download_json()
    assert project['photos'][0]['zoom']==0.2
    assert project['photos'][0]['offsetX']>0 and project['photos'][0]['offsetY']>0
    assert abs(project['photos'][1]['zoom']-1e-9)<1e-22

    # Import the undersized and tiny scales again, preserving both positions.
    saved.write_text(json.dumps(project))
    page.locator('[data-frame="0"]').click()
    page.locator("#photo-scale").fill("70")
    page.locator("#photo-scale").blur()
    page.locator("#json-input").set_input_files(str(saved))
    page.wait_for_function("!document.body.classList.contains('busy')")
    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-scale")).to_have_value("20")
    print("PASS white background, small-photo panning, arbitrary downscaling and JSON round trip")

    page.locator("#export-button").click()
    with page.expect_download(predicate=lambda d:d.suggested_filename.endswith('-strona-1.png')) as first, page.expect_download(predicate=lambda d:d.suggested_filename.endswith('-strona-2.png')) as second:
        page.locator("#download-png").click()
    expect(page.locator('#png-download-links a')).to_have_count(2)
    page.wait_for_timeout(200)
    for i,pending in enumerate([first,second]):
        exported=Image.open(pending.value.path()).convert('RGBA')
        assert exported.size==(1054,1492)
        data=page.locator(f"#page-{i}").evaluate("canvas=>canvas.toDataURL('image/png')")
        visible=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
        assert visible.tobytes()==exported.tobytes(), f"Page {i+1} export mismatch"
        if i==0:
            assert exported.getpixel((100,160))==(255,255,255,255)
    # An explicit per-page download remains available even if a browser blocks a second automatic download.
    with page.expect_download() as individual:
        page.locator('#png-download-links a').nth(1).click()
    assert individual.value.suggested_filename.endswith('-strona-2.png')
    page.keyboard.press('Escape')
    print('PASS two separate PNG downloads, white pixels and equality with both canvases')

    page.evaluate("window.scrollTo(0,0)")
    page.screenshot(path="/tmp/logbuch-filled.png", full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    page.reload()
    expect(page.locator('[data-page="1"]')).to_be_hidden()
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    page.locator("#text-host").click()
    page.locator("#text-host").fill("Rodzina Kowalskich")
    expect(page.locator("#text-host")).to_be_focused()
    assert page.locator("#text-host").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 14
    page.keyboard.press("Escape")
    page.locator("#fit-button").click()
    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-scale")).to_have_value("20")
    expect(page.locator("#photo-toolbar")).to_be_visible()
    controls = page.locator("#photo-toolbar").bounding_box()
    assert controls['x']>=0 and controls['x']+controls['width']<=390
    page.locator("#close-photo-tools").click()
    assert page.locator("body").evaluate("e=>e.scrollWidth") <= 390
    page.locator('[data-view="1"]').click()
    expect(page.locator('[data-page="0"]')).to_be_hidden()
    expect(page.locator('[data-page="1"]')).to_be_visible()
    page.evaluate("window.scrollTo(0,0)")
    page.screenshot(path="/tmp/logbuch-mobile.png", full_page=True)
    page.locator("#export-button").click()
    expect(page.locator("#export-dialog")).to_be_visible()
    page.keyboard.press("Escape")
    assert not errors, errors
    print("PASS mobile layout, page selection, dialogs and no JavaScript errors")
    context.close()

    # Close and reopen the entire browser with the same disk profile.
    context = p.chromium.launch_persistent_context(profile, viewport={"width": 1440, "height": 1000}, **launch)
    page = context.new_page()
    page.goto(os.environ.get("APP_URL", "http://127.0.0.1:3000"))
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-scale")).to_have_value("20")
    restored = page.evaluate('''() => new Promise((resolve,reject) => {
        const open = indexedDB.open('logbuch-studio',1);
        open.onsuccess = () => {
            const db = open.result;
            const request = db.transaction('projects').objectStore('projects').get('active');
            request.onsuccess = () => { resolve(request.result); db.close(); };
            request.onerror = () => reject(request.error);
        };
        open.onerror = () => reject(open.error);
    })''')
    for key in ["title", "photos", "texts", "mood"]:
        assert restored[key] == project[key], key
    print("PASS IndexedDB restoration after closing and reopening the browser")
    context.close()
