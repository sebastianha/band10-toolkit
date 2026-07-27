# Xiaomi Smart Band 10 watch-face research

Research cut-off: **2026-07-14**. “Official” means published by Xiaomi. “Reverse engineered” means community observation, source-code analysis, or this toolkit's reproducible binary inspection. Xiaomi has not published a Band 10 runtime-format specification.

## Executive findings

1. The Band 10 (`o66`, application/model identifier `miwear.watch.o66`) uses a custom little-endian binary watch-face format with magic bytes `5A A5 34 12`.
2. `.face` and `.bin` are filename conventions for the same raw runtime binary, not different containers. Mi Create explicitly says to rename `.FACE` to `.bin` for other services.
3. The runtime binary is not a ZIP and is not encrypted as a whole. Its header contains plaintext ID/name fields and parseable section tables. Bitmap payloads can use palette/RLE compression.
4. Mi Fitness store downloads can add an outer delivery bundle around `resource.bin`; community evidence describes ZIP metadata such as `description.xml` and `resources/manifest.xml`. That delivery envelope is separate from the installable runtime binary.
5. The practical authoring formats are EasyFace `.fprj` XML and GMF `wfDef.json`. Both are community formats consumed by reverse-engineered or closed third-party compilers—not official Xiaomi public SDK contracts.
6. Band 10's screen is **212×520**. Xiaomi officially documents roughly **20 MB** reserved for faces and at most **nine downloaded market faces**, in addition to eight preinstalled faces.
7. AOD is represented as separate face content/resources. In FPRJ it is a nested `AOD/` project; in GMF it is `elementsAod` plus `images_aod`; in the binary it is another face record.
8. No public official Band 10 store-submission API or package-signing specification was found. Full custom-face installation remains a community workflow.

## Reproducible sample inspection

Two independent, publicly shared Band 10 artifacts were inspected byte-for-byte:

| Artifact | Source | Size | SHA-256 | First bytes | Plaintext header |
|---|---|---:|---|---|---|
| `sunny.face` | [mb10-goodies](https://gitlab.com/mateusznowakdev/mb10-goodies) | 2,412,888 | `64a5a298e52ee4d37d8be737912a141bab86ff43ddf101b39b2d8c10c7bab7b1` | `5A A5 34 12` | ID `176902391`, name `Sunny` |
| `pill-dial-v01-mb10-en.bin` | [pill-dial-smart-band-10](https://github.com/elfimov-design/pill-dial-smart-band-10) | 4,581,124 | `bc2695c9bd010a2418475046f66613dc9105c863ab57adbb2135ca5ed3bee7f3` | `5A A5 34 12` | ID `000000000`, name `Pill Dial` |

The samples use different extensions but the same binary magic/header family. The community `Mi8WfBinTool` currently throws while unpacking both valid samples, which is why this toolkit does not claim that third-party parser is complete.

## Answers to the twelve format questions

### 1. What file format does Band 10 use?

**Answer:** a proprietary, sectioned binary. The device profile is `o66`; FPRJ identifies Band 10 as `DeviceType="466"`. The binary starts with `5A A5 34 12`. Installers commonly call it `.face` or `.bin`.

**Example:** `sunny.face` and `pill-dial-v01-mb10-en.bin` above both start with the same magic. Mi Create's testing guide says its output is `.FACE` and should be renamed to `.bin` for another service.

**Status:** reverse engineered / community empirical.

**Sources:** [Mi Create testing](https://ooflet.github.io/docs/quickstart/testing/), [Mi8WfBinTool format notes](https://github.com/zhy8388608/Mi8WfBinTool), [Band 10 creation article](https://mateusznowak.dev/articles/designing-watchfaces-xiaomi-band-10), public samples linked above.

### 2. What is inside a watch-face package?

The **runtime binary** contains:

- a `0xA8`-byte main header;
- one or more `0x58`-byte face headers;
- 16-byte definition entries mapping indices/types to offsets and lengths;
- base element properties (including coordinates and referenced resource type/index);
- widget, animation, editable, jump, and optional JS/Lua property blocks;
- preview image block(s);
- deduplicated single-image, image-list, and optional script resource blocks.

An **outer Mi Fitness delivery download** can instead be a ZIP-like store bundle containing a compiled `resource.bin`, metadata XML/JSON, and preview material. `resource.bin` is the runtime face. Do not treat the store envelope and runtime binary as the same format.

**Example binary order:** header → face headers → definitions → properties → preview → normal resources → AOD definitions/properties/resources.

**Status:** runtime structure reverse engineered; outer bundle names community-observed.

**Sources:** [Mi8WfBinTool README/code](https://github.com/zhy8388608/Mi8WfBinTool), [Mi Create discussion #32](https://github.com/ooflet/Mi-Create/discussions/32), [Mi Create's incomplete Xiaomi project parser](https://github.com/ooflet/Mi-Create/blob/main/src/utils/project.py).

### 3. Is it compressed?

**Answer:** not as a whole-file archive. Individual image payloads can be compressed.

Modern `mi8pro`-family resources use a 12-byte image header and may wrap compressed data with `E0 21 A5 5A`, followed by a little-endian word encoding raw length and bytes-per-pixel. Community code identifies older fixed-pixel RLE and a palette/index RLE v2. Band 10 `o66` is mapped to this modern family.

**Example:** the toolkit's native package writes 256-entry BGRA palettes for ≤256-color assets and RLE v2 index streams; larger-color assets use BGRA32 plus fixed-pixel RLE. The packaged example round-tripped a 212×520 preview, eight single resources, seven image lists, and 216,648 decoded pixels.

**Status:** reverse engineered and locally tested; on-device acceptance still requires hardware verification.

**Sources:** [Mi8WfBinTool image/RLE implementation](https://github.com/zhy8388608/Mi8WfBinTool), `parser/rle.ts`, `parser/imageCodec.ts` in this repository.

### 4. Is it encrypted?

**Answer:** the sampled runtime watch-face binaries are **not whole-file encrypted**. IDs/names are plaintext, section offsets are readable, and image data can be decoded without a key. No signature block was identified in the samples.

This does **not** prove every Mi Fitness store envelope or future firmware accepts unsigned content. Xiaomi's official FAQ mentions legality/encryption verification for **firmware updates**, not watch faces; that statement must not be generalized to faces. Companion authentication and BLE session encryption are separate from file encryption.

**Status:** “not encrypted in sampled runtime binaries” is reverse-engineered high confidence. Signing requirements for all channels/regions remain unknown.

**Sources:** public samples above, [Xiaomi Band 10 FAQ](https://www.mi.com/global/support/faq/details/KA-579104), [Gadgetbridge Xiaomi protocol implementation](https://codeberg.org/Freeyourgadget/Gadgetbridge).

### 5. What metadata files exist?

There are three distinct layers:

| Layer | Files/fields | Meaning |
|---|---|---|
| Runtime binary | ID at `0x28`, name at `0x68`, face/style counts, preview offsets | What firmware reads |
| Community authoring | `.fprj` XML or `wfDef.json`; nested AOD project/resources | What EasyFace/Mi Create/GMF tools edit |
| Mi Fitness delivery | reported `description.xml`, `resources/manifest.xml`, `resource.bin`, preview assets | Store/cache envelope; incomplete public schema |
| This toolkit | `manifest.json`, `layout.json` | Open canonical source only; not Xiaomi metadata |

**Example FPRJ root:** `FaceProject DeviceType="466" Id="260714010"`, then `Screen` and ordered `Widget` elements.

**Status:** binary/authoring layers reverse engineered; delivery names community-observed. Toolkit files are explicitly project-local conventions.

**Sources:** [Mi Create project formats](https://ooflet.github.io/docs/quickstart/intro/), [Mi Create source](https://github.com/ooflet/Mi-Create), [discussion #32](https://github.com/ooflet/Mi-Create/discussions/32).

### 6. How are assets stored?

Authoring tools use ordinary PNG files in `images/` and AOD PNGs in `AOD/images/` or `images_aod/`. The compiler converts these into custom image blocks.

Image-block header fields observed by the community:

| Offset | Meaning |
|---:|---|
| `+0x00` | encoding/sign (`0x10` commonly indexed 256-color; other values denote RGB565/BGRA variants) |
| `+0x01` | single-image flags or image-list count |
| `+0x02` | compression mode/flag for lists |
| `+0x04` | width, `u16le` |
| `+0x06` | height, `u16le` |
| `+0x08` | payload length, `u32le` |

Image lists require equal dimensions and are stored as one resource plus per-frame payload lengths when compressed. Resource definitions point to block offsets; identical resources can be deduplicated.

**Status:** reverse engineered.

**Sources:** [Mi Create image documentation](https://ooflet.github.io/docs/widgets/image/), [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool), local codec implementation/tests.

### 7. How are widgets defined?

FPRJ uses XML `Widget` records identified by numeric `Shape`:

- `30`: static image;
- `31`: image list (or animation via a naming convention);
- `32`: digital number;
- `27`: analog display;
- `42`: circular progress (community modern form);
- `34`: container used by Lua/watch-app payloads.

GMF uses JSON types such as `element`, `element_anim`, `widge_dignum`, `widge_imagelist`, `widge_pointer`, and `widge_process`.

In the binary, base elements reference typed definitions. Type `7` points at widget properties, type `4` animation, type `2` image, type `3` image-list resource, type `5` script, type `8` editable data, and type `9` jump/tap data.

**Example digital number:** source `0811` (hour), digit count 2, alignment, spacing, leading-zero flag, and an image-list definition for digit sprites.

**Status:** reverse engineered.

**Sources:** [Mi Create source/project implementation](https://github.com/ooflet/Mi-Create/blob/main/src/utils/project.py), [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool).

### 8. How are coordinates stored?

The canvas is 212×520 with origin `(0,0)` at the top-left. `x` increases rightward and `y` downward. FPRJ stores decimal `X`/`Y` attributes. A binary base-element property is 16 bytes; `x` and `y` are little-endian 16-bit values at `+0x04` and `+0x06`. Community editors allow negative coordinates for clipping.

The digital-number `x` meaning depends on alignment: left = left edge, center = horizontal anchor, right = right edge. Draw order is element order; the toolkit's `z` is sorted into that order before export.

**Example:** `{ x: 106, y: 76, align: "center" }` centers a two-glyph hour field on Band 10's 106px midline.

**Status:** screen resolution official; coordinate serialization reverse engineered.

**Sources:** [Xiaomi product page](https://www.mi.com/global/product/xiaomi-smart-band-10), [Band 10 article](https://mateusznowak.dev/articles/designing-watchfaces-xiaomi-band-10), [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool).

### 9. How are fonts represented?

For ordinary compiled faces, typography is raster sprites—not embedded TTF/OTF fonts. A “Digital Number” needs ten digit images plus a minus image, all with identical dimensions. Weekdays/weather text are normally image lists. A TTF can be used at **authoring time** to generate those PNGs but is not packaged as the runtime font in this format.

**Example:** `assets/digits-large/0.svg`…`9.svg` are normalized to PNG, compiled into an image list, and selected by the hour/minute widget.

Lua/JS app-like faces can call device APIs or package script resources; that is a separate execution model and does not make ordinary FPRJ text a vector-font widget.

**Status:** reverse engineered / community workflow.

**Sources:** [Band 10 article's digit generator](https://mateusznowak.dev/articles/designing-watchfaces-xiaomi-band-10), [Mi Create digital number docs](https://ooflet.github.io/docs/widgets/number/).

### 10. How are animations represented?

An animation is a frame image list plus a type-4 property block. The observed block references the image-list index and stores interval (`u16le` at `+0x06`) and repeat count (`u16le` at `+0x08`). Mi Create's FPRJ-to-GMF converter encodes animation metadata in a Shape-31 name convention: `anim_<id>[<repeat>@<interval>]`.

**Example:** two frames, `intervalMs: 500`, `repeat: 0` (community convention for looping). Keep frame dimensions equal and avoid full-screen/high-FPS animation.

**Status:** reverse engineered. Exact repeat semantics should be verified per firmware.

**Sources:** [Mi Create exporter](https://github.com/ooflet/Mi-Create/blob/main/src/utils/exporter.py), [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool), [Mi Create performance guidance](https://ooflet.github.io/docs/quickstart/intro/).

### 11. How is Always-On Display defined?

The active and AOD layouts are separate content sets:

- FPRJ: `AOD/AOD.fprj` and `AOD/images/`;
- GMF: `elementsAod` and `images_aod/`;
- runtime: an additional face header/definition/property/resource sequence.

Xiaomi officially confirms AOD support, face-specific AOD styles, reduced brightness/refresh rate, and possible flicker for large lit areas. It does not document the package encoding.

**Example:** the included Carbon Signal face uses only hour, minute, date, and battery in AOD, with reduced preview opacity and a black background.

**Status:** AOD user behavior official; package representation reverse engineered.

**Sources:** [Xiaomi Band 10 FAQ](https://www.mi.com/global/support/faq/details/KA-579104), [Mi Create AOD source](https://github.com/ooflet/Mi-Create/blob/main/src/utils/project.py), [Band 10 FPRJ AOD examples](https://github.com/juzeon/mi-band-faces).

### 12. How are battery, steps, heart rate, weather, and date configured?

They are numeric firmware data-source IDs bound to number/image-list/progress widgets. The Band 10 table recovered by Mi Create is:

| Toolkit key | FPRJ/runtime source | Meaning |
|---|---|---|
| `hour` | `0811` | 0–23 |
| `minute` | `1011` | 0–59 |
| `year` | `0812` | Gregorian year |
| `month` | `1012` | 1–12 |
| `day` | `1812` | 1–31 |
| `weekday` | `2012` | Sunday 0 … Saturday 6 |
| `battery` | `0841` | 0–100 percent |
| `steps` | `0821` | current step count |
| `stepProgress` | `1021` | step-goal percentage |
| `heartRate` | `0822` | real-time/latest heart rate |
| `weatherCondition` | `3031` | Xiaomi weather state code |
| `temperatureC` | `2031` | current °C |
| `temperatureF` | `40009031` | current °F; >3-byte source is not yet supported by the native backend |

Number widgets render values with digit sprites. Image lists map discrete values to images. Community testing reports floor fallback: if exact image ID is absent, firmware decrements until it finds one. Thus battery maps at 0/20/50/80/100 and grouped weather maps are practical.

**Weather IDs:** known values include 0 clear, 1 cloudy, 7 light rain, 14 light snow, 18 fog, 53 haze, 99 no data, and 301 rain. There are gaps. Do not assume a contiguous enum.

**Status:** data IDs and fallback are reverse engineered; Xiaomi officially confirms the device displays these data categories, not these IDs.

**Sources:** [Mi Create Band 10 source table](https://github.com/ooflet/Mi-Create/blob/main/src/data/sources.json), [Band 10 article and weather table](https://mateusznowak.dev/articles/designing-watchfaces-xiaomi-band-10), [Xiaomi FAQ](https://www.mi.com/global/support/faq/details/KA-579104).

## Officially verified device constraints

From Xiaomi's Band 10 FAQ/product page:

- 212×520 AMOLED display, up to 60 Hz; AOD can drop to 5 Hz.
- More than 220 market displays; eight preinstalled.
- Up to nine downloaded market faces; deleting preinstalled faces does not increase that limit.
- Around 20 MB is reserved for face/photo-display storage.
- A normal face is approximately 0.5 MB; complex faces can be several MB.
- Custom photo backgrounds support up to eight images, but this official “Custom” feature is not a general arbitrary watch-face SDK.
- Band 10 pairs officially with Mi Fitness, not Zepp Life.

Source: [official Xiaomi Smart Band 10 FAQ](https://www.mi.com/global/support/faq/details/KA-579104).

## Confidence and unresolved questions

| Topic | Confidence | Remaining gap |
|---|---|---|
| `.face`/`.bin` runtime alias | High | Installer filename heuristics can differ |
| Magic/header/section layout | High | Some reserved bytes and named multi-style variants remain unknown |
| No whole-file encryption | High for sampled faces | Future/store-specific envelopes may differ |
| Asset RLE/palette | Medium-high | Sign variants and edge cases need a larger corpus |
| Core data-source IDs | High for community compiler table | Firmware can add/change sources |
| Progress/pointer/editable/jump properties | Medium/low by type | Several bytes remain opaque |
| Native toolkit package accepted by physical Band 10 | **Unverified** | Must be tested on actual o66 hardware/firmware |
| Official store submission/signing | Unknown | No public Band 10-specific program or format spec found |

## Primary sources

- Xiaomi official: [product page](https://www.mi.com/global/product/xiaomi-smart-band-10), [Band 10 FAQ](https://www.mi.com/global/support/faq/details/KA-579104).
- Community authoring: [Mi Create](https://github.com/ooflet/Mi-Create), [documentation](https://ooflet.github.io/docs/), [EasyFace](https://github.com/m0tral/EasyFace).
- Reverse engineering: [Mi8WfBinTool](https://github.com/zhy8388608/Mi8WfBinTool), [Fprj_to_wfDef](https://github.com/Pzqqt/Fprj_to_wfDef), [Xiaomi Band Tools decompilation](https://github.com/RedKage/Xiaomi_Band_Tools).
- Band 10 samples: [mb10-goodies](https://gitlab.com/mateusznowakdev/mb10-goodies), [pill-dial](https://github.com/elfimov-design/pill-dial-smart-band-10), [mi-band-faces](https://github.com/juzeon/mi-band-faces).
- Installation/protocol: [Gadgetbridge](https://codeberg.org/Freeyourgadget/Gadgetbridge), [Band 10 support page](https://gadgetbridge.org/gadgets/wearables/xiaomi/#device__xiaomi_mi_band_10), [My Band](https://github.com/matheusdanoite/my-band).
