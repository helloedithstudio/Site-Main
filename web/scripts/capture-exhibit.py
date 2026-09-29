"""Records a Showcase exhibit's loop: the real page, scrolled by a script, captured frame by frame as the browser draws it.

    python scripts/capture-exhibit.py exhibit-01 http://localhost:3100/ home
    python scripts/capture-exhibit.py exhibit-02 http://localhost:3100/join short

Run it against a production server (`npx next start -p 3100` after `npm run build`), so the development badge never
appears. It uses the laptop's NVIDIA GPU through headless Chrome, so the WebGL runs at full speed. Frames arrive as
the page actually renders them (Chrome's screencast) and are resampled to a steady 30 frames a second into
../blender/work/showcase/works/<slug>/frame_NNNN.png; then `node scripts/make-showcase-media.cjs --loops` encodes them.

Needs Python Playwright and its Chromium (already on this machine). Plays for about ten seconds.
"""
import base64
import json
import os
import shutil
import sys
import time

from playwright.sync_api import sync_playwright

CHROME = os.path.expandvars(r"%LOCALAPPDATA%\ms-playwright\chromium-1243\chrome-win64\chrome.exe")
ARGS = ["--headless=new", "--use-angle=d3d11", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"]
W, H, FPS = 1280, 800, 30
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "blender", "work", "showcase", "works"))


def run_script(page, kind):
    """The motion in the loop: the home page lingers on its marble, then glides down; other pages drift down slowly."""
    if kind == "home":
        page.wait_for_timeout(2600)
        for _ in range(60):
            page.mouse.wheel(0, 34)
            page.wait_for_timeout(90)
        page.wait_for_timeout(1800)
    elif kind == "short":
        # a short page: a slow drift that stays on its content and never reaches the footer
        page.wait_for_timeout(1800)
        for _ in range(45):
            page.mouse.wheel(0, 5)
            page.wait_for_timeout(110)
        page.wait_for_timeout(1800)
    else:
        page.wait_for_timeout(1400)
        for _ in range(70):
            page.mouse.wheel(0, 16)
            page.wait_for_timeout(100)
        page.wait_for_timeout(1400)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    slug, url = sys.argv[1], sys.argv[2]
    kind = sys.argv[3] if len(sys.argv) > 3 else "page"
    out = os.path.join(OUT_ROOT, slug)
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    frames = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True, args=ARGS)
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        page.goto(url, wait_until="load")
        gpu = page.evaluate(
            "() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }"
        )
        print("rendering on:", gpu)
        page.wait_for_timeout(5200)  # the preloader dissolves and the scene settles

        cdp = page.context.new_cdp_session(page)

        def on_frame(event):
            frames.append((event["metadata"]["timestamp"], event["data"]))
            cdp.send("Page.screencastFrameAck", {"sessionId": event["sessionId"]})

        cdp.on("Page.screencastFrame", on_frame)
        cdp.send("Page.startScreencast", {"format": "png", "maxWidth": W, "maxHeight": H, "everyNthFrame": 1})
        start = time.time()
        run_script(page, kind)
        cdp.send("Page.stopScreencast")
        page.wait_for_timeout(300)
        browser.close()

    if len(frames) < 10:
        print(f"only {len(frames)} frames arrived; is the page animating?")
        sys.exit(1)
    frames.sort(key=lambda f: f[0])
    t0 = frames[0][0]
    duration = frames[-1][0] - t0
    count = int(duration * FPS)
    k = 0
    for i in range(count):
        t = t0 + i / FPS
        while k + 1 < len(frames) and frames[k + 1][0] <= t:
            k += 1
        with open(os.path.join(out, f"frame_{i + 1:04d}.png"), "wb") as f:
            f.write(base64.b64decode(frames[k][1]))
    with open(os.path.join(out, "capture.json"), "w") as f:
        json.dump({"url": url, "kind": kind, "gpu": gpu, "captured": len(frames), "seconds": round(duration, 2), "fps": FPS, "frames": count}, f, indent=2)
    print(f"{slug}: {len(frames)} frames drawn over {duration:.1f} s ({len(frames) / max(duration, 0.01):.0f} fps), written as {count} frames at {FPS} fps to {out}")


if __name__ == "__main__":
    main()
