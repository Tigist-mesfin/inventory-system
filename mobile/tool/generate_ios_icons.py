"""Generate iOS AppIcon + LaunchImage assets from the brand logo."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "assets" / "images" / "app_logo.png"
ICON_DIR = (
    ROOT
    / "ios"
    / "Runner"
    / "Assets.xcassets"
    / "AppIcon.appiconset"
)
LAUNCH_DIR = (
    ROOT
    / "ios"
    / "Runner"
    / "Assets.xcassets"
    / "LaunchImage.imageset"
)

# Opaque background — App Store marketing icons cannot use alpha.
BG = (247, 250, 246, 255)


def make_icon(logo: Image.Image, size: int, pad_ratio: float = 0.12) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    max_side = int(size * (1 - 2 * pad_ratio))
    scaled = logo.copy()
    scaled.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    canvas.alpha_composite(scaled, (x, y))
    return canvas.convert("RGB")


def main() -> None:
    logo = Image.open(LOGO).convert("RGBA")
    icons = {
        "Icon-App-20x20@1x.png": 20,
        "Icon-App-20x20@2x.png": 40,
        "Icon-App-20x20@3x.png": 60,
        "Icon-App-29x29@1x.png": 29,
        "Icon-App-29x29@2x.png": 58,
        "Icon-App-29x29@3x.png": 87,
        "Icon-App-40x40@1x.png": 40,
        "Icon-App-40x40@2x.png": 80,
        "Icon-App-40x40@3x.png": 120,
        "Icon-App-60x60@2x.png": 120,
        "Icon-App-60x60@3x.png": 180,
        "Icon-App-76x76@1x.png": 76,
        "Icon-App-76x76@2x.png": 152,
        "Icon-App-83.5x83.5@2x.png": 167,
        "Icon-App-1024x1024@1x.png": 1024,
    }
    for name, px in icons.items():
        make_icon(logo, px).save(ICON_DIR / name, format="PNG")

    for name, px in [
        ("LaunchImage.png", 168),
        ("LaunchImage@2x.png", 336),
        ("LaunchImage@3x.png", 504),
    ]:
        make_icon(logo, px, pad_ratio=0.08).save(LAUNCH_DIR / name, format="PNG")

    print(f"Generated {len(icons)} app icons and 3 launch images.")


if __name__ == "__main__":
    main()
