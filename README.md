# createImageBitmap resize-quality comparison

This repository compares browser implementations of
[`createImageBitmap()`](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-createimagebitmap)
when a large image is resized with `resizeQuality` set to `pixelated`, `low`,
`medium`, or `high`.

The test resizes a lossless source image from 2048×1536 to 256×192. A separate
Node script generates the canonical source; the HTML page identifies that file
by its SHA-256 but also processes other 2048×1536 PNGs. The interactive page
shows every browser output, magnified views, and difference maps. Each recorded
browser directory contains the native output PNGs.

## Run the test

1. Open [index.html](index.html) in a browser. No server or external assets are
	 required.
2. Select `Choose source PNG` and open [original.png](original.png), or another
	 2048×1536 PNG.
3. Wait until the outputs appear.
4. Use `Download PNG` on each result to retain the native output.

The page runs a Canvas `drawImage()` control with `imageSmoothingQuality =
"high"` in addition to the four `createImageBitmap()` modes. Only the native
generated and resized outputs are downloadable; the rest of the evidence
remains visible as HTML and CSS.

## Generate the source

The checked-in source is generated outside the browser:

```sh
npm ci
npm run generate-source
```

The generator requires Node.js 20.9 or later. The lockfile pins Sharp and its
libvips-backed encoder. The script encodes `original.png` from an RGB pixel
buffer with explicit PNG settings and verifies the encoded bytes before writing
them. If platform math or encoding differs, generation fails without replacing
the canonical file. The checked-in file was generated on macOS arm64 with Node
25.9.0 and Sharp 0.35.4.

## Recorded browsers

The results were generated on macOS on 2026-09-18 with Playwright CLI. The
browser versions were reported by the test page during each run.

| Directory | Browser reported by the test | Runtime |
| --- | --- | --- |
| [results/chrome](results/chrome) | Chrome 153.0.0.0 | Installed Google Chrome |
| [results/firefox](results/firefox) | Firefox 153.0 | Playwright Firefox 153.0, build 1539 |
| [results/safari](results/safari) | Safari 26.5 | Playwright WebKit 26.5, build 2342 |
| [results/edge](results/edge) | Microsoft Edge 128.0.0.0 | Installed Microsoft Edge |

Playwright WebKit uses the WebKit engine and a Safari-like user agent, but it
is not the installed Safari application. Its output should be treated as a
WebKit result and confirmed in shipping Safari before making a Safari-specific
claim.

The repository contains one canonical source image, [original.png](original.png).
Its SHA-256 is:
`70e42a65fb07b5b6235058e9e94474fadb4bb68b66e5f9ef38e57fb3a173aa28`.

Each browser directory contains:

- `cib-pixelated.png`, `cib-low.png`, `cib-medium.png`, and `cib-high.png`: the
	native 256×192 `createImageBitmap()` results.
- `area-average.png`: the exact 8×8 area-average diagnostic reference.
- `canvas-high.png`: the native 256×192 Canvas `drawImage()` control.

The individual 256×192 files in this recorded dataset were downloaded directly
from the interactive page during the Playwright runs listed above.

The decoded RGB SHA-256 is:
`29e358cbdacebd4ae70b18e259cb367b3031ea7403ebdabac72dc78798fe01d9`.

## Results

Each cell below is `MAE / max / >12`, measured against the exact 8×8
area-average reference:

- `MAE` is the mean absolute per-channel RGB difference across the image. Its
	range is 0 (identical) to 255.
- `max` is the largest absolute difference found in any single RGB channel.
- `>12` is the percentage of pixels whose mean RGB difference exceeds 12.

| Resize path | Chrome 153 | Firefox 153 | WebKit 26.5 | Edge 128 |
| --- | ---: | ---: | ---: | ---: |
| `createImageBitmap: pixelated` | 55.71 / 214 / 69.7% | 55.71 / 214 / 69.7% | 55.82 / 214 / 69.8% | 55.71 / 214 / 69.7% |
| `createImageBitmap: low` | 29.97 / 177 / 50.6% | 29.97 / 177 / 50.6% | 29.98 / 177 / 50.6% | 29.97 / 177 / 50.6% |
| `createImageBitmap: medium` | 0.88 / 2 / 0.0% | 6.59 / 58 / 18.0% | 0.94 / 8 / 0.0% | 0.88 / 2 / 0.0% |
| `createImageBitmap: high` | 0.88 / 2 / 0.0% | 6.59 / 58 / 18.0% | 29.98 / 177 / 50.6% | 34.44 / 191 / 53.4% |
| `Canvas drawImage: high` | 0.25 / 2 / 0.0% | 30.06 / 177 / 50.6% | 6.55 / 57 / 17.4% | 34.48 / 191 / 53.4% |

Target-specific diagnostics below are `alias RMSE / edge FWHM / ring`:

- `alias RMSE` is per-channel RGB root mean square error from the area-average
	reference in the first five top-right checker bands. Their source periods are
	above the destination Nyquist limit, so lower values indicate less false
	detail relative to the reference.
- `edge FWHM` is the full width at half maximum, in destination pixels, of a
	supersampled red-minus-cyan chroma profile across the diagonal red stripe.
	Lower values indicate a narrower edge response.
- `ring` is the largest 8-bit chroma excursion outside the source profile's
	0–190 range. Higher values indicate stronger overshoot or undershoot. Edge
	FWHM and ringing should be read together because ringing can make the measured
	edge narrower without preserving more useful detail.

| Resize path | Chrome 153 | Firefox 153 | WebKit 26.5 | Edge 128 |
| --- | ---: | ---: | ---: | ---: |
| `createImageBitmap: pixelated` | 114.56 / 1.29 / 0.0 | 114.56 / 1.29 / 0.0 | 114.43 / 1.29 / 0.0 | 114.56 / 1.29 / 0.0 |
| `createImageBitmap: low` | 48.61 / 1.29 / 0.0 | 48.61 / 1.29 / 0.0 | 48.61 / 1.29 / 0.0 | 48.61 / 1.29 / 0.0 |
| `createImageBitmap: medium` | 1.15 / 1.31 / 0.0 | 7.68 / 1.27 / 15.2 | 0.50 / 1.32 / 0.0 | 1.15 / 1.31 / 0.0 |
| `createImageBitmap: high` | 1.15 / 1.31 / 0.0 | 7.68 / 1.27 / 15.2 | 48.61 / 1.29 / 0.0 | 52.53 / 1.29 / 5.5 |
| `Canvas drawImage: high` | 0.26 / 1.31 / 0.0 | 48.62 / 1.29 / 0.0 | 7.68 / 1.27 / 14.8 | 52.53 / 1.29 / 5.5 |

The area-average reference measures `0.00 / 1.31 / 0.0` in every browser.

Downloaded PNG sizes, in KiB:

| Resize path | Chrome 153 | Firefox 153 | WebKit 26.5 | Edge 128 |
| --- | ---: | ---: | ---: | ---: |
| `createImageBitmap: pixelated` | 73.8 | 74.7 | 72.0 | 68.2 |
| `createImageBitmap: low` | 75.2 | 77.7 | 80.3 | 72.1 |
| `createImageBitmap: medium` | 77.9 | 94.4 | 89.3 | 75.9 |
| `createImageBitmap: high` | 77.9 | 94.4 | 80.3 | 77.5 |

These sizes describe each browser's subsequent Canvas PNG encoding, not the
size of an `ImageBitmap`, which is not a compressed file. `resizeQuality`
controls the resampling preference rather than an encoder quality setting, so a
lower value does not guarantee a smaller download. File size also reflects how
compressible the resulting pixels are and browser encoding differences such as
RGB versus RGBA output.

The most visible interoperability difference is the handling of `high`.
Chrome produces the same near-reference result for `medium` and `high`.
Firefox also produces the same result for both, but with more error. WebKit's
`medium` result is near the reference while `high` is worse. Edge 128's
`medium` result is near the reference while `high` has severe aliasing and is
also substantially worse.

These numbers describe the recorded outputs. They are not conformance scores.
The HTML standard defines the quality values as preferences and does not
require a specific resampling filter or exact pixels. Even so, the names imply
an ordering: users reasonably expect `medium` not to be worse than `low`, and
`high` not to be worse than `medium` within the same browser. It is also
reasonable to expect one browser's `high` result not to be substantially worse
than another browser's `medium` result. The reversals shown here are therefore
meaningful interoperability evidence even though they are not strict
conformance failures.

## Why the source looks like this

The source is a synthetic diagnostic chart rather than a photograph. A photo
can make poor resizing look subjectively unpleasant, but it does not reveal
which spatial frequencies or edge cases caused the failure. It can also add
image-decoder, color-profile, and source-file differences. The generator writes
the chart pixel by pixel into an RGB buffer. Every browser receives the same
checked-in PNG, and the page verifies the file before resizing it.

The 2048×1536 source is reduced by exactly 8:1 in each dimension. That permits
an unambiguous reference: each destination pixel is the arithmetic mean of one
non-overlapping 8×8 source block. The reference is useful for exposing
aliasing and lost energy, but it is not presented as the only valid high-quality
resampling algorithm.

The six regions stress different failure modes:

- Top left: a radial zone plate whose spatial frequency increases toward the
	outside. It makes aliasing, moiré patterns, and inadequate low-pass filtering
	visible across many frequencies in one region.
- Top center: a 72-spoke Siemens star with fine concentric modulation. It tests
	angular detail, directional bias, ringing, and how detail collapses around a
	common center.
- Top right: checkerboards with 1, 2, 3, 4, 6, 8, 12, and 16-pixel periods and
	changing RGB phases. They place known content below, around, and above the
	destination Nyquist limit, exposing false patterns and color artifacts.
- Bottom left: slanted monochrome stripes at several prime-number periods plus
	a narrow red diagonal edge. Non-axis-aligned geometry reveals stair-stepping,
	edge blur, phase sensitivity, and ringing more readily than a square grid.
- Bottom center: deterministic noise, waves, and vein-like detail. This behaves
	more like natural photographic texture while remaining exactly reproducible,
	showing whether a filter smears or invents fine detail.
- Bottom right: saturated color stripes whose width changes vertically and
	whose contrast changes horizontally. This exposes chroma bleeding, color
	mixing, and differences between treatment of luminance and color detail.

Black and white separators provide additional abrupt transitions where halos,
bleeding, or edge displacement are easy to see. The page displays each 256×192
output at native size and at 3× zoom using nearest-neighbor scaling, so the
inspection view does not introduce another smoothing filter. The page's
heatmap amplifies each absolute RGB channel error by 8× to make small
differences visible.