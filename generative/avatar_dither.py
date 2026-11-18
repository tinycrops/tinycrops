"""Render Tidal Weave with the profile's avatar-inspired threshold screen."""
import numpy as np
from PIL import Image

from render import H, W, OUT, frame


def main():
    _, x = np.indices((H, W))
    rng = np.random.default_rng(13264408)
    # Retained from the profile's signature dither renderer. Keep the grain
    # stationary so it follows changes in light without flickering on its own.
    screen = .5 + .5 * np.sin(x * np.pi / 1.5)
    threshold = .12 + .74 * (.78 * rng.random((H, W)) + .22 * screen)
    frames = []
    styles = set()
    for index in range(64):
        scene, visible = frame('tidal-weave', 2 * np.pi * index / 64)
        styles.update(visible)
        peak = np.asarray(scene).max(axis=2) / 255
        tone = np.maximum(0, peak - .065) ** .7 * 1.13
        dots = (tone > threshold).astype('uint8')
        image = Image.fromarray(dots).convert('P')
        image.putpalette([0, 0, 0, 255, 255, 255])
        frames.append(image)

    frames[0].save(OUT / 'tidal-weave-dither.gif', save_all=True,
                   append_images=frames[1:], loop=0, duration=90, optimize=True)
    frames[16].save(OUT / 'tidal-weave-dither.png', optimize=True)
    print(f'{len(styles)} foreground style groups across {len(frames)} frames')


if __name__ == '__main__':
    main()
