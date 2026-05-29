"""
VainMuze — Dynamic Visual Generator
Slow Ken Burns zoom on avatar + gold particles pulsing to music.
Outputs: YouTube horizontal + TikTok/Shorts vertical (QuickTime compatible)
"""

import os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import librosa

# ── CONFIG ───────────────────────────────────────────────────────────────────
FPS        = 24
BG_COLOR   = (8, 8, 10)
GOLD       = (201, 168, 76)
WHITE      = (255, 255, 255)

AVATAR_PATH = "/Users/ali/Desktop/✍️ THE WRITER'S ROOM/vainmuze/public/VainMuze_avatar.png"
YOUTUBE_DIR = "/Users/ali/Desktop/YouTube_vids"   # outputs so present_files works
TIKTOK_DIR  = "/Users/ali/Desktop/YouTube_vids"

N_PARTICLES = 80

# ── FONTS ────────────────────────────────────────────────────────────────────
def get_font(size, bold=True):
    paths = [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ] if bold else [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in paths:
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

# ── AUDIO ────────────────────────────────────────────────────────────────────
def load_audio(path):
    print(f"  Loading: {path}")
    y, sr = librosa.load(path, sr=None, mono=False)
    if y.ndim > 1: y = y.mean(axis=0)
    duration = len(y) / sr
    print(f"  Duration: {duration:.1f}s")
    return y, sr, duration

def compute_rms(y, sr, n_frames):
    """Per-frame RMS energy — drives particle size and brightness."""
    rms_vals = []
    for i in range(n_frames):
        start = int(i * len(y) / n_frames)
        end   = min(start + int(sr / FPS * 3), len(y))
        chunk = y[start:end]
        rms = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
        rms_vals.append(rms)
    # Normalize
    mx = max(rms_vals) or 1.0
    return [v / mx for v in rms_vals]

# ── PARTICLES ─────────────────────────────────────────────────────────────────
class Particle:
    def __init__(self, W, H, seed):
        rng = np.random.RandomState(seed)
        self.x  = rng.uniform(0, W)
        self.y  = rng.uniform(0, H)
        self.vx = rng.uniform(-0.3, 0.3)
        self.vy = rng.uniform(-0.6, -0.1)   # drift upward
        self.base_r = rng.uniform(1.5, 4.0)
        self.phase  = rng.uniform(0, 2 * np.pi)
        self.W, self.H = W, H

    def update(self, frame_idx):
        self.x = (self.x + self.vx) % self.W
        self.y = (self.y + self.vy) % self.H

    def draw(self, draw, rms, frame_idx):
        pulse = 0.6 + 0.4 * np.sin(self.phase + frame_idx * 0.08)
        r = self.base_r * (1 + rms * 2.5) * pulse
        brightness = 0.5 + 0.5 * rms * pulse
        c = (int(GOLD[0]*brightness), int(GOLD[1]*brightness), int(GOLD[2]*brightness))
        x, y = int(self.x), int(self.y)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=c)

# ── AVATAR ZOOM (Ken Burns) ───────────────────────────────────────────────────
def load_avatar_frames(W, H, n_frames, zoom_start=1.0, zoom_end=1.18):
    """Pre-crop avatar at each zoom level — memory efficient one frame at a time."""
    if not os.path.exists(AVATAR_PATH):
        return None
    img = Image.open(AVATAR_PATH).convert("RGBA")
    # Make square and large enough
    sq = min(img.size)
    img = img.crop(((img.width-sq)//2, (img.height-sq)//2,
                    (img.width+sq)//2, (img.height+sq)//2))
    # Upscale to something large so we can crop into it
    base_size = int(max(W, H) * 1.5)
    img = img.resize((base_size, base_size), Image.LANCZOS)
    return img   # return base image; zoom applied per frame

def get_avatar_frame(base_img, W, H, frame_idx, n_frames,
                     zoom_start=1.0, zoom_end=1.18, opacity=0.55):
    if base_img is None:
        return None
    t = frame_idx / max(n_frames - 1, 1)
    zoom = zoom_start + (zoom_end - zoom_start) * t

    bw, bh = base_img.size
    crop_w = int(bw / zoom)
    crop_h = int(bh / zoom)
    cx, cy = bw // 2, bh // 2
    box = (cx - crop_w//2, cy - crop_h//2,
           cx + crop_w//2, cy + crop_h//2)
    cropped = base_img.crop(box).resize((W, H), Image.LANCZOS)

    r, g, b, a = cropped.split()
    a = a.point(lambda x: int(x * opacity))
    cropped.putalpha(a)
    return cropped

# ── RENDER FRAME ─────────────────────────────────────────────────────────────
def render_frame(W, H, avatar_base, particles, rms_vals,
                 title, frame_idx, n_frames, fonts):
    img = Image.new("RGB", (W, H), BG_COLOR)

    # Avatar with Ken Burns zoom
    av = get_avatar_frame(avatar_base, W, H, frame_idx, n_frames)
    if av:
        img.paste(av, (0, 0), av)

    # Soft vignette
    vig = Image.new("RGBA", (W, H), (0,0,0,0))
    vd  = ImageDraw.Draw(vig)
    steps = 120
    for s in range(steps):
        alpha = int(160 * (s/steps)**2)
        vd.rectangle([s, s, W-s, H-s], outline=(0,0,0,alpha))
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    draw = ImageDraw.Draw(img)

    # Particles
    rms = rms_vals[frame_idx]
    for p in particles:
        p.update(frame_idx)
        p.draw(draw, rms, frame_idx)

    # Gold lines
    draw.rectangle([0, 0, W, 3], fill=GOLD)
    draw.rectangle([0, H-3, W, H], fill=GOLD)

    # Title
    t_str = title.upper()
    bb = draw.textbbox((0,0), t_str, font=fonts["title"])
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    ty = int(H * 0.12)
    # Glow / shadow
    for off in [(3,3),(2,2),(1,1)]:
        draw.text((tx+off[0], ty+off[1]), t_str, font=fonts["title"], fill=(0,0,0))
    draw.text((tx, ty), t_str, font=fonts["title"], fill=WHITE)
    draw.rectangle([tx, ty+th+10, tx+tw, ty+th+14], fill=GOLD)

    # Branding
    bb2 = draw.textbbox((0,0), "VAINMUZE", font=fonts["brand"])
    bw = bb2[2]-bb2[0]
    draw.text(((W-bw)//2, H - int(H*0.07)), "VAINMUZE", font=fonts["brand"], fill=GOLD)

    # Progress bar
    draw.rectangle([0, H-6, int(W*frame_idx/n_frames), H-3], fill=GOLD)

    return img

# ── FFMPEG PIPE ───────────────────────────────────────────────────────────────
def pipe_video(render_fn, n_frames, W, H, audio_path, output_path, label):
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "pipe:0",
        "-i", audio_path,
        "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.1",
        "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", output_path
    ]
    print(f"  Rendering {label}...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for i in range(n_frames):
        if i % 100 == 0:
            print(f"    {int(100*i/n_frames)}%", end="\r", flush=True)
        frame = render_fn(i)
        proc.stdin.write(np.array(frame).tobytes())
    proc.stdin.close()
    proc.wait()
    if proc.returncode == 0:
        mb = os.path.getsize(output_path)/1024/1024
        print(f"    ✅ {os.path.basename(output_path)} — {mb:.1f} MB")
    else:
        print(f"    ❌ ffmpeg error on {label}")

# ── MAIN ─────────────────────────────────────────────────────────────────────
def main(audio_path, title):
    print("\n── VainMuze Dynamic Generator ──────────────────────────")

    y, sr, duration = load_audio(audio_path)
    n_frames = int(duration * FPS)

    print("  Computing energy...")
    rms_vals = compute_rms(y, sr, n_frames)

    slug = title.replace(" ", "_")

    # ── YouTube 1280x720 ──────────────────────────────────────────────────
    W, H = 1280, 720
    print("  Preparing YouTube assets...")
    avatar_yt   = load_avatar_frames(W, H, n_frames)
    particles_yt = [Particle(W, H, seed=i) for i in range(N_PARTICLES)]
    fonts_yt = {"title": get_font(88), "brand": get_font(28, bold=False)}

    out_yt = os.path.join(YOUTUBE_DIR, f"{slug}_dynamic_yt.mp4")
    pipe_video(
        lambda i: render_frame(W, H, avatar_yt, particles_yt, rms_vals,
                               title, i, n_frames, fonts_yt),
        n_frames, W, H, audio_path, out_yt, "YouTube 1280x720"
    )

    # ── TikTok/Shorts 1080x1920 ───────────────────────────────────────────
    W2, H2 = 1080, 1920
    print("  Preparing TikTok assets...")
    avatar_tk    = load_avatar_frames(W2, H2, n_frames)
    particles_tk = [Particle(W2, H2, seed=i+1000) for i in range(N_PARTICLES)]
    fonts_tk = {"title": get_font(110), "brand": get_font(42, bold=False)}

    out_tk = os.path.join(TIKTOK_DIR, f"{slug}_dynamic_tiktok.mp4")
    pipe_video(
        lambda i: render_frame(W2, H2, avatar_tk, particles_tk, rms_vals,
                               title, i, n_frames, fonts_tk),
        n_frames, W2, H2, audio_path, out_tk, "TikTok 1080x1920"
    )

    print(f"\n── Done ─────────────────────────────────────────────────")
    return out_yt, out_tk

if __name__ == "__main__":
    audio = "/Users/ali/Desktop/✍️ THE WRITER'S ROOM/vainmuze/public/Crying.wav"
    title = "Crying"
    main(audio, title)
