"""
generate_aesthetic_artworks.py
Generates 20 highly aesthetic, modern, visually pleasing 3D-style cyber security artworks (960x640)
and 6 chapter/hero banners (1000x450).
Uses numpy mesh gradients, volumetric glow, 3D perspective grids, specular glass cards,
and polished cyber security iconography.
No generic plain yellow locks or childish boxes!
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

WEB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
QUIZ_DIR = os.path.join(WEB_DIR, 'public', 'images', 'quiz')
CLEAN_DIR = os.path.join(QUIZ_DIR, 'clean')
os.makedirs(CLEAN_DIR, exist_ok=True)

W, H = 960, 640

# ----------------- ADVANCED PROCEDURAL RENDERING ENGINE -----------------

def make_atmospheric_mesh(w, h, base_top, base_bot, lights):
    """
    Creates a liquid smooth, multi-point atmospheric mesh gradient with volumetric glow orbs.
    lights: list of (x_norm, y_norm, radius_norm, (r, g, b), intensity)
    """
    x = np.linspace(-1, 1, w)
    y = np.linspace(-h/w, h/w, h)
    xx, yy = np.meshgrid(x, y)

    # Base gradient
    factor = (yy - yy.min()) / (yy.max() - yy.min())
    r = base_top[0] * (1 - factor) + base_bot[0] * factor
    g = base_top[1] * (1 - factor) + base_bot[1] * factor
    b = base_top[2] * (1 - factor) + base_bot[2] * factor

    # Accumulate radial lights
    for lx, ly, lr, lcol, lint in lights:
        dist = np.sqrt((xx - lx)**2 + (yy - ly)**2)
        glow = np.exp(-dist * (2.0 / lr)) * lint
        r += glow * (lcol[0] / 255.0)
        g += glow * (lcol[1] / 255.0)
        b += glow * (lcol[2] / 255.0)

    rgb = np.stack([np.clip(r, 0, 255), np.clip(g, 0, 255), np.clip(b, 0, 255)], axis=-1).astype(np.uint8)
    return Image.fromarray(rgb)

def add_perspective_grid(canvas, horizon_y=0.4, grid_color=(40, 100, 160), alpha=70, num_lines=16):
    """Adds a 3D perspective cyber grid receding towards the horizon."""
    w, h = canvas.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    hy = int(h * horizon_y)
    
    # Converging perspective lines from vanishing point
    vp_x = w // 2
    for i in range(-num_lines, num_lines + 1):
        bot_x = vp_x + i * int(w / (num_lines * 0.7))
        draw.line([(vp_x, hy), (bot_x, h)], fill=(grid_color[0], grid_color[1], grid_color[2], alpha), width=1)
        
    # Exponentially spaced horizontal depth lines
    for i in range(1, 12):
        t = (i / 12.0) ** 2.2
        ly = hy + int((h - hy) * t)
        draw.line([(0, ly), (w, ly)], fill=(grid_color[0], grid_color[1], grid_color[2], int(alpha * (0.3 + 0.7 * t))), width=1)
        
    # Horizon subtle laser line
    draw.line([(0, hy), (w, hy)], fill=(grid_color[0], grid_color[1], grid_color[2], int(alpha * 1.5)), width=2)
    
    canvas_rgba = canvas.convert('RGBA')
    combined = Image.alpha_composite(canvas_rgba, overlay)
    return combined.convert('RGB')

def draw_specular_glass_card(draw, x1, y1, x2, y2, radius=24, fill_col=(20, 30, 60, 200), border_col=(56, 189, 248, 220), border_w=2):
    """Draws a modern frosted glass card with subtle specular light reflection."""
    # Drop shadow
    shadow_offset = 12
    draw.rounded_rectangle([x1, y1 + shadow_offset, x2, y2 + shadow_offset], radius=radius, fill=(0, 0, 0, 90))
    # Card surface
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill_col, outline=border_col, width=border_w)
    # Specular diagonal highlight line across top-left
    draw.line([(x1 + 20, y1 + 5), (x2 - 40, y1 + 5)], fill=(255, 255, 255, 120), width=2)

def draw_laser_rings(draw, cx, cy, radius, color, num_rings=3):
    for i in range(num_rings):
        r = radius - i * 22
        if r > 10:
            alpha = int(180 * ((num_rings - i) / num_rings))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(color[0], color[1], color[2], alpha), width=2)
            # Tech tick marks on outer ring
            if i == 0:
                for deg in range(0, 360, 30):
                    rad = math.radians(deg)
                    x1 = cx + int(r * math.cos(rad))
                    y1 = cy + int(r * math.sin(rad))
                    x2 = cx + int((r + 12) * math.cos(rad))
                    y2 = cy + int((r + 12) * math.sin(rad))
                    draw.line([(x1, y1), (x2, y2)], fill=(color[0], color[1], color[2], 220), width=2)

def draw_holographic_emv_chip(draw, x, y, w=70, h=55):
    """Draws a precision metallic gold EMV contact chip with circuit traces."""
    draw.rounded_rectangle([x, y, x + w, y + h], radius=8, fill=(245, 180, 30, 240), outline=(255, 255, 255, 220), width=2)
    # Internal chip geometry
    draw.line([(x + w * 0.35, y), (x + w * 0.35, y + h)], fill=(160, 100, 10, 220), width=2)
    draw.line([(x + w * 0.65, y), (x + w * 0.65, y + h)], fill=(160, 100, 10, 220), width=2)
    draw.line([(x, y + h * 0.5), (x + w, y + h * 0.5)], fill=(160, 100, 10, 220), width=2)
    draw.arc([x + w * 0.35, y + h * 0.25, x + w * 0.65, y + h * 0.75], start=0, end=360, fill=(160, 100, 10, 220), width=2)

def draw_sleek_shield(draw, cx, cy, w, h, fill_col, border_col):
    """Draws a dynamic aerodynamic cyber shield."""
    top_y = cy - h // 2
    bot_y = cy + h // 2
    mid_y = cy + h // 8
    lx = cx - w // 2
    rx = cx + w // 2
    points = [
        (cx, top_y),
        (rx, top_y + h // 8),
        (rx - 10, mid_y),
        (cx, bot_y),
        (lx + 10, mid_y),
        (lx, top_y + h // 8)
    ]
    draw.polygon(points, fill=fill_col, outline=border_col)
    # Inner border
    inset = 8
    draw.polygon([
        (cx, top_y + inset),
        (rx - inset, top_y + h // 8 + inset),
        (rx - 10 - inset, mid_y),
        (cx, bot_y - inset),
        (lx + 10 + inset, mid_y),
        (lx + inset, top_y + h // 8 + inset)
    ], outline=(255, 255, 255, 160))

# ----------------- 20 AESTHETIC TOPIC ARTWORKS (960x640) -----------------

def art_01():
    # 01. OTP & Confidential Banking: Sleek Titanium Card with Gold EMV Chip & Floating OTP Capsules
    lights = [
        (0.3, -0.1, 0.5, (14, 165, 233), 200),
        (-0.25, 0.2, 0.45, (251, 191, 36), 160),
    ]
    img = make_atmospheric_mesh(W, H, (6, 12, 32), (2, 5, 16), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(56, 189, 248), alpha=50)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # 3D Angled Floating Titanium Banking Card
    cw, ch = 480, 290
    x1, y1 = cx - cw // 2, cy - ch // 2
    x2, y2 = cx + cw // 2, cy + ch // 2
    draw_specular_glass_card(draw, x1, y1, x2, y2, radius=24, fill_col=(18, 28, 62, 220), border_col=(56, 189, 248, 240), border_w=3)
    
    # Card decorative geometric wave
    draw.arc([x1 - 100, y1 + 50, x2 + 100, y2 + 150], start=200, end=340, fill=(56, 189, 248, 80), width=40)
    
    # Precision Gold EMV Chip
    draw_holographic_emv_chip(draw, x1 + 65, y1 + 80, w=80, h=60)
    
    # Contactless WiFi Payment Waves
    wx, wy = x1 + 185, y1 + 110
    for r in [20, 35, 50]:
        draw.arc([wx - r, wy - r, wx + r, wy + r], start=300, end=60, fill=(255, 255, 255, 200), width=3)
        
    # Masked Secret Digits in Frosted Bar: "● ● ● ●   ● ● ● ●   ● ● ● ●"
    bar_y = y1 + 180
    for g in range(4):
        gx = x1 + 65 + g * 95
        for d in range(4):
            dx = gx + d * 18
            draw.ellipse([dx - 5, bar_y - 5, dx + 5, bar_y + 5], fill=(251, 191, 36, 240))
            
    # Floating Frosted OTP Capsule Badge: "[ OTP: 482913 · 30s ]"
    cap_y = y2 + 30
    draw.rounded_rectangle([cx - 160, cap_y, cx + 160, cap_y + 55], radius=16, fill=(15, 23, 42, 230), outline=(251, 191, 36, 240), width=2)
    # Encrypted lock icon inside badge
    draw.rounded_rectangle([cx - 135, cap_y + 18, cx - 105, cap_y + 42], radius=4, fill=(251, 191, 36))
    draw.arc([cx - 130, cap_y + 8, cx - 110, cap_y + 24], start=180, end=0, fill=(255, 255, 255), width=3)
    # Timer dot
    draw.ellipse([cx + 120, cap_y + 24, cx + 130, cap_y + 34], fill=(16, 185, 129))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_02():
    # 02. ATM Keypad Vigilance: Sleek Keypad with Neon Backlit Keys & Protective Privacy Canopy
    lights = [
        (0.2, -0.2, 0.5, (13, 148, 136), 190),
        (-0.2, 0.2, 0.45, (56, 189, 248), 150),
    ]
    img = make_atmospheric_mesh(W, H, (4, 18, 24), (1, 6, 10), lights)
    img = add_perspective_grid(img, horizon_y=0.42, grid_color=(13, 148, 136), alpha=50)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.5)
    
    # 3D Angled ATM Machine Bezel
    draw_specular_glass_card(draw, cx - 250, cy - 190, cx + 250, cy + 190, radius=24, fill_col=(15, 23, 42, 230), border_col=(13, 148, 136, 220), border_w=3)
    
    # Glowing Cash / Card Slot
    draw.rounded_rectangle([cx - 180, cy - 150, cx + 180, cy - 115], radius=10, fill=(2, 6, 23, 250), outline=(45, 212, 191, 200), width=2)
    draw.line([(cx - 140, cy - 132), (cx + 140, cy - 132)], fill=(45, 212, 191, 255), width=4)
    
    # Metallic Keypad with Illuminated Keycaps
    kw, kh = 65, 48
    start_x = cx - 115
    start_y = cy - 75
    for r in range(4):
        for c in range(3):
            kx = start_x + c * (kw + 20)
            ky = start_y + r * (kh + 12)
            draw.rounded_rectangle([kx, ky, kx + kw, ky + kh], radius=10, fill=(30, 41, 59, 240), outline=(13, 148, 136, 180), width=2)
            # Glowing central dot on keycap
            draw.ellipse([kx + kw//2 - 5, ky + kh//2 - 5, kx + kw//2 + 5, ky + kh//2 + 5], fill=(45, 212, 191, 220))
            
    # Luminous Cyan Privacy Shield Canopy Arching Over Keypad
    draw.arc([cx - 220, cy - 110, cx + 220, cy + 180], start=180, end=0, fill=(45, 212, 191, 240), width=5)
    draw.arc([cx - 200, cy - 90, cx + 200, cy + 160], start=180, end=0, fill=(255, 255, 255, 140), width=2)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_03():
    # 03. UPI PIN Golden Rule: Radiant Molten Gold Rupee Coin & Directional Outflow Beam
    lights = [
        (0.0, -0.1, 0.6, (245, 158, 11), 220),
        (-0.35, 0.25, 0.4, (251, 191, 36), 160),
    ]
    img = make_atmospheric_mesh(W, H, (22, 12, 2), (8, 4, 0), lights)
    img = add_perspective_grid(img, horizon_y=0.48, grid_color=(245, 158, 11), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.45)
    
    # Concentric Golden Laser HUD Rings
    draw_laser_rings(draw, cx, cy, radius=180, color=(245, 158, 11), num_rings=4)
    
    # 3D Beveled Golden Rupee Coin
    cr = 130
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(217, 119, 6, 240), outline=(254, 240, 138, 255), width=5)
    draw.ellipse([cx - (cr - 18), cy - (cr - 18), cx + (cr - 18), cy + (cr - 18)], outline=(254, 240, 138, 180), width=3)
    
    # Sharp Rupee Glyph ₹ in Center
    draw.line([(cx - 45, cy - 60), (cx + 45, cy - 60)], fill=(255, 255, 255), width=10)
    draw.line([(cx - 45, cy - 35), (cx + 45, cy - 35)], fill=(255, 255, 255), width=10)
    draw.line([(cx - 15, cy - 60), (cx - 15, cy + 20)], fill=(255, 255, 255), width=10)
    draw.arc([cx - 45, cy - 35, cx + 25, cy + 25], start=270, end=90, fill=(255, 255, 255), width=10)
    draw.line([(cx - 15, cy + 25), (cx + 45, cy + 75)], fill=(255, 255, 255), width=10)
    
    # Glowing Directional Outflow Beam: "SEND ONLY ➔"
    arr_y = cy + cr + 35
    draw.rounded_rectangle([cx - 180, arr_y, cx + 180, arr_y + 55], radius=16, fill=(15, 23, 42, 230), outline=(245, 158, 11, 240), width=2)
    draw.line([(cx - 120, arr_y + 27), (cx + 100, arr_y + 27)], fill=(251, 191, 36, 255), width=6)
    draw.polygon([(cx + 100, arr_y + 15), (cx + 125, arr_y + 27), (cx + 100, arr_y + 39)], fill=(251, 191, 36, 255))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_04():
    # 04. Emergency Helpline 1930 & 60-Minute Radar Command Center
    lights = [
        (-0.25, -0.1, 0.55, (14, 165, 233), 200),
        (0.3, 0.2, 0.45, (249, 115, 22), 170),
    ]
    img = make_atmospheric_mesh(W, H, (3, 16, 28), (1, 6, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(14, 165, 233), alpha=50)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Radar Command Sweep Rings
    for r in [90, 160, 230]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(14, 165, 233, 90), width=2)
    # Rotating Radar Sweep Wedge
    draw.pieslice([cx - 230, cy - 230, cx + 230, cy + 230], start=220, end=270, fill=(14, 165, 233, 40))
    draw.line([(cx, cy), (cx + int(230 * math.cos(math.radians(270))), cy + int(230 * math.sin(math.radians(270))))], fill=(14, 165, 233, 220), width=3)
    
    # Frosted Emergency Console in Center
    draw_specular_glass_card(draw, cx - 180, cy - 85, cx + 180, cy + 115, radius=24, fill_col=(15, 23, 42, 240), border_col=(249, 115, 22, 240), border_w=3)
    
    # Emergency Telephone Handset Icon
    draw.arc([cx - 80, cy - 65, cx + 80, cy + 25], start=200, end=340, fill=(249, 115, 22, 255), width=16)
    draw.ellipse([cx - 85, cy - 45, cx - 45, cy - 5], fill=(249, 115, 22, 255))
    draw.ellipse([cx + 45, cy - 45, cx + 85, cy - 5], fill=(249, 115, 22, 255))
    
    # Bold Glowing "1930" Hotline Badge
    draw.rounded_rectangle([cx - 120, cy + 35, cx + 120, cy + 95], radius=14, fill=(249, 115, 22, 230), outline=(255, 255, 255), width=2)
    # 1 9 3 0 drawn with high precision
    draw.line([(cx - 75, cy + 50), (cx - 65, cy + 45), (cx - 65, cy + 85)], fill=(255, 255, 255), width=4)
    draw.ellipse([cx - 45, cy + 48, cx - 20, cy + 68], outline=(255, 255, 255), width=4)
    draw.line([(cx - 20, cy + 50), (cx - 20, cy + 85), (cx - 40, cy + 85)], fill=(255, 255, 255), width=4)
    draw.arc([cx - 5, cy + 47, cx + 15, cy + 67], start=270, end=90, fill=(255, 255, 255), width=4)
    draw.arc([cx - 5, cy + 67, cx + 15, cy + 87], start=270, end=90, fill=(255, 255, 255), width=4)
    draw.ellipse([cx + 30, cy + 48, cx + 55, cy + 87], outline=(255, 255, 255), width=4)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_05():
    # 05. Citizen Cyber Shield: Futuristic Polygonal Shield & Verified Security Emblem
    lights = [
        (0.0, -0.15, 0.6, (56, 189, 248), 210),
        (-0.3, 0.25, 0.45, (16, 185, 129), 160),
    ]
    img = make_atmospheric_mesh(W, H, (6, 18, 42), (2, 7, 18), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(56, 189, 248), alpha=50)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Outer Concentric Tech HUD
    draw_laser_rings(draw, cx, cy, radius=190, color=(56, 189, 248), num_rings=3)
    
    # Master Cyber Shield
    draw_sleek_shield(draw, cx, cy, 270, 320, (15, 23, 42, 240), (56, 189, 248, 255))
    draw_sleek_shield(draw, cx, cy, 210, 250, (30, 58, 138, 180), (251, 191, 36, 220))
    
    # Glowing Verified Checkmark in Center
    draw.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], fill=(16, 185, 129, 240), outline=(255, 255, 255), width=3)
    draw.line([(cx - 24, cy - 2), (cx - 8, cy + 16), (cx + 26, cy - 18)], fill=(255, 255, 255), width=6)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_06():
    # 06. Fake KYC & SIM Security Verification Scanner
    lights = [
        (-0.2, -0.15, 0.5, (239, 68, 68), 180),
        (0.25, 0.2, 0.45, (245, 158, 11), 160),
    ]
    img = make_atmospheric_mesh(W, H, (26, 8, 12), (8, 2, 4), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(239, 68, 68), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Holographic SIM Card
    sw, sh = 250, 340
    x1, y1 = cx - sw // 2, cy - sh // 2
    x2, y2 = cx + sw // 2, cy + sh // 2
    pts = [(x1, y1), (x2 - 45, y1), (x2, y1 + 45), (x2, y2), (x1, y2)]
    draw.polygon(pts, fill=(15, 23, 42, 240), outline=(239, 68, 68, 240))
    for i in range(3):
        draw.polygon([(p[0] + (i if p[0] == x1 else -i), p[1] + (i if p[1] == y1 else -i)) for p in pts], outline=(239, 68, 68, 180))
        
    # Gold Microchip on SIM
    draw_holographic_emv_chip(draw, cx - 55, cy - 60, w=110, h=85)
    
    # Biometric Laser Scan Beam Across SIM
    draw.line([(x1 - 50, cy + 10), (x2 + 50, cy + 10)], fill=(56, 189, 248, 255), width=4)
    draw.ellipse([cx - 8, cy + 2, cx + 8, cy + 18], fill=(255, 255, 255))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_07():
    # 07. Defying Digital Arrest: Police Threat Video Call Blocked
    lights = [
        (-0.35, -0.1, 0.5, (59, 130, 246), 180),
        (0.35, -0.1, 0.5, (220, 38, 38), 180),
    ]
    img = make_atmospheric_mesh(W, H, (14, 10, 30), (5, 3, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(99, 102, 241), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Laptop Screen
    mw, mh = 500, 320
    draw_specular_glass_card(draw, cx - mw//2, cy - mh//2, cx + mw//2, cy + mh//2, radius=18, fill_col=(15, 23, 42, 240), border_col=(220, 38, 38, 240), border_w=3)
    
    # Laptop Base
    draw.polygon([(cx - mw//2 - 35, cy + mh//2 + 25), (cx + mw//2 + 35, cy + mh//2 + 25), (cx + mw//2, cy + mh//2), (cx - mw//2, cy + mh//2)], fill=(30, 41, 59, 240))
    
    # Intercepted Fake Authority Badge
    draw_sleek_shield(draw, cx, cy - 30, 140, 160, (220, 38, 38, 220), (255, 255, 255))
    draw.polygon([(cx, cy - 70), (cx - 30, cy - 10), (cx + 30, cy - 10)], fill=(255, 255, 255))
    draw.ellipse([cx - 6, cy + 2, cx + 6, cy + 14], fill=(255, 255, 255))
    
    # Severed Call Action Button at Bottom
    draw.rounded_rectangle([cx - 150, cy + 65, cx + 150, cy + 115], radius=14, fill=(220, 38, 38, 240), outline=(255, 255, 255), width=2)
    # Decline phone icon
    draw.arc([cx - 20, cy + 80, cx + 20, cy + 110], start=45, end=135, fill=(255, 255, 255), width=6)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_08():
    # 08. QR Code Cashback Trap & Laser Scanner
    lights = [
        (-0.2, -0.1, 0.5, (168, 85, 247), 180),
        (0.25, 0.2, 0.5, (16, 185, 129), 160),
    ]
    img = make_atmospheric_mesh(W, H, (20, 8, 32), (7, 2, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(168, 85, 247), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Floating 3D QR Matrix Plate
    qs = 290
    draw_specular_glass_card(draw, cx - qs//2, cy - qs//2, cx + qs//2, cy + qs//2, radius=20, fill_col=(15, 23, 42, 230), border_col=(16, 185, 129, 240), border_w=3)
    
    # Three Corner QR Positioning Squares
    q1, q2 = cx - qs//2, cy - qs//2
    for px, py in [(q1 + 25, q2 + 25), (q1 + qs - 85, q2 + 25), (q1 + 25, q2 + qs - 85)]:
        draw.rounded_rectangle([px, py, px + 60, py + 60], radius=8, fill=(15, 23, 42), outline=(16, 185, 129), width=8)
        draw.rectangle([px + 18, py + 18, px + 42, py + 42], fill=(16, 185, 129))
        
    # Sweeping Cyan Laser Beam Across QR
    draw.line([(q1 - 40, cy + 10), (q1 + qs + 40, cy + 10)], fill=(56, 189, 248, 255), width=5)
    
    # Alert Warning Shield in Center
    draw_sleek_shield(draw, cx, cy + 10, 80, 95, (220, 38, 38, 230), (255, 255, 255))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_09():
    # 09. Electricity Bill Disconnection Panic Threat
    lights = [
        (-0.2, -0.2, 0.55, (234, 179, 8), 180),
        (0.3, 0.2, 0.45, (56, 189, 248), 140),
    ]
    img = make_atmospheric_mesh(W, H, (26, 18, 4), (8, 6, 1), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(234, 179, 8), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # High-Voltage Pylon Silhouette
    px, py = cx - 180, cy
    draw.line([(px, py - 180), (px - 60, py + 160)], fill=(234, 179, 8, 220), width=3)
    draw.line([(px, py - 180), (px + 60, py + 160)], fill=(234, 179, 8, 220), width=3)
    for y_off in [-100, -30, 40, 110]:
        draw.line([(px - 40, py + y_off), (px + 40, py + y_off)], fill=(234, 179, 8, 220), width=2)
        
    # Smartphone with Calm Utility Shield on Right
    sx, sy = cx + 120, cy
    draw_specular_glass_card(draw, sx - 100, sy - 170, sx + 100, sy + 170, radius=20, fill_col=(15, 23, 42, 240), border_col=(234, 179, 8, 240), border_w=3)
    # Lightning bolt inside
    draw.polygon([(sx + 5, sy - 50), (sx - 25, sy), (sx - 5, sy), (sx - 15, sy + 50), (sx + 25, sy - 10), (sx + 5, sy - 10)], fill=(234, 179, 8))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_10():
    # 10. SIM Swap & eSIM Cloning Defense
    lights = [
        (0.2, -0.15, 0.5, (236, 72, 153), 180),
        (-0.25, 0.2, 0.45, (16, 185, 129), 160),
    ]
    img = make_atmospheric_mesh(W, H, (18, 6, 32), (6, 2, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(236, 72, 153), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Twin Encrypted SIM Cards
    draw_specular_glass_card(draw, cx - 210, cy - 130, cx - 40, cy + 120, radius=16, fill_col=(15, 23, 42, 240), border_col=(16, 185, 129, 240), border_w=3)
    draw_holographic_emv_chip(draw, cx - 170, cy - 40, w=80, h=65)
    
    draw_specular_glass_card(draw, cx + 40, cy - 130, cx + 210, cy + 120, radius=16, fill_col=(15, 23, 42, 240), border_col=(239, 68, 68, 240), border_w=3)
    # Blocked Clone Strikethrough
    draw.line([(cx + 60, cy - 110), (cx + 190, cy + 100)], fill=(239, 68, 68), width=5)
    draw.line([(cx + 190, cy - 110), (cx + 60, cy + 100)], fill=(239, 68, 68), width=5)
    
    # Central Cryptographic Security Crest
    draw_sleek_shield(draw, cx, cy, 90, 110, (15, 23, 42, 240), (251, 191, 36, 255))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_11():
    # 11. Harmful APK Malware & Android Firewall Defense
    lights = [
        (-0.25, -0.15, 0.5, (220, 38, 38), 180),
        (0.25, 0.2, 0.5, (16, 185, 129), 180),
    ]
    img = make_atmospheric_mesh(W, H, (12, 16, 20), (4, 6, 8), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(56, 189, 248), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Smartphone Center
    draw_specular_glass_card(draw, cx - 110, cy - 180, cx + 110, cy + 180, radius=24, fill_col=(15, 23, 42, 240), border_col=(56, 189, 248, 240), border_w=3)
    
    # Hexagonal Firewall Dome around device
    draw_laser_rings(draw, cx, cy, radius=190, color=(16, 185, 129), num_rings=3)
    
    # Deflected Red Threat Package
    bx, by = cx - 210, cy - 60
    draw_specular_glass_card(draw, bx - 45, by - 45, bx + 45, by + 45, radius=12, fill_col=(220, 38, 38, 230), border_col=(255, 255, 255), border_w=2)
    # Deflection Energy Sparks
    draw.line([(bx + 50, by), (cx - 95, cy)], fill=(254, 240, 138, 255), width=4)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_12():
    # 12. Customs Parcel Seizure & Blackmail Scam
    lights = [
        (0.2, -0.1, 0.55, (249, 115, 22), 190),
        (-0.25, 0.25, 0.4, (251, 191, 36), 150),
    ]
    img = make_atmospheric_mesh(W, H, (24, 14, 4), (8, 4, 1), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(249, 115, 22), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # International Cargo Parcel
    bw, bh = 340, 250
    draw_specular_glass_card(draw, cx - bw//2, cy - bh//2 + 20, cx + bw//2, cy + bh//2 + 20, radius=16, fill_col=(180, 83, 9, 230), border_col=(254, 240, 138, 240), border_w=3)
    # Package tape
    draw.rectangle([cx - 25, cy - bh//2 + 20, cx + 25, cy + bh//2 + 20], fill=(217, 119, 6, 255))
    
    # Cyan Customs Inspection Laser
    draw.line([(cx - bw//2 - 40, cy + 10), (cx + bw//2 + 40, cy + 10)], fill=(56, 189, 248, 255), width=5)
    
    # Official Defense Seal
    draw_sleek_shield(draw, cx, cy - 90, 110, 125, (15, 23, 42, 240), (251, 191, 36, 255))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_13():
    # 13. Phishing Link & Domain URL Microscopic Inspection
    lights = [
        (-0.25, -0.15, 0.5, (14, 165, 233), 190),
        (0.25, 0.2, 0.45, (239, 68, 68), 160),
    ]
    img = make_atmospheric_mesh(W, H, (4, 18, 26), (1, 6, 10), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(14, 165, 233), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Browser URL Address Bar
    bar_w, bar_h = 580, 80
    draw_specular_glass_card(draw, cx - bar_w//2, cy - bar_h//2, cx + bar_w//2, cy + bar_h//2, radius=16, fill_col=(15, 23, 42, 240), border_col=(14, 165, 233, 240), border_w=3)
    
    # Authentic HTTPS Green Lock on Left
    draw.ellipse([cx - bar_w//2 + 45, cy - 15, cx - bar_w//2 + 75, cy + 15], fill=(16, 185, 129))
    
    # Suspicious Domain Highlighted in Red
    draw.rounded_rectangle([cx - 20, cy - 20, cx + 140, cy + 20], radius=8, fill=(220, 38, 38, 230))
    
    # Large Glowing Magnifying Lens over domain
    lx, ly = cx + 60, cy
    lr = 85
    draw.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], outline=(254, 240, 138, 240), width=6)
    draw.line([(lx + int(lr * 0.7), ly + int(lr * 0.7)), (lx + lr + 45, ly + lr + 45)], fill=(254, 240, 138, 240), width=12)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_14():
    # 14. Bank Impersonator & Call Center Scam Defense: Heavy Titanium Vault Door
    lights = [
        (0.0, -0.1, 0.6, (59, 130, 246), 200),
        (-0.35, 0.25, 0.45, (251, 191, 36), 160),
    ]
    img = make_atmospheric_mesh(W, H, (6, 16, 34), (2, 6, 14), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(59, 130, 246), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Heavy Bank Vault Door
    vr = 175
    draw.ellipse([cx - vr, cy - vr, cx + vr, cy + vr], fill=(30, 41, 59, 240), outline=(59, 130, 246, 255), width=6)
    draw.ellipse([cx - (vr - 28), cy - (vr - 28), cx + (vr - 28), cy + (vr - 28)], outline=(254, 240, 138, 200), width=3)
    
    # 4-Spoke Wheel Lock
    draw.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=(245, 158, 11, 240), outline=(255, 255, 255), width=3)
    for deg in [0, 90, 180, 270]:
        rad = math.radians(deg)
        x2 = cx + int(75 * math.cos(rad))
        y2 = cy + int(75 * math.sin(rad))
        draw.line([(cx, cy), (x2, y2)], fill=(245, 158, 11, 255), width=8)
        draw.ellipse([x2 - 10, y2 - 10, x2 + 10, y2 + 10], fill=(255, 255, 255))
        
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_15():
    # 15. AI Voice Cloning & Family Distress Call Verification
    lights = [
        (-0.2, -0.15, 0.55, (236, 72, 153), 190),
        (0.3, 0.2, 0.45, (16, 185, 129), 160),
    ]
    img = make_atmospheric_mesh(W, H, (22, 6, 28), (6, 2, 10), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(236, 72, 153), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Audio Waveform Spectrum Visualizer
    num_bars = 28
    bw = 10
    start_x = cx - 210
    random.seed(315)
    for i in range(num_bars):
        h_val = random.randint(25, 150)
        bx = start_x + i * 15
        draw.rounded_rectangle([bx, cy - h_val // 2, bx + bw, cy + h_val // 2], radius=4, fill=(236, 72, 153, 230), outline=(254, 240, 138, 200), width=1)
        
    # Protective Family Circle Shield
    draw_sleek_shield(draw, cx, cy - 70, 120, 135, (15, 23, 42, 240), (16, 185, 129, 255))
    
    # Direct Callback Button
    draw.rounded_rectangle([cx - 150, cy + 90, cx + 150, cy + 145], radius=15, fill=(16, 185, 129, 240), outline=(255, 255, 255), width=2)
    draw.line([(cx - 90, cy + 118), (cx + 90, cy + 118)], fill=(255, 255, 255), width=4)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_16():
    # 16. Lottery Prize & Scratch Card Wheel Trap
    lights = [
        (0.0, -0.15, 0.55, (168, 85, 247), 190),
        (-0.3, 0.25, 0.4, (245, 158, 11), 160),
    ]
    img = make_atmospheric_mesh(W, H, (24, 6, 36), (8, 2, 14), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(168, 85, 247), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Giant Prize Gift Box
    gw, gh = 290, 240
    draw_specular_glass_card(draw, cx - gw//2, cy - gh//2, cx + gw//2, cy + gh//2, radius=18, fill_col=(147, 51, 234, 230), border_col=(254, 240, 138, 240), border_w=3)
    # Gold ribbon
    draw.rectangle([cx - 20, cy - gh//2, cx + 20, cy + gh//2], fill=(251, 191, 36, 255))
    draw.rectangle([cx - gw//2, cy - 20, cx + gw//2, cy + 20], fill=(251, 191, 36, 255))
    
    # Steel Bear Trap Jaws Overlaying the Gift
    draw.arc([cx - 120, cy - 80, cx + 120, cy + 80], start=180, end=0, fill=(239, 68, 68), width=8)
    draw.arc([cx - 120, cy - 60, cx + 120, cy + 100], start=0, end=180, fill=(239, 68, 68), width=8)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_17():
    # 17. Remote Screen Sharing Trap (AnyDesk/TeamViewer Blocked)
    lights = [
        (-0.25, -0.1, 0.5, (6, 182, 212), 180),
        (0.25, 0.2, 0.45, (239, 68, 68), 160),
    ]
    img = make_atmospheric_mesh(W, H, (4, 18, 22), (1, 6, 8), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(6, 182, 212), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Left Monitor (User Device - Protected)
    draw_specular_glass_card(draw, cx - 250, cy - 120, cx - 50, cy + 80, radius=14, fill_col=(15, 23, 42, 240), border_col=(16, 185, 129, 240), border_w=3)
    
    # Right Monitor (Remote Fraudster - Strikethrough)
    draw_specular_glass_card(draw, cx + 50, cy - 120, cx + 250, cy + 80, radius=14, fill_col=(15, 23, 42, 240), border_col=(239, 68, 68, 240), border_w=3)
    draw.line([(cx + 60, cy - 110), (cx + 240, cy + 70)], fill=(239, 68, 68), width=5)
    draw.line([(cx + 240, cy - 110), (cx + 60, cy + 70)], fill=(239, 68, 68), width=5)
    
    # Severed Connection Laser in Center
    draw.line([(cx - 50, cy - 20), (cx + 50, cy - 20)], fill=(251, 191, 36), width=6)
    draw.line([(cx - 15, cy - 65), (cx + 15, cy + 25)], fill=(239, 68, 68), width=8)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_18():
    # 18. Predatory Loan App & Contacts Privacy Vault
    lights = [
        (-0.2, -0.15, 0.5, (185, 28, 28), 180),
        (0.25, 0.2, 0.45, (245, 158, 11), 160),
    ]
    img = make_atmospheric_mesh(W, H, (26, 6, 10), (8, 2, 3), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(185, 28, 28), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Biometric Digital Titanium Safe
    draw_specular_glass_card(draw, cx - 180, cy - 160, cx + 180, cy + 160, radius=24, fill_col=(30, 41, 59, 240), border_col=(245, 158, 11, 240), border_w=4)
    # Fingerprint scanner arches
    for r in [20, 35, 50, 65]:
        draw.arc([cx - r, cy - 40 - r, cx + r, cy - 40 + r], start=190, end=350, fill=(16, 185, 129), width=3)
        draw.arc([cx - r, cy - 20 - r, cx + r, cy - 20 + r], start=10, end=170, fill=(16, 185, 129), width=3)
        
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_19():
    # 19. Golden Hour Bank Account Freezing Action
    lights = [
        (0.0, -0.1, 0.6, (59, 130, 246), 200),
        (-0.3, 0.25, 0.45, (56, 189, 248), 160),
    ]
    img = make_atmospheric_mesh(W, H, (4, 18, 32), (1, 6, 14), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(59, 130, 246), alpha=45)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Chronograph Stopwatch Face
    cr = 165
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(15, 23, 42, 230), outline=(59, 130, 246, 240), width=4)
    draw_laser_rings(draw, cx, cy, radius=cr, color=(59, 130, 246), num_rings=3)
    
    # 60-Minute Golden Hour Sector
    draw.pieslice([cx - (cr - 20), cy - (cr - 20), cx + (cr - 20), cy + (cr - 20)], start=270, end=360, fill=(245, 158, 11, 140))
    # Clock hands
    draw.line([(cx, cy), (cx, cy - (cr - 30))], fill=(239, 68, 68), width=5)
    draw.line([(cx, cy), (cx + (cr - 40), cy)], fill=(254, 240, 138), width=4)
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def art_20():
    # 20. Empowered Cyber Rakshak & Digital Fortress
    lights = [
        (0.0, -0.15, 0.65, (251, 191, 36), 220),
        (-0.35, 0.25, 0.45, (56, 189, 248), 170),
    ]
    img = make_atmospheric_mesh(W, H, (6, 10, 32), (2, 4, 14), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(251, 191, 36), alpha=50)
    
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, int(H * 0.48)
    
    # Grand Master Cyber Shield
    draw_laser_rings(draw, cx, cy, radius=210, color=(251, 191, 36), num_rings=3)
    draw_sleek_shield(draw, cx, cy, 300, 350, (15, 23, 42, 240), (251, 191, 36, 255))
    draw_sleek_shield(draw, cx, cy, 240, 280, (30, 58, 138, 180), (56, 189, 248, 220))
    
    # Eternal Flame Emblem in Center
    draw.polygon([(cx, cy - 80), (cx - 30, cy - 20), (cx + 30, cy - 20)], fill=(245, 158, 11))
    draw.polygon([(cx, cy - 70), (cx - 18, cy - 25), (cx + 18, cy - 25)], fill=(254, 240, 138))
    
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

# ----------------- 6 CHAPTER & HERO BANNERS (1000x450) -----------------

BW, BH = 1000, 450

def make_ch1_banner():
    lights = [(0.3, 0.0, 0.6, (56, 189, 248), 200), (-0.3, 0.0, 0.5, (251, 191, 36), 170)]
    img = make_atmospheric_mesh(BW, BH, (6, 12, 34), (2, 5, 16), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(56, 189, 248), alpha=50)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_specular_glass_card(draw, 100, 90, 480, 330, radius=20, fill_col=(18, 28, 65, 220), border_col=(251, 191, 36, 240), border_w=3)
    draw_holographic_emv_chip(draw, 150, 160, w=80, h=60)
    draw_laser_rings(draw, 720, BH // 2, radius=120, color=(56, 189, 248), num_rings=3)
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_ch2_banner():
    lights = [(-0.3, 0.0, 0.55, (220, 38, 38), 190), (0.35, 0.0, 0.5, (59, 130, 246), 160)]
    img = make_atmospheric_mesh(BW, BH, (14, 8, 28), (4, 2, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(99, 102, 241), alpha=50)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_specular_glass_card(draw, 140, 90, 540, 330, radius=18, fill_col=(15, 23, 42, 240), border_col=(220, 38, 38, 240), border_w=3)
    draw_sleek_shield(draw, 760, BH // 2, 140, 160, (15, 23, 42, 240), (251, 191, 36, 255))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_ch3_banner():
    lights = [(0.0, 0.0, 0.6, (234, 179, 8), 210), (0.4, 0.0, 0.5, (16, 185, 129), 160)]
    img = make_atmospheric_mesh(BW, BH, (22, 10, 2), (6, 3, 0), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(234, 179, 8), alpha=50)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse([140, 100, 360, 320], fill=(217, 119, 6, 240), outline=(254, 240, 138, 255), width=4)
    draw.line([(210, 170), (290, 170)], fill=(255, 255, 255), width=8)
    draw.line([(210, 195), (290, 195)], fill=(255, 255, 255), width=8)
    draw.line([(235, 170), (235, 240)], fill=(255, 255, 255), width=8)
    draw_specular_glass_card(draw, 580, 100, 840, 320, radius=18, fill_col=(15, 23, 42, 230), border_col=(16, 185, 129, 240), border_w=3)
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_ch4_banner():
    lights = [(-0.3, 0.0, 0.55, (220, 38, 38), 180), (0.35, 0.0, 0.5, (249, 115, 22), 160)]
    img = make_atmospheric_mesh(BW, BH, (22, 6, 12), (6, 2, 4), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(220, 38, 38), alpha=45)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_specular_glass_card(draw, 160, 80, 340, 360, radius=20, fill_col=(15, 23, 42, 240), border_col=(56, 189, 248, 240), border_w=3)
    draw_laser_rings(draw, 250, 220, radius=130, color=(16, 185, 129), num_rings=3)
    draw_specular_glass_card(draw, 560, 110, 860, 320, radius=16, fill_col=(180, 83, 9, 230), border_col=(254, 240, 138, 240), border_w=3)
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_ch5_banner():
    lights = [(-0.3, 0.0, 0.55, (14, 165, 233), 190), (0.35, 0.0, 0.5, (16, 185, 129), 160)]
    img = make_atmospheric_mesh(BW, BH, (3, 20, 32), (1, 6, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(14, 165, 233), alpha=50)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_specular_glass_card(draw, 140, 110, 440, 320, radius=20, fill_col=(15, 23, 42, 240), border_col=(249, 115, 22, 255), border_w=3)
    draw_sleek_shield(draw, 740, BH // 2, 190, 220, (15, 23, 42, 240), (16, 185, 129, 255))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_grand_hero_banner():
    lights = [(0.0, 0.0, 0.7, (59, 130, 246), 210), (0.4, 0.0, 0.5, (251, 191, 36), 170)]
    img = make_atmospheric_mesh(BW, BH, (6, 10, 34), (2, 3, 12), lights)
    img = add_perspective_grid(img, horizon_y=0.45, grid_color=(56, 189, 248), alpha=50)
    overlay = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = BW // 2, BH // 2
    draw_laser_rings(draw, cx, cy, radius=160, color=(251, 191, 36), num_rings=3)
    draw_sleek_shield(draw, cx, cy, 250, 290, (15, 23, 42, 240), (251, 191, 36, 255))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

def make_badge():
    size = 200
    lights = [(0.0, 0.0, 0.7, (251, 191, 36), 210)]
    img = make_atmospheric_mesh(size, size, (8, 14, 40), (2, 4, 14), lights)
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_sleek_shield(draw, size // 2, size // 2, 120, 140, (15, 23, 42, 240), (251, 191, 36, 255))
    return Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')

# ----------------- DISPATCHER -----------------

GENERATORS = [
    art_01, art_02, art_03, art_04, art_05,
    art_06, art_07, art_08, art_09, art_10,
    art_11, art_12, art_13, art_14, art_15,
    art_16, art_17, art_18, art_19, art_20
]

def main():
    print("Generating 20 highly aesthetic 3D-style cyber security artworks...")
    for idx, fn in enumerate(GENERATORS, start=1):
        img = fn()
        out_name = f"clean_art_{idx:02d}.jpg"
        out_path = os.path.join(CLEAN_DIR, out_name)
        img.save(out_path, format="JPEG", quality=95)
        print(f"Created #{idx:02d}: {out_name}")

    print("\nGenerating 6 aesthetic banners...")
    banners = [
        ("chapter_1_banner.jpg", make_ch1_banner),
        ("chapter_2_banner.jpg", make_ch2_banner),
        ("chapter_3_banner.jpg", make_ch3_banner),
        ("chapter_4_banner.jpg", make_ch4_banner),
        ("chapter_5_banner.jpg", make_ch5_banner),
        ("quiz_hero_banner.jpg", make_grand_hero_banner),
    ]
    for bname, bfn in banners:
        bimg = bfn()
        out_path = os.path.join(QUIZ_DIR, bname)
        bimg.save(out_path, format="JPEG", quality=95)
        print(f"Created banner: {bname}")

    print("\nGenerating badge...")
    badge = make_badge()
    badge_path = os.path.join(QUIZ_DIR, "quiz_badge.jpg")
    badge.save(badge_path, format="JPEG", quality=95)
    print("All aesthetic artworks successfully created!")

if __name__ == '__main__':
    main()
