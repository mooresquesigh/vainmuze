"""
AstrologyWonders — TikTok Short Generator
Generates animated astrology short videos for TikTok / YouTube Shorts

Usage:
    python3 astro_short.py

To change sign or topic, edit SIGN and TOPIC at the top of this file.
Set TOPIC to a string to override sign reading with an educational topic.

Output: ~/Desktop/Tiktok_vids/
"""

import os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import librosa
import requests
from datetime import datetime

# ── CONFIG — edit these ───────────────────────────────────────────────────────
SIGN   = "Aries"
TOPIC  = None   # e.g. "How Jupiter career timing differs from Mars ambition"

OUTPUT_DIR     = os.path.expanduser("~/Desktop/Tiktok_vids")
OPENAI_KEY     = os.environ.get("OPENAI_API_KEY", "your-openai-key-here")
ELEVENLABS_KEY = os.environ.get("ELEVENLABS_API_KEY", "your-elevenlabs-key-here")
VOICE_ID       = "8Ln42OXYupYsag45MAUy"  # Jay Wayne

# ── VIDEO CONFIG ──────────────────────────────────────────────────────────────
FPS  = 30
W, H = 1080, 1920

BG_COLOR  = (6, 4, 14)
GOLD      = (212, 175, 55)
AMBER     = (212, 140, 50)
WHITE     = (255, 255, 255)
PURPLE    = (100, 60, 180)
GLOW_COL  = (180, 120, 255)
STAR_COL  = (220, 210, 255)

ZODIAC_SYMBOLS = {
    "Aries":"ARIES", "Taurus":"TAURUS", "Gemini":"GEMINI",
    "Cancer":"CANCER", "Leo":"LEO", "Virgo":"VIRGO",
    "Libra":"LIBRA", "Scorpio":"SCORPIO", "Sagittarius":"SAGITTARIUS",
    "Capricorn":"CAPRICORN", "Aquarius":"AQUARIUS", "Pisces":"PISCES"
}

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

# ── OPENAI: GENERATE PHRASES ──────────────────────────────────────────────────
def generate_phrases(sign, topic=None):
    if topic:
        prompt = f"""Write a 35-second TikTok astrology education video script about: "{topic}"

Return ONLY short punchy phrases, one per line. Each phrase: 2-7 words max.
Total: 10-13 phrases.

Rules:
- First line must be a shocking hook that stops the scroll
- Build: hook → insight → revelation → practical takeaway
- Educational, mystical, confident tone
- Last line: "AstrologyWonders.com — your chart awaits"
- No hashtags, no emojis, no punctuation except periods, no numbering"""
    else:
        prompt = f"""Write a 35-second TikTok astrology reading for {sign}.

Return ONLY short punchy phrases, one per line. Each phrase: 2-7 words max.
Total: 10-13 phrases.

Rules:
- First line must be a shocking hook that stops the scroll
- Mix diverse themes: love, power, money, shadow work, intuition, transformation
- Speak directly to the {sign} — personal, cosmic, bold
- Build: hook → emotional truth → practical guidance → empowerment
- Last line: "AstrologyWonders.com — your chart awaits"
- No hashtags, no emojis, no punctuation except periods, no numbering"""

    headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
    data = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.92
    }
    resp = requests.post("https://api.openai.com/v1/chat/completions",
                         headers=headers, json=data, timeout=30)
    resp.raise_for_status()
    text = resp.json()["choices"][0]["message"]["content"].strip()
    phrases = [ln.strip().lstrip("•–—-0123456789. ") for ln in text.split("\n") if ln.strip()]
    return phrases

# ── ELEVENLABS: GENERATE AUDIO ────────────────────────────────────────────────
def generate_audio(phrases, output_path):
    # Comma pause between phrases — sounds natural, not robotic
    full_text = ", ".join(phrases)
    url     = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json"}
    data    = {
        "text": full_text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.85,
            "style": 0.10,
            "use_speaker_boost": True
        }
    }
    resp = requests.post(url, headers=headers, json=data, timeout=60)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(resp.content)

# ── AUDIO ANALYSIS ────────────────────────────────────────────────────────────
def load_audio(path):
    y, sr = librosa.load(path, sr=None, mono=False)
    if y.ndim > 1: y = y.mean(axis=0)
    return y, sr, len(y) / sr

def compute_rms(y, sr, n_frames):
    out = []
    for i in range(n_frames):
        start = int(i * len(y) / n_frames)
        end   = min(start + int(sr / FPS * 2), len(y))
        chunk = y[start:end]
        out.append(float(np.sqrt(np.mean(chunk**2))) if len(chunk) > 0 else 0.0)
    mx = max(out) or 1.0
    return [v / mx for v in out]

# ── STARS ─────────────────────────────────────────────────────────────────────
_STARS = None
def get_stars():
    global _STARS
    if _STARS is None:
        rng = np.random.RandomState(77)
        _STARS = []
        for _ in range(130):
            _STARS.append({
                "x": rng.uniform(0, W),
                "y": rng.uniform(0, H),
                "r": rng.uniform(0.6, 2.4),
                "b": rng.uniform(0.25, 1.0),
                "vx": rng.uniform(-0.06, 0.06),
                "vy": rng.uniform(-0.12, -0.03),
            })
    return _STARS

def draw_stars(draw, frame_idx, rms):
    stars = get_stars()
    for s in stars:
        x = (s["x"] + s["vx"] * frame_idx) % W
        y = (s["y"] + s["vy"] * frame_idx) % H
        r = s["r"] * (1 + rms * 0.4)
        b = int(s["b"] * (180 + rms * 75))
        c = (min(255,b), min(255,b), min(255, int(b*1.15)))
        draw.ellipse([x-r, y-r, x+r, y+r], fill=c)

# ── RENDER FRAME ──────────────────────────────────────────────────────────────
def render_frame(phrase, phrase_progress, rms, frame_idx, total_frames, sign, topic):
    """
    phrase_progress 0 → 1:
      0.00 – 0.20  pop in  (fade + scale up)
      0.20 – 0.78  hold    (subtle audio pulse)
      0.78 – 1.00  fade out
    """
    img  = Image.new("RGB", (W, H), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # ── Stars ──
    draw_stars(draw, frame_idx, rms)

    # ── Large faint sign watermark behind text ──
    wm_label = ZODIAC_SYMBOLS.get(sign, sign.upper()) if not topic else "ASTROLOGY"
    wm_font  = get_font(320)
    bb_wm    = draw.textbbox((0, 0), wm_label, font=wm_font)
    wm_w     = bb_wm[2] - bb_wm[0]
    wm_h     = bb_wm[3] - bb_wm[1]
    wm_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd       = ImageDraw.Draw(wm_layer)
    wm_alpha = int(18 + rms * 22)
    wd.text(((W - wm_w) // 2, (H - wm_h) // 2),
            wm_label, font=wm_font,
            fill=(GOLD[0], GOLD[1], GOLD[2], wm_alpha))
    img = Image.alpha_composite(img.convert("RGBA"), wm_layer).convert("RGB")
    draw = ImageDraw.Draw(img)

    # ── Central radial glow (much brighter) ──
    glow_r = int(500 + rms * 380)
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    for r in range(glow_r, 0, -18):
        t     = 1 - r / glow_r
        alpha = int(90 * t**1.5 * (0.5 + rms * 0.5))
        gd.ellipse([W//2-r, H//2-r, W//2+r, H//2+r],
                   outline=(PURPLE[0], PURPLE[1], PURPLE[2], alpha))
    img = Image.alpha_composite(img.convert("RGBA"), glow_layer).convert("RGB")
    draw = ImageDraw.Draw(img)

    # ── Animation state ──
    if phrase_progress < 0.20:
        t     = phrase_progress / 0.20
        alpha = t
        scale = 0.50 + 0.50 * t
    elif phrase_progress < 0.78:
        alpha = 1.0
        scale = 1.0 + rms * 0.07
    else:
        t     = (phrase_progress - 0.78) / 0.22
        alpha = max(0.0, 1.0 - t)
        scale = 1.0

    # ── Find fitting font size ──
    text  = phrase.upper()
    max_w = W - 100
    font  = get_font(96)
    for sz in range(96, 28, -4):
        f  = get_font(sz)
        bb = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), text, font=f)
        if (bb[2] - bb[0]) <= max_w:
            font = f
            break

    bb     = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]

    # ── Text on transparent layer (scale transform) ──
    pad     = 55
    txt_img = Image.new("RGBA", (tw + pad*2, th + pad*2), (0, 0, 0, 0))
    td      = ImageDraw.Draw(txt_img)

    glow_a = int(200 * alpha * (0.45 + rms * 0.55))
    for off in [10, 7, 4, 2]:
        ga = max(0, glow_a // max(1, off - 1))
        td.text((pad+off, pad+off), text, font=font,
                fill=(GLOW_COL[0], GLOW_COL[1], GLOW_COL[2], ga))
        td.text((pad-off, pad-off), text, font=font,
                fill=(GLOW_COL[0], GLOW_COL[1], GLOW_COL[2], ga))

    main_a = int(255 * alpha)
    td.text((pad, pad), text, font=font,
            fill=(WHITE[0], WHITE[1], WHITE[2], main_a))

    new_w      = max(1, int(txt_img.width  * scale))
    new_h      = max(1, int(txt_img.height * scale))
    txt_scaled = txt_img.resize((new_w, new_h), Image.LANCZOS)
    px         = (W - new_w) // 2
    py         = (H - new_h) // 2
    img.paste(txt_scaled, (px, py), txt_scaled)

    draw = ImageDraw.Draw(img)

    # ── Gold underline pulsing ──
    line_w = int((tw * 0.65 + rms * 90) * alpha)
    line_x = (W - line_w) // 2
    line_y = py + new_h - pad + 10
    if line_w > 0:
        draw.rectangle([line_x, line_y, line_x + line_w, line_y + 5], fill=GOLD)

    # ── Sign label — bottom left, small and clean ──
    sign_label = sign.upper() if not topic else "ASTROLOGY WONDERS"
    sf  = get_font(32, bold=False)
    draw.text((60, H - 130), sign_label, font=sf, fill=(AMBER[0], AMBER[1], AMBER[2]))

    # ── Accent lines ──
    draw.rectangle([0, 0, W, 3], fill=GOLD)
    draw.rectangle([0, H-3, W, H], fill=GOLD)

    # ── Progress bar ──
    prog = int(W * frame_idx / total_frames)
    draw.rectangle([0, H-9, prog, H-4], fill=GOLD)

    # ── Watermark ──
    wf   = get_font(28, bold=False)
    wm_t = "ASTROLOGYWONDERS.COM"
    bb_w = draw.textbbox((0, 0), wm_t, font=wf)
    ww   = bb_w[2] - bb_w[0]
    draw.text(((W - ww) // 2, H - 68), wm_t, font=wf, fill=AMBER)

    return img.convert("RGB")

# ── MAKE VIDEO ────────────────────────────────────────────────────────────────
def make_video(phrases, audio_path, output_path, sign, topic):
    print("  Loading audio...")
    y, sr, duration = load_audio(audio_path)
    n_frames        = int(duration * FPS)
    rms_vals        = compute_rms(y, sr, n_frames)

    n            = len(phrases)
    frame_starts = [int(i * n_frames / n) for i in range(n)] + [n_frames]

    print(f"  {n_frames} frames | {duration:.1f}s | {n} phrases")

    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24", "-r", str(FPS),
        "-i", "pipe:0",
        "-i", audio_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", output_path
    ]

    log_path = os.path.expanduser("~/Desktop/astro_short_ffmpeg.log")
    with open(log_path, "w") as log_f:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log_f)

    for i in range(n_frames):
        if i % 150 == 0:
            print(f"    {int(100*i/n_frames)}%", end="\r", flush=True)

        p_idx   = min(n-1, next((j for j in range(n) if frame_starts[j] > i), n) - 1)
        p_start = frame_starts[p_idx]
        p_end   = frame_starts[p_idx+1]
        p_prog  = (i - p_start) / max(p_end - p_start, 1)

        frame = render_frame(phrases[p_idx], p_prog, rms_vals[i],
                             i, n_frames, sign, topic)
        try:
            proc.stdin.write(np.array(frame).tobytes())
        except BrokenPipeError:
            print(f"\n  ❌ Pipe broke at frame {i} — check ~/Desktop/astro_short_ffmpeg.log")
            break

    proc.stdin.close()
    proc.wait()

    if proc.returncode == 0:
        mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"\n  ✅ {os.path.basename(output_path)} — {mb:.1f} MB")
    else:
        print(f"\n  ❌ ffmpeg error — check ~/Desktop/astro_short_ffmpeg.log")

# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    sign  = SIGN
    topic = TOPIC

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    date_str = datetime.now().strftime("%Y%m%d_%H%M")
    label    = (topic[:25].replace(" ", "_") if topic else sign)

    print(f"\n── AstrologyWonders TikTok Short ───────────────────────")
    print(f"  {'Topic: ' + topic if topic else 'Sign: ' + sign}")

    print("\n  Generating script (OpenAI)...")
    phrases = generate_phrases(sign, topic)
    print(f"  {len(phrases)} phrases generated:")
    for p in phrases:
        print(f"    → {p}")

    audio_path = os.path.join(OUTPUT_DIR, f"{label}_{date_str}.mp3")
    print(f"\n  Generating voiceover (Jay Wayne / ElevenLabs)...")
    generate_audio(phrases, audio_path)
    print(f"  ✅ Audio saved")

    output_path = os.path.join(OUTPUT_DIR, f"{label}_{date_str}_tiktok.mp4")
    print(f"\n  Rendering video...")
    make_video(phrases, audio_path, output_path, sign, topic)

    print(f"\n── Done ────────────────────────────────────────────────")
    print(f"  📁 {output_path}")
    print(f"\n  Suggested TikTok caption:")
    if phrases:
        tags = f"#{sign} #Astrology #AstrologyTikTok #ZodiacReading #AstrologyWonders" if not topic \
               else "#Astrology #AstrologyEducation #AstroTikTok #AstrologyWonders #BirthChart"
        print(f"  {phrases[0]} {tags}")

if __name__ == "__main__":
    main()
