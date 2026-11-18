"""Render the profile observatory with the retained glyph atlas."""
from pathlib import Path
import hashlib

import numpy as np
from PIL import Image
import torch

from radiance import rc_batch

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'assets' / 'generative'
SIZE = 64
FRAMES = 64
START, STOP = 13, 50
Y, X = np.mgrid[:SIZE, :SIZE]
RNG = np.random.default_rng(98617)
ATLAS_FILE = HERE / 'glyphs.npz'
with np.load(ATLAS_FILE) as data:
    ATLAS, TAGS = data['atlas'], data['tags']


def scene():
    """Three stone arches above terraced terrain."""
    ridge = 40 + 1.7 * np.sin(X * .19) + 1.1 * np.cos(X * .41)
    ground = Y >= ridge
    arches = np.zeros_like(ground)
    for center, spring, radius in [(15, 35, 6), (32, 34, 12), (50, 35, 7)]:
        distance = np.hypot(X - center, np.minimum(Y - spring, 0))
        arches |= (abs(distance - radius) <= 1.25) & (Y < 42)
    joints = arches & ((Y + X // 4) % 5 == 0)
    grid = ground & (((Y - 40) % 3 == 0) | (
        abs(((X - 32) * 3 / np.maximum(Y - 36, 1)) % 5 - 2.5) < .22))
    stars = (Y < ridge) & (RNG.random(X.shape) < .018)
    pigment = np.full((*X.shape, 3), [8., 14., 23.])
    pigment[ground] = [21, 32, 43]
    pigment[grid] = [44, 63, 80]
    pigment[stars] = [57, 71, 98]
    pigment[arches] = [83, 91, 114]
    pigment[joints] = [114, 121, 146]
    opacity = .075 + .18 * ground + 1.1 * arches
    return opacity.astype('float32'), pigment, arches


def light(phase):
    """Orbit three compact emitters through the fixed occupancy field."""
    emission = np.zeros((3, SIZE, SIZE), dtype='float32')
    for center, height, span, offset, color in [
        (15, 34, 4, -.8, [100, 240, 248]),
        (32, 32, 9, 0., [240, 48, 136]),
        (50, 34, 5, .9, [95, 124, 224]),
    ]:
        angle = phase + offset
        dx = X - (center + span * np.cos(angle))
        dy = Y - (height + span * .7 * np.sin(angle))
        spot = np.exp(-(dx**2 + dy**2) / 1.45)
        emission += np.asarray(color, dtype='float32')[:, None, None] * spot
    return emission


def render():
    torch.set_num_threads(2)
    opacity, pigment, arches = scene()
    groups = RNG.permutation(len(ATLAS) // 4)
    glyph_group = np.resize(groups, X.shape)
    density = np.where(arches, 3, np.where(Y >= 40, 1 + (X + Y) % 2, (X + Y) % 2))
    glyphs = glyph_group * 4 + density
    masks = ATLAS[glyphs[START:STOP]]
    height, width = (STOP - START) * 11, SIZE * 8
    masks = masks.transpose(0, 2, 1, 3).reshape(height, width, 1)
    assert len(set(TAGS[glyphs[START:STOP]].flat)) == len(set(TAGS))
    sigma = torch.from_numpy(opacity).expand(3, 1, SIZE, SIZE)
    frames = []
    with torch.inference_mode():
        for index in range(FRAMES):
            emission = light(index * np.pi * 2 / FRAMES)
            transport = rc_batch(sigma, torch.from_numpy(emission[:, None]), air=.028)
            illumination = transport.numpy().transpose(1, 2, 0) * 4.1
            rgb = pigment + illumination + emission.transpose(1, 2, 0) * .65
            rgb = rgb[START:STOP].repeat(11, 0).repeat(8, 1)
            # A dark substrate keeps the terraces legible between glyph strokes.
            image = np.clip(rgb * (.055 + .945 * masks), 0, 255).astype('uint8')
            frames.append(Image.fromarray(image))
    poster = frames[0]
    poster.save(OUT / 'observatory.png', optimize=True)
    samples = frames[::8]
    sheet = Image.new('RGB', (width, height * len(samples)))
    for index, frame in enumerate(samples):
        sheet.paste(frame, (0, index * height))
    palette = sheet.quantize(colors=96)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    path = OUT / 'observatory.gif'
    indexed[0].save(path, save_all=True, append_images=indexed[1:],
                    duration=90, loop=0, optimize=True)
    print(path.stat().st_size, hashlib.sha256(path.read_bytes()).hexdigest())


if __name__ == '__main__':
    render()
