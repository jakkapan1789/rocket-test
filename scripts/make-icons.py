#!/usr/bin/env python3
"""Generate all icon assets for Rocket Test using only Python stdlib."""
import struct, zlib, math, os, subprocess

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)

# ── PNG encoder ──────────────────────────────────────────────────────────────

def pack_chunk(tag, data):
    buf = tag + data
    return struct.pack('>I', len(data)) + buf + struct.pack('>I', zlib.crc32(buf) & 0xffffffff)

def encode_png(pixels, w, h):
    """pixels: flat list of (r,g,b,a) tuples, row-major."""
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        for x in range(w):
            r, g, b, a = pixels[y * w + x]
            rows += bytes([r, g, b, a])
    idat = zlib.compress(bytes(rows), 6)
    return b'\x89PNG\r\n\x1a\n' + pack_chunk(b'IHDR', ihdr) + pack_chunk(b'IDAT', idat) + pack_chunk(b'IEND', b'')

# ── Rocket pixel art ─────────────────────────────────────────────────────────

def rocket_pixel(x, y, w, h):
    """Return (r,g,b,a) for the rocket icon."""
    cx, cy = w / 2, h / 2
    # Normalised coords: centre=0, range roughly ±1
    nx = (x - cx) / (w * 0.38)
    ny = (cy - y) / (h * 0.38)

    # helpers
    def sdf_ellipse(px, py, ax, ay): return px*px/(ax*ax) + py*py/(ay*ay)
    def aa(d, r=0.05): return max(0, min(255, int(255 * (1 - (d - 1) / r))))

    # Background: transparent
    r, g, b, a = 0, 0, 0, 0

    # Flame (bottom, behind body)
    if abs(nx) < 0.28 and -1.35 < ny < -0.68:
        t = (-0.68 - ny) / 0.67
        if nx*nx / max(0.001, (0.28 - t*0.18)**2) <= 1:
            if t < 0.35:
                r, g, b, a = 255, 140, 0, 255
            elif t < 0.65:
                r, g, b, a = 255, 200, 0, 255
            else:
                alpha = int(180 * (1 - (t - 0.65) / 0.35))
                r, g, b, a = 255, 245, 180, alpha

    # Body
    body = sdf_ellipse(nx, ny - 0.15, 0.52, 0.92)
    if body <= 1.0:
        r, g, b, a = 0, 120, 212, 255

    # Nose cone
    nose_d = nx*nx * 2.2 + (ny - 0.95)**2
    if nose_d < 0.45 and ny > 0.15:
        r, g, b, a = 0, 78, 152, 255

    # Side wings
    for sign in (-1, 1):
        wx = nx * sign
        if 0.38 < wx < 0.90 and -0.72 < ny < 0.05:
            # triangular fin: wide at bottom, narrow at top
            reach = 0.52 * (1 - (ny + 0.72) / 0.77)
            if wx < 0.38 + reach:
                r, g, b, a = 0, 91, 161, 255

    # Re-draw body over wings
    if body <= 1.0:
        r, g, b, a = 0, 120, 212, 255

    # Window ring
    win_r = math.sqrt(nx*nx + (ny - 0.18)**2)
    if win_r < 0.30:
        r, g, b, a = 26, 159, 255, 255
    if win_r < 0.22:
        r, g, b, a = 180, 220, 255, 230
    if win_r < 0.10:
        r, g, b, a = 255, 255, 255, 200

    # Exhaust port
    if sdf_ellipse(nx, ny + 0.72, 0.18, 0.08) <= 1.0:
        r, g, b, a = 0, 40, 80, 255

    # Clamp
    return (max(0,min(255,r)), max(0,min(255,g)), max(0,min(255,b)), max(0,min(255,a)))

def make_rocket_png(size):
    pixels = [rocket_pixel(x, y, size, size) for y in range(size) for x in range(size)]
    return encode_png(pixels, size, size)

# ── BMP encoder (uncompressed BGR, 24-bit) ────────────────────────────────────

def encode_bmp_solid(w, h, rgb):
    """Solid-color BMP, 24-bit."""
    r, g, b = rgb
    row_bytes = w * 3
    padding = (4 - row_bytes % 4) % 4
    stride = row_bytes + padding
    pixel_data_size = stride * h
    file_size = 54 + pixel_data_size
    fh = struct.pack('<2sIHHI', b'BM', file_size, 0, 0, 54)
    ih = struct.pack('<IiiHHIIiiII', 40, w, h, 1, 24, 0, pixel_data_size, 2835, 2835, 0, 0)
    row = bytes([b, g, r] * w + [0] * padding)
    return fh + ih + row * h

# ── ICO encoder (embeds a PNG) ────────────────────────────────────────────────

def encode_ico(png_data):
    data_offset = 6 + 16
    header = struct.pack('<HHH', 0, 1, 1)
    entry  = struct.pack('<BBBBHHII', 0, 0, 0, 0, 1, 32, len(png_data), data_offset)
    return header + entry + png_data

# ── Generate files ────────────────────────────────────────────────────────────

print("Generating icon.png (1024x1024) …")
png1024 = make_rocket_png(1024)
with open(os.path.join(OUT, 'icon.png'), 'wb') as f:
    f.write(png1024)
print(f"  icon.png  {len(png1024)//1024} KB")

print("Generating icon.ico …")
png256 = make_rocket_png(256)
with open(os.path.join(OUT, 'icon.ico'), 'wb') as f:
    f.write(encode_ico(png256))
print("  icon.ico  ok")

print("Generating installer BMP files …")
# NSIS sidebar: 164 × 314, brand colours
with open(os.path.join(OUT, 'installer-sidebar.bmp'), 'wb') as f:
    f.write(encode_bmp_solid(164, 314, (30, 30, 30)))    # dark bg (#1e1e1e)
print("  installer-sidebar.bmp  ok")

# NSIS header: 150 × 57
with open(os.path.join(OUT, 'installer-header.bmp'), 'wb') as f:
    f.write(encode_bmp_solid(150, 57, (0, 120, 212)))    # accent blue
print("  installer-header.bmp  ok")

# ── Convert PNG → ICNS (macOS only) ──────────────────────────────────────────

iconset = os.path.join(OUT, 'icon.iconset')
os.makedirs(iconset, exist_ok=True)
src = os.path.join(OUT, 'icon.png')

sizes = [
    ('icon_16x16.png',       16),
    ('icon_16x16@2x.png',    32),
    ('icon_32x32.png',       32),
    ('icon_32x32@2x.png',    64),
    ('icon_128x128.png',    128),
    ('icon_128x128@2x.png', 256),
    ('icon_256x256.png',    256),
    ('icon_256x256@2x.png', 512),
    ('icon_512x512.png',    512),
    ('icon_512x512@2x.png',1024),
]

print("Generating iconset …")
for name, size in sizes:
    dest = os.path.join(iconset, name)
    subprocess.run(['sips', '-z', str(size), str(size), src, '--out', dest],
                   check=True, capture_output=True)
    print(f"  {name}")

print("Converting to icon.icns …")
subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', os.path.join(OUT, 'icon.icns')],
               check=True)
print("  icon.icns  ok")

print("\nDone! All icon assets created in assets/")
