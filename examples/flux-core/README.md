# Flux Core

A clean electronics/inductor design for Xiaomi Smart Band 10.

## Visual system

- copper hour traces and cyan minute traces;
- dedicated `L1 / 47uH` inductor module with magnetic-field lines;
- PCB buses, vias, and oscilloscope-style telemetry icons;
- isolated date, battery, steps, heart-rate, and weather lanes;
- low-power AOD with a dim coil and no animation;
- pure AMOLED black/near-black background.

The layout is validated for clipping and pairwise bounding-box collisions. It intentionally uses no `allowOverlap` exceptions.

| Active display | Always-on display |
|---|---|
| ![Flux Core active](screenshots/active.png) | ![Flux Core AOD](screenshots/aod.png) |

## Build

```sh
npm run generate:flux
npm run validate:flux
npm run build:flux
npm run package:flux
npm run inspect:flux
npm run screenshots:flux
npm run preview:flux
```

Native package output remains structurally tested but not physically verified on Band 10 hardware.