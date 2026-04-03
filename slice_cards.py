
from PIL import Image
import os

Image.MAX_IMAGE_PIXELS = None

SRC = r'C:\Users\Andrés\Desktop\Cartas_Tatú_50.png'
OUT = r'assets/cards'
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert('RGBA')
w, h = img.size
print(f'Image size: {w} x {h}')

# --- Find row separators (horizontal dark bands) ---
def row_is_separator(y, threshold=0.90):
    dark = sum(1 for x in range(0, w, 4) if img.getpixel((x, y))[3] < 20 or all(c < 30 for c in img.getpixel((x, y))[:3]))
    return dark / (w / 4) > threshold

rows = []
in_card = False
start = 0
for y in range(h):
    sep = row_is_separator(y)
    if not sep and not in_card:
        in_card = True
        start = y
    elif sep and in_card:
        in_card = False
        rows.append((start, y))
if in_card:
    rows.append((start, h))

print(f'Found {len(rows)} card rows: {[(r[1]-r[0]) for r in rows]}px tall')

# --- Find column separators within each row ---
def col_is_separator(x, y1, y2, threshold=0.90):
    dark = sum(1 for y in range(y1, y2, 4) if img.getpixel((x, y))[3] < 20 or all(c < 30 for c in img.getpixel((x, y))[:3]))
    return dark / ((y2 - y1) / 4) > threshold

suits = ['Espada', 'Basto', 'Oro', 'Copa']

for row_idx, (y1, y2) in enumerate(rows[:4]):
    cols = []
    in_card = False
    start = 0
    for x in range(w):
        sep = col_is_separator(x, y1, y2)
        if not sep and not in_card:
            in_card = True
            start = x
        elif sep and in_card:
            in_card = False
            cols.append((start, x))
    if in_card:
        cols.append((start, w))

    print(f'Row {row_idx} ({suits[row_idx] if row_idx < 4 else "?"}): {len(cols)} cards')

    # Expected: 12 normal + 1 extra (back/comodin) = 13 per row
    # Or some rows have 13
    for col_idx, (x1, x2) in enumerate(cols):
        card_img = img.crop((x1, y1, x2, y2))
        # Resize to consistent size
        card_img = card_img.resize((100, 155), Image.NEAREST)

        if row_idx < 4 and col_idx < 12:
            name = f'{suits[row_idx]}_{col_idx + 1}.png'
        elif col_idx == 12:
            if row_idx == 0: name = 'back_blue.png'
            elif row_idx == 1: name = 'comodin.png'
            elif row_idx == 2: name = 'blank.png'
            elif row_idx == 3: name = 'back_red.png'
            else: name = f'extra_{row_idx}.png'
        else:
            name = f'card_{row_idx}_{col_idx}.png'

        card_img.save(f'{OUT}/{name}')

print('Done! Cards saved to', OUT)
