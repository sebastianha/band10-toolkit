# Authoring reference

## Folder structure

```text
face-name/
├── manifest.json
├── layout.json
└── assets/
    ├── digits-large/
    ├── digits-small/
    ├── weather/
    ├── battery/
    ├── icons/
    └── progress/
```

Build output is disposable. Commit `manifest.json`, `layout.json`, and source assets; ignore `build/` and `dist/`.

## Manifest

Important fields:

| Field | Rule |
|---|---|
| `formatVersion` | currently `1` |
| `id` | exactly nine ASCII digits; choose a project-unique value |
| `name` | 1–60 bytes/characters; firmware header reserves 60 bytes |
| `device` | `xiaomi-smart-band-10` |
| `preview` | `generated` or a project-relative image |
| `output` | safe base filename |
| `compiler.target` | `native`, `mi-create`, or `mi8-tool` |
| `imageCompression` | normally `true` |

## Coordinate system

```text
(0,0) ─────────────────────► x (212)
  │
  │            center x = 106
  │
  ▼ y (520)
```

Coordinates and dimensions are integer pixels. Negative X/Y are legal for intentional clipping, but the validator warns. For number widgets, X is an anchor selected by `align`.

`z` is a toolkit source-order abstraction. Lower z is emitted/drawn first; higher z appears on top. The runtime does not store the toolkit's z label.

The validator calculates each visible widget's pixel bounds, including aligned digital numbers and unit images, then reports `WIDGET_OVERLAP` when rectangles intersect. Keep data and decoration in separate lanes. Set `allowOverlap: true` only for deliberate layering such as a transparent background frame; the inspector exposes this as **Intentional overlap**. Edge-touching widgets are not considered overlapping.

## Asset naming

Source paths can be descriptive. Staged files become `<safe-stem>-<10-char-source-hash>.png`, preventing collisions between folders while keeping output debuggable.

Recommended source names:

- `digits-large/0.svg` … `9.svg`, `minus.svg`;
- `battery/0.svg`, `20.svg`, `50.svg`, `80.svg`, `100.svg`;
- `weather/clear.svg`, `cloudy.svg`, `rain.svg`, `snow.svg`, `unknown.svg`;
- `animation/pulse-00.svg`, `pulse-01.svg` with zero-padded order.

Do not encode binary resource indices such as `image_0007` in canonical source names. Exporters own indices.

## Image widget

```json
{
  "id": "heart-icon",
  "type": "image",
  "asset": "assets/icons/heart.svg",
  "x": 26,
  "y": 458,
  "z": 12,
  "allowOverlap": false
}
```

FPRJ Shape 30; GMF `element`; binary base element → type-2 image definition.

## Digital number

```json
{
  "id": "heart-value",
  "type": "number",
  "source": "heartRate",
  "digitSet": "small",
  "digits": 3,
  "align": "left",
  "spacing": 2,
  "leadingZero": false,
  "x": 66,
  "y": 457,
  "z": 13
}
```

Digit sets contain ten equal-size glyphs and one minus glyph. A `unitAsset` appends `%`, `°C`, etc. In FPRJ, a unit image is exported with the community `_ref[widget]` convention.

The runtime does not package a TTF for these widgets. Generate sprites from fonts at source-build time. Check the font's redistribution/embedding terms even if only raster output ships.

## Image list

```json
{
  "id": "battery-icon",
  "type": "image-list",
  "source": "battery",
  "fallback": "floor",
  "items": [
    { "value": 0, "asset": "assets/battery/0.svg" },
    { "value": 20, "asset": "assets/battery/20.svg" },
    { "value": 50, "asset": "assets/battery/50.svg" },
    { "value": 80, "asset": "assets/battery/80.svg" }
  ],
  "x": 50,
  "y": 37,
  "z": 1
}
```

All images must have identical dimensions. `floor` models the community-observed firmware behavior: use the greatest mapped value ≤ current value, falling back to the lowest map entry. `exact` renders nothing if absent in preview; test firmware defaults separately.

## Weather icons

The condition enum has gaps. Practical grouping:

| Group | Known IDs |
|---|---|
| clear/cloud | 0 clear, 1 cloudy, 2 overcast |
| rain | 3–12, 21–25, 301 |
| snow/ice | 6, 13–17, 19, 26–28, 33 |
| fog/haze | 18, 32, 49, 53–58 |
| dust/sand | 20, 29–31 |
| unknown | 99 |

Because `floor` grouping follows numeric order rather than semantic categories, add explicit entries when a later code should not inherit a prior category. For production weather art, map every known code or deliberately test each fallback.

## Progress bars and arcs

```json
{
  "id": "steps-progress",
  "type": "progress",
  "source": "stepProgress",
  "maximum": 100,
  "shape": "bar",
  "width": 120,
  "height": 6,
  "thickness": 6,
  "foreground": "assets/progress/foreground.svg",
  "background": "assets/progress/background.svg",
  "x": 66,
  "y": 429,
  "z": 11
}
```

The browser clips the foreground by the simulated ratio. FPRJ exports Shape 42. Native `widge_process` packing is reverse-engineered and marked experimental because property bytes beyond source/resource references remain poorly documented. Always compare against a known compiler and test hardware.

## Animation

```json
{
  "id": "pulse",
  "type": "animation",
  "frames": [
    "assets/animation/pulse-00.svg",
    "assets/animation/pulse-01.svg"
  ],
  "intervalMs": 500,
  "repeat": 0,
  "x": 90,
  "y": 400,
  "z": 20
}
```

Rules:

- at least two frames;
- equal dimensions;
- minimum toolkit interval 16ms, but much slower is prudent;
- `repeat: 0` follows the community looping convention;
- avoid animations in AOD;
- avoid full-screen 20–60 FPS content on this low-power device.

## AOD

Set `aod.enabled: true` and provide an independent widget list. Reusing source assets is allowed; the build creates separate AOD resources/directories.

Design rules:

- pure black background;
- small number of static widgets;
- no seconds, animation, or large white regions;
- preview opacity can communicate expected dimming, but native runtime opacity support is incomplete—prefer appropriately dim source artwork and rely on device-level AOD dimming only after hardware testing;
- verify wake/sleep transitions and flicker on device.

## Asset formats and transparency

Input formats are those supported by Sharp. Staging outputs full RGBA PNG for deterministic compilation. The native encoder then chooses indexed palette/RLE where possible.

Transparent source files are convenient, but old community advice warns that many large transparent resources can cause installation/storage problems. Keep transparent bounds tight; do not export every icon on a 212×520 transparent artboard.

## Raw/unsupported capabilities

The research found pointers, editable groups, jumps/tap targets, JS/Lua resources, multi-style records, and unknown property bytes. They are parsed in part but are not canonical authoring features yet. Use Mi Create/EasyFace and a known source project for those features; do not guess raw bytes on a daily-wear device.
