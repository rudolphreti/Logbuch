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

from PIL import Image, ImageDraw, ImageChops
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
    for field in ["host", "friday", "caption8", "story"]:
        assert page.locator(f"#text-{field}").evaluate("e=>!!e.closest('.page-surface')")

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
    expect(page.locator("#zoom-value")).to_have_text("250%")
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
    page.locator("#text-caption8").fill("Nasz najpiękniejszy weekend")
    page.locator("#text-story").fill("Jeszcze tu wrócimy. ⚓")
    page.get_by_role("button", name="Wspaniały", exact=True).click()
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
    assert project["photos"][0]["x"] != 0 and project["photos"][0]["y"] != 0
    assert project["texts"]["host"] == "Rodzina Kowalskich"
    assert project["mood"] == 4
    print("PASS upload 9 photos, crop, pan, text, mood and portable JSON")

    page.locator('[data-frame="0"]').click()
    expect(page.locator("#photo-toolbar")).to_be_visible()
    with page.expect_file_chooser() as chooser:
        page.locator("#replace-photo").click()
    chooser.value.set_files(files[8])
    expect(page.locator("#zoom-value")).to_have_text("100%")
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
    expect(page.locator("#zoom-value")).to_have_text("250%")
    bad = Path(temp) / "bad.json"
    bad.write_text('{"version":999}')
    page.locator("#json-input").set_input_files(str(bad))
    expect(page.locator("#toast")).to_contain_text("nie jest plik projektu")
    expect(page.locator("#photo-count")).to_have_text("9 / 9")
    print("PASS replacement, removal, undo/redo and atomic JSON import")

    page.locator("#export-button").click()
    with page.expect_download() as pending:
        page.locator("#download-png").click()
    exported = Image.open(pending.value.path()).convert("RGBA")
    assert exported.size == (2108, 1492)
    page.wait_for_timeout(200)
    for i in range(2):
        data = page.locator(f"#page-{i}").evaluate("canvas=>canvas.toDataURL('image/png')")
        visible = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1]))).convert("RGBA")
        half = exported.crop((i * 1054, 0, (i + 1) * 1054, 1492))
        assert ImageChops.difference(visible, half).getbbox() is None, f"Page {i+1} export mismatch"
    print("PASS both-page PNG export matches both canvases pixel-for-pixel")

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
    expect(page.locator("#zoom-value")).to_have_text("250%")
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
