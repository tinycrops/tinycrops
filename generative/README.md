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

## Radiance Observatory

A fixed landscape of three glyph arches and terraced ground, with cyan,
magenta and blue emitters on periodic orbits. The 2D radiance solver integrates
emission and absorption in increasing distance intervals, with coarser probes
and finer angular sampling farther from each cell. The static opacity field
includes the arches and ground. The display adds direct emission to the
transported light, then samples the result through crisp glyph masks. The
terrain and motion are authored. This is 2D emissive transport with absorption,
without a surface-reflection pass.

`radiance.py` adapts the cluster solver in
`ngpt-seeds/foundry/asciisolve/lens/fallrc.py` to accept the input tensor's
device. `observatory.py` runs it on CPU for each of the three color channels.
The output uses a 64 × 64 transport grid, a 512 × 407 cropped display,
64 frames at 90 ms each, and the atlas above. The seeded layout places all
156 available style groups in the cropped view. The PNG shows frame zero.

Reproduce with Python, PyTorch, NumPy and Pillow:

```sh
python3 generative/observatory.py
```

On 7a72 this render used CPU queue job 5779.

## Tidal Weave in profile dither

The monochrome edition reuses Tidal Weave's periodic 3D geometry and mixed-script
atlas. It converts the scene to black and white using the profile's
avatar-inspired screen: stationary irregular thresholds from seed 13264408
plus vertical striping with a three-pixel period. The landscape is the
independently constructed terrain from the original renderer.

Run `python3 generative/avatar_dither.py` with Python, NumPy and Pillow.
The output is an 800 × 550 GIF with 64 frames at 90 ms each and a still
for reduced motion. The profile quote is from Ath's November 16, 2026
background-construction note in the cluster's mixed ASCII style guide.

## Folding Gate

Four ribbed sectors of a glyph ring separate and hinge along alternating
directions. The camera holds its position above a terraced landscape.
A stationary avatar-inspired threshold screen converts each frame to two
colors. The terrain has its own ridge, contour courses and contact shadow.
The geometry is procedural and the render uses the same retained glyph atlas.

Run `python3 generative/folding_gate.py` with Python, NumPy and Pillow.
It writes a 64-frame, 5.76-second GIF and a still for reduced motion.

## Ink Crawler

A monochrome study of the cluster's Web Crawlers silhouette. The slim
outlined torso, segmented meter, joint markers and eight articulated legs
are drawn from authored periodic motion. A moving shadow changes the ink
target of the separate terrain. The cluster's PA2 glyph selector chooses
the marks for that terrain, with 145 style groups selected over the loop,
and the avatar-inspired dither converts the composition to black and white.
The profile assets are a 64-frame, 5.76-second GIF and a still.
