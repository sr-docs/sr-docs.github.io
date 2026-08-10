from PIL import Image

src = r"C:\Users\Sabita\.cursor\projects\c-Users-Sabita-sr-docs-github-io\assets\c__Users_Sabita_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Stage_2_Write_2K_202608082031-e14c3788-1d07-41d9-8b68-03fa4f4600a0.png"
path = r"C:\Users\Sabita\sr-docs.github.io\assets\hero.png"

im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size
transparent = 0

for y in range(h):
    for x in range(w):
        r, g, b, _a = pixels[x, y]
        luma = (r + g + b) / 3.0
        spread = max(r, g, b) - min(r, g, b)
        nx = x / (w - 1)
        ny = y / (h - 1)
        near_write_left = (0.26 <= nx <= 0.50) and (ny >= 0.58)

        if luma >= 245 or (luma >= 222 and spread <= 28):
            alpha = 0
        elif near_write_left and (luma >= 205 and spread <= 40):
            # Extra pass for residual matte left of WRITE
            if luma >= 218 or spread <= 24:
                alpha = 0
            else:
                t = max(0.0, min(1.0, (225 - luma) / 20.0))
                alpha = int(255 * t * 0.45)
        elif luma >= 198 and spread <= 42:
            luma_t = max(0.0, min(1.0, (238 - luma) / 40.0))
            chroma_t = max(0.0, min(1.0, spread / 42.0))
            alpha = int(255 * max(0.0, min(1.0, luma_t * (0.15 + 0.85 * chroma_t))))
        else:
            alpha = 255

        if alpha == 0:
            pixels[x, y] = (0, 0, 0, 0)
            transparent += 1
        else:
            pixels[x, y] = (r, g, b, alpha)


def clear_neighbors(px, x, y, w, h, radius=2):
    n = 0
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] == 0:
                n += 1
    return n


def fix_left_platform_fringe(img):
    """Remove matte halo on the highlighted left-front platform curve only."""
    px = img.load()
    width, height = img.size
    # Purple-oval region: outer curve of the cream/brown base at left-front
    x0, y0, x1, y1 = 165, 468, 465, height
    changed = 0

    for _ in range(3):
        snap = img.copy().load()
        for y in range(y0, y1):
            for x in range(x0, x1):
                r, g, b, a = snap[x, y]
                if a == 0:
                    continue
                yv = (r + g + b) / 3.0
                spread = max(r, g, b) - min(r, g, b)
                clear_n = clear_neighbors(snap, x, y, width, height, radius=2)
                if clear_n == 0:
                    continue

                # Near-neutral wash / light matte (not warm brown clay)
                neutral = spread <= 18
                light = yv >= 168
                soft = a < 245

                if light and neutral and (soft or clear_n >= 4):
                    px[x, y] = (0, 0, 0, 0)
                    changed += 1
                    continue

                if light and spread <= 28 and clear_n >= 3:
                    px[x, y] = (0, 0, 0, 0)
                    changed += 1
                    continue

                if soft and yv >= 155 and spread <= 40 and clear_n >= 2:
                    px[x, y] = (0, 0, 0, 0)
                    changed += 1
                    continue

                # One-pixel inward bloom: opaque gray glued to the silhouette
                if a == 255 and yv >= 175 and spread <= 12 and clear_n >= 2:
                    px[x, y] = (0, 0, 0, 0)
                    changed += 1

    return changed


roi_changed = fix_left_platform_fringe(im)
im.save(path, optimize=True)
print(f"saved {path}")
print(f"transparent_pct={100.0 * transparent / (w * h):.1f}")
print(f"left_platform_fringe_fixed={roi_changed}")
