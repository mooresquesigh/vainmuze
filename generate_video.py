"""
VainMuze — Cinematic Video Generator
Generates three versions from one audio file:
  1. YouTube visualizer  (1280x720, full song, waveform only)
  2. YouTube lyric video (1280x720, full song, waveform + lyrics)
  3. TikTok vertical     (1080x1920, full song, vertical waveform + lyrics)

Usage:
    python3 generate_video.py --audio Crying.wav --title Crying --lyrics crying_lyrics.json
"""

import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import librosa

# ── SHARED CONFIG ────────────────────────────────────────────────────────────
BG_COLOR   = (10, 10, 12)
GOLD       = (201, 168, 76)
GOLD_DIM   = (80,  65,  28)
WHITE      = (255, 255, 255)
FPS        = 24
SMOOTHING  = 0.72
BAR_COUNT  = 64

AVATAR_PATH  = "/sessions/upbeat-busy-lamport/mnt/✍️ THE WRITER'S ROOM/vainmuze/public/VainMuze_avatar.png"
YOUTUBE_DIR  = "/sessions/upbeat-busy-lamport/mnt/YouTube_vids"
TIKTOK_DIR   = "/sessions/upbeat-busy-lamport/mnt/TikTok_vids"

# ── FONTS ────────────────────────────────────────────────────────────────────
FONT_BOLD_PATHS = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
]
FONT_REG_PATHS = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
]

def get_font(size, bold=True):
    paths = FONT_BOLD_PATHS if bold else FONT_REG_PATHS
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# ── AUDIO ────────────────────────────────────────────────────────────────────
def load_audio(path):
    print(f"  Loading audio: {path}")
    y, sr = librosa.load(path, sr=None, mono=False)
    if y.ndim > 1:
        y = y.mean(axis=0)
    duration = len(y) / sr
    print(f"  Duration: {duration:.1f}s | {sr}Hz")
    return y, sr, duration

def compute_energies(y, sr, n_frames):
    prev = np.zeros(BAR_COUNT)
    energies = []
    for i in range(n_frames):
        start = int(i * len(y) / n_frames)
        end   = min(int(start + len(y) / n_frames * 8), len(y))
        chunk = y[start:end]
        if len(chunk) < 64:
            energies.append(prev.copy()); continue
        fft = np.abs(np.fft.rfft(chunk, n=2048))[:BAR_COUNT * 4]
        bar_vals = np.zeros(BAR_COUNT)
        for b in range(BAR_COUNT):
            lo = int((b / BAR_COUNT) ** 1.4 * len(fft))
            hi = min(int(((b+1) / BAR_COUNT) ** 1.4 * len(fft)) + 1, len(fft))
            if hi > lo: bar_vals[b] = np.mean(fft[lo:hi])
        mx = bar_vals.max()
        if mx > 0: bar_vals /= mx
        bar_vals = SMOOTHING * prev + (1 - SMOOTHING) * bar_vals
        prev = bar_vals.copy()
        energies.append(bar_vals)
    return energies

# ── AVATAR ───────────────────────────────────────────────────────────────────
def load_avatar(size, opacity=0.32):
    if not os.path.exists(AVATAR_PATH): return None
    try:
        img = Image.open(AVATAR_PATH).convert("RGBA")
        img = img.resize(size, Image.LANCZOS)
        r, g, b, a = img.split()
        a = a.point(lambda x: int(x * opacity))
        img.putalpha(a)
        return img
    except: return None

# ── LYRICS HELPER ─────────────────────────────────────────────────────────────
def get_current_lyric(lyrics, t, fade_duration=0.4):
    """Return (text, alpha 0-255) for time t."""
    current_text  = ""
    current_alpha = 0
    for idx, entry in enumerate(lyrics):
        if t >= entry["time"]:
            current_text = entry["text"]
            next_time = lyrics[idx+1]["time"] if idx+1 < len(lyrics) else 9999
            # Fade in
            if t - entry["time"] < fade_duration:
                current_alpha = int(255 * (t - entry["time"]) / fade_duration)
            # Fade out near next line
            elif next_time - t < fade_duration:
                current_alpha = int(255 * (next_time - t) / fade_duration)
            else:
                current_alpha = 255
    return current_text, current_alpha

# ── RENDER: YOUTUBE HORIZONTAL ────────────────────────────────────────────────
def render_yt_frame(bar_energies, title, frame_idx, n_frames, avatar,
                    fonts, t=None, lyrics=None):
    W, H = 1280, 720
    BAR_MAX_H = 220

    img = Image.new("RGB", (W, H), BG_COLOR)
    if avatar:
        ax = (W - avatar.width) // 2
        ay = (H - avatar.height) // 2 - 20
        img.paste(avatar, (ax, ay), avatar)

    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 2], fill=GOLD)
    draw.rectangle([0, H-2, W, H], fill=GOLD)

    # Waveform bars
    total_w = BAR_COUNT * (13 + 7) - 7
    bx = (W - total_w) // 2
    by = H - 155

    for i, e in enumerate(bar_energies):
        x = bx + i * (13 + 7)
        h = max(3, int(e * BAR_MAX_H))
        fade = 1 - abs(i - BAR_COUNT//2) / (BAR_COUNT//2) * 0.45
        c = (int(GOLD[0]*fade), int(GOLD[1]*fade), int(GOLD[2]*fade))
        draw.rectangle([x, by-h, x+13, by+h], fill=c)
    draw.rectangle([bx, by-1, bx+total_w, by+1], fill=GOLD)

    # Title
    title_str = title.upper()
    bb = draw.textbbox((0,0), title_str, font=fonts["title"])
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    draw.text((tx+2, 102), title_str, font=fonts["title"], fill=(0,0,0))
    draw.text((tx, 100), title_str, font=fonts["title"], fill=WHITE)
    draw.rectangle([tx, 100+th+8, tx+tw, 100+th+11], fill=GOLD)

    # Lyrics (if provided)
    if lyrics and t is not None:
        lyric_text, alpha = get_current_lyric(lyrics, t)
        if lyric_text and alpha > 0:
            lbb = draw.textbbox((0,0), lyric_text, font=fonts["lyric"])
            lw = lbb[2] - lbb[0]
            lx = (W - lw) // 2
            ly = by - BAR_MAX_H - 60
            # Shadow
            draw.text((lx+2, ly+2), lyric_text, font=fonts["lyric"],
                      fill=(0,0,0), stroke_width=0)
            draw.text((lx, ly), lyric_text, font=fonts["lyric"],
                      fill=(*GOLD, alpha) if alpha < 255 else GOLD)

    # Branding
    bb2 = draw.textbbox((0,0), "VAINMUZE", font=fonts["brand"])
    bw = bb2[2]-bb2[0]
    draw.text(((W-bw)//2, H-52), "VAINMUZE", font=fonts["brand"], fill=GOLD)

    # Progress
    draw.rectangle([0, H-5, int(W*frame_idx/n_frames), H-2], fill=GOLD)

    return img

# ── RENDER: TIKTOK VERTICAL ───────────────────────────────────────────────────
def render_tiktok_frame(bar_energies, title, frame_idx, n_frames, avatar,
                        fonts, t=None, lyrics=None):
    W, H = 1080, 1920
    BAR_MAX_H = 180

    img = Image.new("RGB", (W, H), BG_COLOR)
    if avatar:
        ax = (W - avatar.width) // 2
        ay = (H - avatar.height) // 2
        img.paste(avatar, (ax, ay), avatar)

    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 4], fill=GOLD)
    draw.rectangle([0, H-4, W, H], fill=GOLD)

    # Waveform — centered vertically lower third
    total_w = BAR_COUNT * (11 + 6) - 6
    bx = (W - total_w) // 2
    by = H - 420

    for i, e in enumerate(bar_energies):
        x = bx + i * (11 + 6)
        h = max(3, int(e * BAR_MAX_H))
        fade = 1 - abs(i - BAR_COUNT//2) / (BAR_COUNT//2) * 0.45
        c = (int(GOLD[0]*fade), int(GOLD[1]*fade), int(GOLD[2]*fade))
        draw.rectangle([x, by-h, x+11, by+h], fill=c)
    draw.rectangle([bx, by-1, bx+total_w, by+1], fill=GOLD)

    # Title — upper area (TikTok hook zone)
    title_str = title.upper()
    bb = draw.textbbox((0,0), title_str, font=fonts["tiktok_title"])
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    ty = 220
    draw.text((tx+3, ty+3), title_str, font=fonts["tiktok_title"], fill=(0,0,0))
    draw.text((tx, ty), title_str, font=fonts["tiktok_title"], fill=WHITE)
    draw.rectangle([tx, ty+th+10, tx+tw, ty+th+14], fill=GOLD)

    # Subtitle hook
    hook = "VAINMUZE"
    hbb = draw.textbbox((0,0), hook, font=fonts["tiktok_hook"])
    hw = hbb[2]-hbb[0]
    draw.text(((W-hw)//2, ty+th+30), hook, font=fonts["tiktok_hook"], fill=GOLD)

    # Lyrics — large, centered, above waveform
    if lyrics and t is not None:
        lyric_text, alpha = get_current_lyric(lyrics, t)
        if lyric_text and alpha > 0:
            lbb = draw.textbbox((0,0), lyric_text, font=fonts["tiktok_lyric"])
            lw = lbb[2]-lbb[0]
            lx = (W - lw) // 2
            ly = by - BAR_MAX_H - 120
            draw.text((lx+2, ly+2), lyric_text, font=fonts["tiktok_lyric"], fill=(0,0,0))
            color = GOLD if alpha >= 255 else tuple(int(c * alpha/255) for c in GOLD)
            draw.text((lx, ly), lyric_text, font=fonts["tiktok_lyric"], fill=color)

    # Progress bar
    draw.rectangle([0, H-8, int(W*frame_idx/n_frames), H-4], fill=GOLD)

    return img

# ── PIPE TO FFMPEG ────────────────────────────────────────────────────────────
def pipe_to_ffmpeg(render_fn, n_frames, W, H, audio_path, output_path, label):
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "pipe:0",
        "-i", audio_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-pix_fmt", "yuv420p",
        output_path
    ]
    print(f"  Rendering {label} → {os.path.basename(output_path)}")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for i in range(n_frames):
        if i % 100 == 0:
            print(f"    {int(100*i/n_frames)}%", end="\r", flush=True)
        frame = render_fn(i)
        proc.stdin.write(np.array(frame).tobytes())
    proc.stdin.close()
    proc.wait()
    if proc.returncode == 0:
        mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"    ✅ Done — {mb:.1f} MB")
    else:
        print(f"    ❌ ffmpeg error")

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio",  required=True)
    parser.add_argument("--title",  required=True)
    parser.add_argument("--lyrics", default=None, help="Path to lyrics JSON")
    args = parser.parse_args()

    print("\n── VainMuze Video Generator ─────────────────────────────")

    y, sr, duration = load_audio(args.audio)
    n_frames = int(duration * FPS)

    print("  Analyzing audio...")
    energies = compute_energies(y, sr, n_frames)

    lyrics_data = None
    if args.lyrics and os.path.exists(args.lyrics):
        with open(args.lyrics) as f:
            lyrics_data = json.load(f)["lyrics"]
        print(f"  Loaded {len(lyrics_data)} lyric lines")

    print("  Loading assets...")
    avatar_yt     = load_avatar((500, 500), opacity=0.32)
    avatar_tiktok = load_avatar((700, 700), opacity=0.30)

    # Font sets
    fonts_yt = {
        "title":  get_font(84),
        "lyric":  get_font(38, bold=False),
        "brand":  get_font(28, bold=False),
    }
    fonts_tiktok = {
        "tiktok_title": get_font(120),
        "tiktok_hook":  get_font(42, bold=False),
        "tiktok_lyric": get_font(58, bold=False),
    }

    slug = args.title.replace(" ", "_")

    os.makedirs(YOUTUBE_DIR, exist_ok=True)
    os.makedirs(TIKTOK_DIR, exist_ok=True)

    # ── 1. YouTube Visualizer (horizontal) ───────────────────────────────
    out1 = os.path.join(YOUTUBE_DIR, f"{slug}_visualizer.mp4")
    pipe_to_ffmpeg(
        lambda i: render_yt_frame(energies[i], args.title, i, n_frames, avatar_yt, fonts_yt),
        n_frames, 1280, 720, args.audio, out1, "YouTube Visualizer"
    )

    # ── 2. YouTube Lyric Video (horizontal) ──────────────────────────────
    if lyrics_data:
        out2 = os.path.join(YOUTUBE_DIR, f"{slug}_lyrics.mp4")
        pipe_to_ffmpeg(
            lambda i: render_yt_frame(energies[i], args.title, i, n_frames, avatar_yt,
                                      fonts_yt, t=i/FPS, lyrics=lyrics_data),
            n_frames, 1280, 720, args.audio, out2, "YouTube Lyrics"
        )

    # ── 3. TikTok + YouTube Shorts (vertical 9:16) ───────────────────────
    if lyrics_data:
        out3 = os.path.join(TIKTOK_DIR, f"{slug}_tiktok_shorts.mp4")
        pipe_to_ffmpeg(
            lambda i: render_tiktok_frame(energies[i], args.title, i, n_frames, avatar_tiktok,
                                          fonts_tiktok, t=i/FPS, lyrics=lyrics_data),
            n_frames, 1080, 1920, args.audio, out3, "TikTok + YouTube Shorts"
        )

    print("\n── All versions complete ─────────────────────────────────")
    print(f"  YouTube_vids:  {YOUTUBE_DIR}/")
    print(f"  TikTok_vids:   {TIKTOK_DIR}/")

if __name__ == "__main__":
    main()
