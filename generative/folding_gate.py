"""Render Folding Gate with the profile's avatar-inspired threshold screen."""
import numpy as np
from PIL import Image

from avatar_dither import avatar_threshold
from render import BACK, OUT, U, V, XX, YY, frame


def folding_gate(_name, phase):
    """Four disconnected ring segments hinge open and return."""
    quarter = U // (np.pi / 2)
    center = (quarter + .5) * np.pi / 2
    opening = .5 - .5 * np.cos(phase)
    angle = center + .84 * (U - center)
    radius = 1.32 + .27 * np.cos(V)
    x = radius * np.cos(angle) + opening * .54 * np.cos(center)
    y = radius * np.sin(angle) + opening * .45 * np.sin(center)
    z = .29 * np.sin(V)
    hinge = (.2 + .9 * opening) * np.where(quarter % 2 == 0, 1, -1)
    z += (angle - center) * np.sin(hinge) * radius
    # Tilt the ring off-axis so the openings show depth.
    tilt = .23 * np.sin(phase)
    x, z = x * np.cos(tilt) + z * np.sin(tilt), z * np.cos(tilt) - x * np.sin(tilt)
    ribs = .68 + .32 * np.cos(angle * 18) ** 2
    light = ribs * (.56 + .44 * (.5 + .5 * np.sin(V + angle - phase)))
    return np.stack([.78 * x + .13, .78 * y + .53, z], axis=1), light


def landscape():
    ground = BACK.copy()
    ridge = 23 + 2 * np.sin(XX * .085) + 1.2 * np.cos(XX * .19)
    courses = (YY > ridge) & ((YY - 24) % 4 == 0)
    ground[courses] *= 1.85
    shadow = np.exp(-(((XX - 50) / 24) ** 2 + ((YY - 37) / 3) ** 2))
    ground *= 1 - .68 * shadow[..., None]
    return ground


def main():
    threshold = avatar_threshold()
    background = landscape()
    frames = []
    styles = set()
    for index in range(64):
        scene, visible = frame('folding-gate', 2 * np.pi * index / 64,
                               surface=folding_gate, background=background)
        styles.update(visible)
        peak = np.asarray(scene).max(axis=2) / 255
        tone = np.maximum(0, peak - .065) ** .7 * 1.13
        dots = (tone > threshold).astype('uint8')
        image = Image.fromarray(dots).convert('P')
        image.putpalette([0, 0, 0, 255, 255, 255])
        frames.append(image)

    frames[0].save(OUT / 'folding-gate.gif', save_all=True,
                   append_images=frames[1:], loop=0, duration=90, optimize=True)
    frames[12].save(OUT / 'folding-gate.png', optimize=True)
    print(f'{len(styles)} foreground style groups across {len(frames)} frames')


if __name__ == '__main__':
    main()
