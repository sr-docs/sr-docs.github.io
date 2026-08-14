from PIL import Image, ImageDraw, ImageFont
import os

out_dir = r"C:\Users\Sabita\sr-docs.github.io"
sizes = [16, 32, 48]


def make(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, size // 32)
    draw.ellipse(
        [pad, pad, size - 1 - pad, size - 1 - pad],
        fill=(11, 110, 110, 255),
    )
    text = "SR"
    font = None
    for candidate in [
        r"C:\Windows\Fonts\georgiab.ttf",
        r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ]:
        if os.path.exists(candidate):
            try:
                font = ImageFont.truetype(candidate, max(8, int(size * 0.42)))
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02
    draw.text((x, y), text, font=font, fill=(245, 248, 251, 255))
    return img


images = [make(s) for s in sizes]
ico_path = os.path.join(out_dir, "favicon.ico")
images[-1].save(
    ico_path,
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=images[:-1],
)
os.makedirs(os.path.join(out_dir, "assets"), exist_ok=True)
images[1].save(os.path.join(out_dir, "assets", "favicon-32.png"), format="PNG")
print("wrote", ico_path, "bytes", os.path.getsize(ico_path))
print("corner_pixel", images[-1].getpixel((0, 0)))
