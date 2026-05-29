"""
VainMuze — Batch YouTube Shorts Generator
Processes every .wav file in a folder and generates:
  - YouTube Short / TikTok vertical (1080x1920) for each song

Run from Terminal:
    python3 batch_shorts.py

Output goes to: ~/Desktop/YouTube_vids/ and ~/Desktop/TikTok_vids/
"""

import os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import librosa

# ── PATHS ─────────────────────────────────────────────────────────────────────
SONGS_FOLDER = os.path.expanduser("~/Desktop/🎵 THE STUDIO/✅ Finished/Finished songs")
YOUTUBE_DIR  = os.path.expanduser("~/Desktop/YouTube_vids")
TIKTOK_DIR   = os.path.expanduser("~/Desktop/TikTok_vids")
AVATAR_PATH  = os.path.expanduser("~/Desktop/✍️ THE WRITER'S ROOM/vainmuze/public/VainMuze_avatar.png")

# ── CONFIG ────────────────────────────────────────────────────────────────────
FPS        = 24
W, H       = 1080, 1920     # vertical 9:16
BG_COLOR   = (8, 8, 10)
GOLD       = (201, 168, 76)
WHITE      = (255, 255, 255)
BAR_COUNT  = 48
BAR_MAX_H  = 280
SMOOTHING  = 0.72

# ── FONTS ─────────────────────────────────────────────────────────────────────
def get_font(size, bold=True):
    # macOS system fonts
    paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ] if bold else [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: continue
    return ImageFont.load_default()

# ── AUDIO ─────────────────────────────────────────────────────────────────────
def load_audio(path):
    y, sr = librosa.load(path, sr=None, mono=False)
    if y.ndim > 1: y = y.mean(axis=0)
    return y, sr, len(y) / sr

def compute_energies(y, n_frames):
    prev = np.zeros(BAR_COUNT)
    out  = []
    for i in range(n_frames):
        start = int(i * len(y) / n_frames)
        end   = min(int(start + len(y) / n_frames * 8), len(y))
        chunk = y[start:end]
        if len(chunk) < 64:
            out.append(prev.copy()); continue
        fft = np.abs(np.fft.rfft(chunk, n=2048))[:BAR_COUNT * 4]
        bars = np.zeros(BAR_COUNT)
        for b in range(BAR_COUNT):
            lo = int((b / BAR_COUNT) ** 1.4 * len(fft))
            hi = min(int(((b+1) / BAR_COUNT) ** 1.4 * len(fft)) + 1, len(fft))
            if hi > lo: bars[b] = np.mean(fft[lo:hi])
        mx = bars.max()
        if mx > 0: bars /= mx
        bars = SMOOTHING * prev + (1 - SMOOTHING) * bars
        prev = bars.copy()
        out.append(bars)
    return out

# ── AVATAR ────────────────────────────────────────────────────────────────────
def load_avatar():
    if not os.path.exists(AVATAR_PATH): return None
    try:
        img = Image.open(AVATAR_PATH).convert("RGBA")
        # Cover crop — maintain aspect ratio, fill frame, center crop
        img_ratio = img.width / img.height
        frame_ratio = W / H
        if img_ratio > frame_ratio:
            # Image is wider — fit height, crop width
            new_h = H
            new_w = int(H * img_ratio)
        else:
            # Image is taller — fit width, crop height
            new_w = W
            new_h = int(W / img_ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        # Center crop
        left = (new_w - W) // 2
        top  = (new_h - H) // 2
        img  = img.crop((left, top, left + W, top + H))
        r, g, b, a = img.split()
        a = a.point(lambda x: int(x * 0.50))
        img.putalpha(a)
        return img
    except: return None

# ── RENDER ────────────────────────────────────────────────────────────────────
def render_frame(bars, title, frame_idx, n_frames, avatar, font_title, font_brand):
    img = Image.new("RGB", (W, H), BG_COLOR)

    # Avatar full bleed
    if avatar:
        img.paste(avatar, (0, 0), avatar)

    # Vignette
    vig = Image.new("RGBA", (W, H), (0,0,0,0))
    vd  = ImageDraw.Draw(vig)
    for s in range(100):
        alpha = int(180 * (s/100)**2)
        vd.rectangle([s, s, W-s, H-s], outline=(0,0,0,alpha))
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    draw = ImageDraw.Draw(img)

    # Gold accent lines
    draw.rectangle([0, 0, W, 4], fill=GOLD)
    draw.rectangle([0, H-4, W, H], fill=GOLD)

    # Waveform bars — centered vertically lower third
    total_w = BAR_COUNT * (16 + 8) - 8
    bx = (W - total_w) // 2
    by = H - 380

    for i, e in enumerate(bars):
        x = bx + i * (16 + 8)
        h = max(4, int(e * BAR_MAX_H))
        fade = 1 - abs(i - BAR_COUNT//2) / (BAR_COUNT//2) * 0.4
        c = (int(GOLD[0]*fade), int(GOLD[1]*fade), int(GOLD[2]*fade))
        draw.rectangle([x, by-h, x+16, by+h], fill=c)
    draw.rectangle([bx, by-1, bx+total_w, by+1], fill=GOLD)

    # Title — auto-size to fit frame width
    t_str  = title.upper()
    margin = 80
    max_w  = W - (margin * 2)
    # Start at max size, shrink until it fits
    for size in range(130, 40, -4):
        f = get_font(size)
        bb = draw.textbbox((0,0), t_str, font=f)
        if (bb[2] - bb[0]) <= max_w:
            font_title = f
            break
    bb = draw.textbbox((0,0), t_str, font=font_title)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    ty = 200
    draw.text((tx+3, ty+3), t_str, font=font_title, fill=(0,0,0))
    draw.text((tx, ty), t_str, font=font_title, fill=WHITE)
    draw.rectangle([tx, ty+th+12, tx+tw, ty+th+17], fill=GOLD)

    # Brand
    bb2 = draw.textbbox((0,0), "VAINMUZE", font=font_brand)
    bw2 = bb2[2]-bb2[0]
    draw.text(((W-bw2)//2, ty+th+35), "VAINMUZE", font=font_brand, fill=GOLD)

    # Progress bar
    draw.rectangle([0, H-8, int(W*frame_idx/n_frames), H-4], fill=GOLD)

    return img

# ── FFMPEG PIPE ───────────────────────────────────────────────────────────────
def make_video(audio_path, title, output_path):
    print(f"\n  → {title}")
    y, sr, duration = load_audio(audio_path)
    n_frames = int(duration * FPS)
    energies = compute_energies(y, n_frames)
    avatar   = load_avatar()
    font_t   = get_font(130)
    font_b   = get_font(55, bold=False)

    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "pipe:0",
        "-i", audio_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", output_path
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stderr=subprocess.DEVNULL)
    for i in range(n_frames):
        if i % 100 == 0:
            print(f"    {int(100*i/n_frames)}%", end="\r", flush=True)
        frame = render_frame(energies[i], title, i, n_frames,
                             avatar, font_t, font_b)
        proc.stdin.write(np.array(frame).tobytes())
    proc.stdin.close()
    proc.wait()

    if proc.returncode == 0:
        mb = os.path.getsize(output_path)/1024/1024
        print(f"    ✅ {os.path.basename(output_path)} ({mb:.1f} MB)")
    else:
        print(f"    ❌ Failed: {title}")

# ── BATCH ─────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(YOUTUBE_DIR, exist_ok=True)
    os.makedirs(TIKTOK_DIR, exist_ok=True)

    if not os.path.exists(SONGS_FOLDER):
        print(f"❌ Folder not found: {SONGS_FOLDER}")
        print("   Check the path at the top of this script.")
        return

    songs = [f for f in os.listdir(SONGS_FOLDER)
             if f.lower().endswith(('.wav', '.mp3', '.aiff', '.m4a'))]
    songs.sort()

    if not songs:
        print(f"❌ No audio files found in: {SONGS_FOLDER}")
        return

    print(f"\n── VainMuze Batch Shorts Generator ──────────────────────")
    print(f"  Found {len(songs)} songs in: {SONGS_FOLDER}")
    print(f"  Output: {TIKTOK_DIR}")

    for song_file in songs:
        audio_path = os.path.join(SONGS_FOLDER, song_file)
        import re
        raw   = os.path.splitext(song_file)[0]
        clean = raw
        # Strip trailing junk: _mast, _master, _final, _mix, _v2, _copy, numbers
        clean = re.sub(r'[\s_\-]+(mast(er)?|final|mix|v\d+|demo|rough|copy|stems?|wav|mp3|\d+)$',
                       '', clean, flags=re.IGNORECASE)
        # Replace underscores and hyphens with spaces
        clean = clean.replace("_", " ").replace("-", " ")
        # Remove leading track numbers like "01 " or "1. "
        clean = re.sub(r'^\d+[\s.]+', '', clean)
        # Collapse multiple spaces
        clean = re.sub(r'\s+', ' ', clean).strip()
        # Title case
        title = clean.title()
        slug  = title.replace(" ", "_").replace("/", "-")
        output = os.path.join(TIKTOK_DIR, f"{slug}_shorts.mp4")

        if os.path.exists(output):
            print(f"  ⏭  Skipping {title} (already exists)")
            continue

        make_video(audio_path, title, output)

    print(f"\n── All done ──────────────────────────────────────────────")
    print(f"  Videos saved to: {TIKTOK_DIR}")
    print(f"  Upload each one to TikTok + YouTube Shorts manually")

if __name__ == "__main__":
    main()
