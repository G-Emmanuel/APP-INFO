"""Génère les icônes de l'application (nécessite Pillow). Usage : python scripts/make_icons.py"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "docs" / "icons"
BG = (17, 23, 32)
# Une barre par rubrique : cyber, IT, IA, infra, gaming, culture
BARS = [((255, 111, 128), 1.00), ((114, 169, 255), 0.72), ((185, 145, 255), 0.88),
        ((69, 207, 189), 0.60), ((255, 175, 82), 0.80), ((168, 201, 98), 0.50)]


def draw(size: int, content: float, rounded: bool) -> Image.Image:
    s = 4  # suréchantillonnage pour des bords nets
    big = size * s
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, big, big], fill=BG)
    box = big * content
    x0 = (big - box) / 2
    y0 = (big - box) / 2
    gap = box * 0.055
    h = (box - gap * 5) / 6
    for i, (color, length) in enumerate(BARS):
        y = y0 + i * (h + gap)
        d.rounded_rectangle([x0, y, x0 + box * length, y + h], radius=h / 2, fill=color)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, 0.62, True).save(OUT / "icon-192.png")
    draw(512, 0.62, True).save(OUT / "icon-512.png")
    draw(512, 0.50, False).save(OUT / "maskable-512.png")
    draw(180, 0.60, False).convert("RGB").save(OUT / "apple-touch-icon.png")
    print("Icônes écrites dans", OUT)


if __name__ == "__main__":
    main()
