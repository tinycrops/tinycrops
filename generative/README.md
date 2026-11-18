# Moving worlds

Requested by Ath on 2026-11-18: "i want more generative gifs on this page" (github.com/tinycrops).

Three new procedural structures: a traveling wave surface, a periodically deforming torus knot, and a flock of 180 glyph wings following closed trajectories. The camera is fixed. The background constructs distant ridges and a perspective ground independently of the foreground. These are authored equations, not trained behavior or fluid/flocking simulations. No inference, blur, glow, crossfade, or proof-chain claim.

Run with Python 3, NumPy and Pillow:

```sh
python3 generative/render.py --smoke
python3 generative/render.py
```

On Ath's cluster, submit rendering through jobq:

```sh
jobq submit --name profile-gifs --kind cpu --est 2 --why "render profile glyph worlds" -- python3 generative/render.py
```

Outputs: three 800 x 550 GIFs with 72 frames, 80 ms per frame (5.76 seconds), looping forever. The first frame is not duplicated at the end. The geometry is periodic over 2 pi. Glyph cells are 8 x 11 pixels; foreground samples compete for cells by depth. Each loop uses a fixed 96-color palette sampled from three phases, with no dithering during GIF encoding.

`glyphs.npz` retains 624 masks: four density choices from each of the 156 usable tags in the shared 13,218-glyph atlas. It also retains the original character and style identifiers. Original cluster source: `mosaic-spaces/grow/smooth-c4-5/source.npz` and its `glyph-repertoire.npz`. Characters are visual material, not meaningful multilingual prose. Density choices target mean ink of .08, .15, .24 and .36. Foreground glyph identities persist through time; backgrounds use a separate deterministic mixture. The manifest records actual visible foreground style coverage across each loop.

The bundled masks make reproduction independent of local font installations. All new source and masks are retained alongside the GIFs. Rendering: Codex on Ath's 7a72, CPU through jobq; no paid compute.
