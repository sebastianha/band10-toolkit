# Carbon Signal example

A complete 212×520 minimal black AMOLED source face.

## Included data

- large digital hour/minute sprites;
- month/day;
- sparse battery icon and numeric percent;
- steps plus goal progress;
- heart rate;
- weather icon and Celsius temperature;
- independent low-content AOD.

All artwork is generated from `scripts/generate-example-assets.ts` and covered by the repository MIT license.

| Active | AOD |
|---|---|
| ![Active face](../../docs/screenshots/active-watchface.png) | ![AOD face](../../docs/screenshots/aod-watchface.png) |

## Build

From repository root:

```sh
npm run generate:assets
npm run band10 -- validate examples/minimal-amoled
npm run band10 -- build examples/minimal-amoled
npm run band10 -- package examples/minimal-amoled
npm run band10 -- inspect examples/minimal-amoled/dist/carbon-signal.face
```

## Status

- schema/assets: validated;
- preview: rendered and browser-tested;
- FPRJ/GMF: generated;
- native binary: structurally parsed and all resources decoded;
- physical Band 10 installation: **not yet tested**.

The progress property and native packaging remain reverse-engineered/experimental. Do not remove those warnings from downstream releases until hardware evidence exists.
