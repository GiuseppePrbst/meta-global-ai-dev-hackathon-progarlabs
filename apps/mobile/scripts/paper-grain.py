"""Genera assets/images/paper-grain.png: tesela de grano de papel de acuarela, repetible sin costura.

Máscara en negro con alfa baja; la app la tiñe según el tema (`tintColor`). Determinista (semilla
fija) y sin dependencias: `python3 scripts/paper-grain.py`.
"""
import random
import struct
import zlib
from pathlib import Path

SIZE = 192
random.seed(20261028)


def blur(field, radius):
    # Desenfoque de caja con envoltura en los bordes: la tesela no muestra costura al repetirse.
    out = [[0.0] * SIZE for _ in range(SIZE)]
    span = (2 * radius + 1) ** 2
    for y in range(SIZE):
        for x in range(SIZE):
            total = 0.0
            for dy in range(-radius, radius + 1):
                row = field[(y + dy) % SIZE]
                for dx in range(-radius, radius + 1):
                    total += row[(x + dx) % SIZE]
            out[y][x] = total / span
    return out


noise = [[random.random() for _ in range(SIZE)] for _ in range(SIZE)]
tooth = blur(noise, 2)      # grumos del papel prensado en frío
fine = blur(noise, 1)       # textura fina
alpha = [[0] * SIZE for _ in range(SIZE)]
for y in range(SIZE):
    for x in range(SIZE):
        a = max(0.0, (tooth[y][x] - 0.52) * 9) * 0.6 + max(0.0, (fine[y][x] - 0.6) * 4) * 0.4
        alpha[y][x] = min(255, int(a * 70))
# Motas sueltas de fibra.
for _ in range(90):
    x, y = random.randrange(SIZE), random.randrange(SIZE)
    alpha[y][x] = min(255, alpha[y][x] + 60 + random.randrange(50))

raw = b''.join(b'\x00' + b''.join(struct.pack('BBBB', 0, 0, 0, a) for a in row) for row in alpha)


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)


png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
png += chunk(b'tEXt', b'Comment\x00Generado por apps/mobile/scripts/paper-grain.py (semilla 20261028). Sin fuentes externas.')
png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
out = Path(__file__).resolve().parent.parent / 'assets' / 'images' / 'paper-grain.png'
out.write_bytes(png)
print(out, len(png))
