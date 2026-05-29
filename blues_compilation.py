"""
VainMuze — Blues Compilation Generator
"Blues From Portland — VainMuze Vol. 1"

Generates one long video from multiple blues songs with:
- Warm amber/sepia visual palette
- Slow Ken Burns motion on portrait
- Breathing horizontal waveform line
- Title cards between songs
- Seamless audio concatenation

Run from Terminal:
    python3 blues_compilation.py

Edit SONGS list below to set order and titles.
"""

import os, sys, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import librosa

# ── SONG LIST — edit order and titles here ───────────────────────────────────
SONGS_FOLDER = os.path.expanduser("~/Desktop/🎵 THE STUDIO/✅ Finished/Finished songs")
DESKTOP      = os.path.expanduser("~/Desktop")

SONGS = [
    # (filename_pattern, display_title)
    # Script finds the file by matching pattern (case-insensitive, partial match)
    ("My Shadow",      "My Shadow and I"),
    ("Queen",          "Queen of the South"),
    ("Maybe",          "Maybe in the Next Hour"),
    ("Open feeling",   "Open Feeling"),
]

OUTPUT_PATH = os.path.expanduser("~/Desktop/Youtube_vids/Blues_From_Portland_Vol1.mp4")
AVATAR_PATH = os.path.expanduser("~/Desktop/✍️ THE WRITER'S ROOM/vainmuze/public/VainMuze_avatar.png")

# ── CONFIG ────────────────────────────────────────────────────────────────────
FPS    = 24
W, H   = 1280, 720      # YouTube horizontal

# Blues color palette — warm amber/sepia
BG_COLOR    = (12, 8, 5)          # near-black with warm tint
AMBER       = (212, 140, 50)      # primary amber
AMBER_DIM   = (140, 85, 25)       # dimmed amber
CREAM       = (240, 220, 180)     # warm white for text
SEPIA_DARK  = (60, 35, 15)        # deep sepia shadow

TITLE_CARD_DURATION = 4           # seconds for title card between songs
FADE_DURATION       = 1.5         # seconds for crossfade

# ── FONTS ─────────────────────────────────────────────────────────────────────
def get_font(size, bold=True):
    paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ] if bold else [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: continue
    return ImageFont.load_default()

# ── FIND SONG FILE ────────────────────────────────────────────────────────────
def find_song(pattern):
    """Find audio file matching pattern in SONGS_FOLDER or Desktop."""
    extensions = ('.wav', '.mp3', '.aiff', '.m4a')
    search_dirs = [SONGS_FOLDER, DESKTOP]
    for folder in search_dirs:
        if not os.path.exists(folder): continue
        for f in os.listdir(folder):
            if pattern.lower() in f.lower() and f.lower().endswith(extensions):
                return os.path.join(folder, f)
    return None

# ── AUDIO ─────────────────────────────────────────────────────────────────────
def load_audio(path):
    y, sr = librosa.load(path, sr=44100, mono=False)
    if y.ndim > 1: y = y.mean(axis=0)
    return y, sr

def compute_waveform_rms(y, n_frames, window=4):
    """Per-frame RMS for waveform line breathing."""
    rms = []
    for i in range(n_frames):
        start = int(i * len(y) / n_frames)
        end   = min(int(start + len(y) / n_frames * window), len(y))
        chunk = y[start:end]
        val   = float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0
        rms.append(val)
    mx = max(rms) or 1.0
    return [v / mx for v in rms]

# ── AVATAR (sepia-toned, Ken Burns) ──────────────────────────────────────────
def load_avatar_base():
    if not os.path.exists(AVATAR_PATH): return None
    try:
        img = Image.open(AVATAR_PATH).convert("RGB")
        # Apply sepia tone
        r, g, b = img.split()
        r = r.point(lambda x: min(255, int(x * 1.1)))
        g = g.point(lambda x: int(x * 0.85))
        b = b.point(lambda x: int(x * 0.65))
        img = Image.merge("RGB", (r, g, b))
        # Slight warmth boost
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(0.7)
        # Make large for Ken Burns crop
        scale = 1.5
        big_w = int(W * scale)
        big_h = int(H * scale)
        img = img.resize((big_w, big_h), Image.LANCZOS)
        return img
    except Exception as e:
        print(f"  Warning: avatar issue: {e}")
        return None

def get_ken_burns_frame(base_img, frame_idx, n_frames, direction=1):
    """Crop into avatar with very slow drift. Direction: 1=zoom in, -1=zoom out."""
    if base_img is None: return None
    bw, bh = base_img.size
    t = frame_idx / max(n_frames - 1, 1)

    # Very slow zoom: 0% to 8% over the whole song
    zoom_pct = t * 0.08 * direction if direction > 0 else (1 - t) * 0.08
    crop_w = int(W * (1 + (0.08 - zoom_pct)))
    crop_h = int(H * (1 + (0.08 - zoom_pct)))
    crop_w = min(crop_w, bw)
    crop_h = min(crop_h, bh)

    # Slow pan — drift slightly right or left
    pan = t * 40 * direction
    cx = bw // 2 + int(pan)
    cy = bh // 2

    left = max(0, cx - crop_w // 2)
    top  = max(0, cy - crop_h // 2)
    left = min(left, bw - crop_w)
    top  = min(top, bh - crop_h)

    cropped = base_img.crop((left, top, left + crop_w, top + crop_h))
    cropped = cropped.resize((W, H), Image.LANCZOS)

    # Add transparency
    rgba = cropped.convert("RGBA")
    r2, g2, b2, a2 = rgba.split()
    a2 = a2.point(lambda x: int(x * 0.50))
    rgba.putalpha(a2)
    return rgba

# ── FILM GRAIN ────────────────────────────────────────────────────────────────
def add_grain(img, intensity=18):
    arr = np.array(img).astype(np.int16)
    noise = np.random.randint(-intensity, intensity, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

# ── HORIZONTAL WAVEFORM LINE ──────────────────────────────────────────────────
def draw_waveform_line(draw, rms, frame_idx, n_points=200):
    """Draws a breathing horizontal waveform line in the lower third."""
    y_center = H - 120
    x_start  = 100
    x_end    = W - 100
    max_amp  = 55

    # Sample audio chunk for this frame — mini waveform shape
    np.random.seed(frame_idx % 500)
    shape = np.sin(np.linspace(0, 4 * np.pi, n_points) + frame_idx * 0.12)
    shape += 0.3 * np.sin(np.linspace(0, 12 * np.pi, n_points) + frame_idx * 0.08)
    shape = shape / shape.max() if shape.max() > 0 else shape

    amplitude = rms * max_amp

    points_top = []
    points_bot = []
    for i in range(n_points):
        x = int(x_start + i * (x_end - x_start) / n_points)
        dy = int(shape[i] * amplitude)
        points_top.append((x, y_center - abs(dy)))
        points_bot.append((x, y_center + abs(dy)))

    # Draw filled waveform shape (use solid color — img is RGB, no alpha support)
    all_points = points_top + list(reversed(points_bot))
    if len(all_points) > 2:
        draw.polygon(all_points, fill=AMBER_DIM)

    # Draw bright center line
    for i in range(len(points_top) - 1):
        x1, y1 = points_top[i]
        x2, y2 = points_top[i+1]
        draw.line([(x1, y1), (x2, y2)], fill=AMBER, width=2)
        x1b, y1b = points_bot[i]
        x2b, y2b = points_bot[i+1]
        draw.line([(x1b, y1b), (x2b, y2b)], fill=AMBER, width=2)

    # Center horizontal line
    draw.line([(x_start, y_center), (x_end, y_center)], fill=AMBER_DIM, width=1)

# ── RENDER SONG FRAME ─────────────────────────────────────────────────────────
def render_song_frame(rms_val, rms_list, frame_idx, n_frames,
                      avatar_base, song_title, track_num, total_tracks,
                      direction=1, fade_alpha=255):
    img = Image.new("RGB", (W, H), BG_COLOR)

    # Ken Burns avatar
    av = get_ken_burns_frame(avatar_base, frame_idx, n_frames, direction)
    if av:
        bg = img.convert("RGBA")
        bg.paste(av, (0, 0), av)
        img = bg.convert("RGB")

    # Film grain
    img = add_grain(img, intensity=12)

    # Vignette
    vig = Image.new("RGBA", (W, H), (0,0,0,0))
    vd  = ImageDraw.Draw(vig)
    for s in range(120):
        alpha = int(200 * (s/120)**1.8)
        vd.rectangle([s, s, W-s, H-s], outline=(0,0,0,alpha))
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    draw = ImageDraw.Draw(img)

    # Amber accent lines (thinner, more vintage)
    draw.rectangle([0, 0, W, 2], fill=AMBER)
    draw.rectangle([0, H-2, W, H], fill=AMBER)
    # Side lines
    draw.rectangle([0, 0, 2, H], fill=AMBER_DIM)
    draw.rectangle([W-2, 0, W, H], fill=AMBER_DIM)

    # Waveform line
    draw_waveform_line(draw, rms_val, frame_idx)

    # Song title
    font_t = get_font(72)
    t_str = song_title.upper()
    # Auto-size
    for sz in range(72, 30, -3):
        f = get_font(sz)
        bb = draw.textbbox((0,0), t_str, font=f)
        if (bb[2]-bb[0]) <= W - 120:
            font_t = f
            break
    bb = draw.textbbox((0,0), t_str, font=font_t)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    ty = 80
    draw.text((tx+2, ty+2), t_str, font=font_t, fill=SEPIA_DARK)
    draw.text((tx, ty), t_str, font=font_t, fill=CREAM)
    draw.rectangle([tx, ty+th+8, tx+tw, ty+th+11], fill=AMBER)

    # Track number + brand
    font_sub = get_font(26, bold=False)
    sub = f"VAINMUZE  ·  TRACK {track_num} OF {total_tracks}"
    bb2 = draw.textbbox((0,0), sub, font=font_sub)
    sw  = bb2[2]-bb2[0]
    draw.text(((W-sw)//2, ty+th+22), sub, font=font_sub, fill=AMBER)

    # Progress bar for whole compilation
    prog_w = int(W * frame_idx / n_frames)
    draw.rectangle([0, H-5, prog_w, H-2], fill=AMBER)

    # Fade overlay
    if fade_alpha < 255:
        fade = Image.new("RGB", (W, H), BG_COLOR)
        img  = Image.blend(img, fade, 1 - fade_alpha/255)

    return img

# ── TITLE CARD ────────────────────────────────────────────────────────────────
def render_title_card(song_title, track_num, total_tracks, alpha=255):
    img  = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, W, 2], fill=AMBER)
    draw.rectangle([0, H-2, W, H], fill=AMBER)

    font_track = get_font(32, bold=False)
    font_title = get_font(90)
    font_brand = get_font(28, bold=False)

    # Track label
    t_label = f"TRACK {track_num}"
    bb0 = draw.textbbox((0,0), t_label, font=font_track)
    lw  = bb0[2]-bb0[0]
    draw.text(((W-lw)//2, H//2 - 110), t_label, font=font_track, fill=AMBER)

    # Song title — auto size
    t_str = song_title.upper()
    for sz in range(90, 30, -4):
        f = get_font(sz)
        bb = draw.textbbox((0,0), t_str, font=f)
        if (bb[2]-bb[0]) <= W - 120:
            font_title = f
            break
    bb = draw.textbbox((0,0), t_str, font=font_title)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    tx = (W - tw) // 2
    ty = H//2 - 50
    draw.text((tx+2, ty+2), t_str, font=font_title, fill=SEPIA_DARK)
    draw.text((tx, ty), t_str, font=font_title, fill=CREAM)
    draw.rectangle([tx, ty+th+10, tx+tw, ty+th+13], fill=AMBER)

    # Brand
    bb2 = draw.textbbox((0,0), "VAINMUZE", font=font_brand)
    bw2 = bb2[2]-bb2[0]
    draw.text(((W-bw2)//2, ty+th+30), "VAINMUZE", font=font_brand, fill=AMBER_DIM)

    if alpha < 255:
        fade = Image.new("RGB", (W, H), BG_COLOR)
        img  = Image.blend(img, fade, 1 - alpha/255)

    return img

# ── PIPE TO FFMPEG ────────────────────────────────────────────────────────────
def pipe_frames_to_ffmpeg(frame_gen, n_frames, audio_path, output_path):
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "pipe:0",
        "-i", audio_path,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", output_path
    ]
    log_path = os.path.expanduser("~/Desktop/blues_ffmpeg.log")
    log_file = open(log_path, "w")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log_file)
    for i, frame in enumerate(frame_gen):
        if i % 120 == 0:
            print(f"    {int(100*i/n_frames)}%", end="\r", flush=True)
        # Force RGB — prevent broken pipe from wrong color mode
        if hasattr(frame, 'convert'):
            frame = frame.convert("RGB")
        raw = np.array(frame)
        if raw.shape != (H, W, 3):
            print(f"\n  ⚠️  Bad frame shape at {i}: {raw.shape} — skipping")
            raw = np.zeros((H, W, 3), dtype=np.uint8)
        try:
            proc.stdin.write(raw.tobytes())
        except BrokenPipeError:
            print(f"\n  ❌ Pipe broke at frame {i} — check ~/Desktop/blues_ffmpeg.log")
            break
    proc.stdin.close()
    proc.wait()
    log_file.close()
    return proc.returncode

# ── CONCATENATE AUDIO ─────────────────────────────────────────────────────────
def concat_audio(audio_segments, output_path):
    """Merge all audio segments into one file using ffmpeg concat filter.
    Re-encodes everything to a consistent stereo 44100 PCM WAV — handles
    mono/stereo mismatches and different sample rates safely."""
    inputs = []
    for seg in audio_segments:
        inputs += ["-i", seg]

    n = len(audio_segments)
    # Build filter: normalize each to stereo 44100, then concat
    filter_parts = []
    for i in range(n):
        filter_parts.append(
            f"[{i}:a]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[a{i}]"
        )
    filter_parts.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[out]")
    filter_str = ";".join(filter_parts)

    log_path = os.path.expanduser("~/Desktop/blues_concat.log")
    with open(log_path, "w") as log:
        result = subprocess.run(
            ["ffmpeg", "-y"] + inputs + [
                "-filter_complex", filter_str,
                "-map", "[out]",
                "-c:a", "pcm_s16le",
                output_path
            ],
            stderr=log
        )
    if result.returncode != 0:
        print(f"  ⚠️  Audio concat error — check ~/Desktop/blues_concat.log")
    else:
        dur = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", output_path],
            capture_output=True, text=True
        ).stdout.strip()
        print(f"  Merged audio duration: {dur}s")

# ── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("\n── Blues From Portland — VainMuze Vol. 1 ────────────────")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Find all audio files
    found = []
    for pattern, title in SONGS:
        path = find_song(pattern)
        if path:
            print(f"  ✅ Found: {title} → {os.path.basename(path)}")
            found.append((path, title))
        else:
            print(f"  ❌ Not found: {title} (pattern: '{pattern}')")

    if not found:
        print("  No songs found. Check SONGS list and SONGS_FOLDER path.")
        return

    total = len(found)
    print(f"\n  Building compilation: {total} songs")

    # Load all audio
    print("  Loading audio...")
    audio_data = []
    for path, title in found:
        y, sr = load_audio(path)
        audio_data.append((y, sr, len(y)/sr, path, title))

    # Concatenate audio with silent gaps for title cards
    tmp_dir = tempfile.mkdtemp()
    audio_segments = []

    for idx, (y, sr, dur, path, title) in enumerate(audio_data):
        # Title card silence (except before first song)
        if idx > 0:
            sil_path = os.path.join(tmp_dir, f"silence_{idx}.wav")
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "anullsrc=r=44100:cl=stereo",
                "-t", str(TITLE_CARD_DURATION),
                "-c:a", "pcm_s16le",
                sil_path
            ], stderr=subprocess.DEVNULL)
            audio_segments.append(sil_path)
        audio_segments.append(path)

    merged_audio = os.path.join(tmp_dir, "merged.wav")
    print("  Merging audio...")
    concat_audio(audio_segments, merged_audio)

    # Calculate total frames
    merged_y, merged_sr = load_audio(merged_audio)
    total_frames = int(len(merged_y) / merged_sr * FPS)
    print(f"  Total duration: {len(merged_y)/merged_sr:.0f}s | {total_frames} frames")

    # Build frame timeline
    timeline = []  # (start_frame, end_frame, type, data)
    cursor = 0
    for idx, (y, sr, dur, path, title) in enumerate(audio_data):
        if idx > 0:
            tc_frames = int(TITLE_CARD_DURATION * FPS)
            timeline.append(("titlecard", cursor, cursor + tc_frames, title, idx+1, total))
            cursor += tc_frames
        song_frames = int(dur * FPS)
        timeline.append(("song", cursor, cursor + song_frames, y, sr, title, idx+1, total))
        cursor += song_frames

    # Load avatar
    print("  Loading avatar (sepia)...")
    avatar_base = load_avatar_base()

    # Generate all frames
    def all_frames():
        for entry in timeline:
            if entry[0] == "titlecard":
                _, start, end, title, track_num, total_tracks = entry
                n = end - start
                fade_in  = int(FPS * 0.8)
                fade_out = int(FPS * 0.8)
                for i in range(n):
                    if i < fade_in:
                        alpha = int(255 * i / fade_in)
                    elif i > n - fade_out:
                        alpha = int(255 * (n - i) / fade_out)
                    else:
                        alpha = 255
                    yield render_title_card(title, track_num, total_tracks, alpha)

            elif entry[0] == "song":
                _, start, end, y, sr, title, track_num, total_tracks = entry
                n = end - start
                rms_list = compute_waveform_rms(y, n)
                direction = 1 if track_num % 2 == 1 else -1  # alternate zoom direction
                fade_in  = int(FPS * FADE_DURATION)
                fade_out = int(FPS * FADE_DURATION)
                for i in range(n):
                    if i < fade_in:
                        alpha = int(255 * i / fade_in)
                    elif i > n - fade_out:
                        alpha = int(255 * (n - i) / fade_out)
                    else:
                        alpha = 255
                    yield render_song_frame(
                        rms_list[i], rms_list, i, n,
                        avatar_base, title, track_num, total_tracks,
                        direction=direction, fade_alpha=alpha
                    )

    print(f"  Rendering {total_frames} frames → {OUTPUT_PATH}")
    ret = pipe_frames_to_ffmpeg(all_frames(), total_frames, merged_audio, OUTPUT_PATH)

    if ret == 0:
        mb = os.path.getsize(OUTPUT_PATH) / 1024 / 1024
        print(f"\n✅ Blues compilation done: {OUTPUT_PATH} ({mb:.0f} MB)")
        print(f"   Upload to YouTube as: 'Blues From Portland — VainMuze Vol. 1'")
    else:
        print(f"\n❌ ffmpeg error — check output path")

    # Cleanup
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
