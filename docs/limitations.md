# Limitations and verification ledger

## What is verified locally

- two independent public Band 10 artifacts share `5A A5 34 12` and plaintext header structure;
- `.face`/`.bin` alias behavior is documented by Mi Create and observed in samples;
- strict canonical schemas and all example assets validate;
- FPRJ/GMF intermediates are generated deterministically;
- native header/definitions/properties are internally addressable;
- every native image/image-list decodes after packaging;
- known two-byte widget source IDs round-trip semantically;
- active + AOD records parse without structural warnings;
- React studio compiles/lints and required interactions were browser-tested.

## Not yet verified

### Physical Band 10 native install

No physical o66 was available during this build. A structurally valid package is not proof that firmware accepts every reserved byte/style-count/resource choice. This is the highest-priority follow-up.

### Official signing/store publication

No public Band 10 signing specification or open global Mi Fitness submission portal was found. Community installation success indicates runtime faces are not universally whole-file encrypted, but store policy/authorization is a separate concern.

### Full binary grammar

Unsupported or incomplete:

- named/multiple style records;
- analog pointer encoding;
- editable/customizable components (type 8);
- jump/tap actions (type 9);
- JS/Lua/script resource semantics;
- all image sign variants;
- data-source IDs longer than three bytes in native packer;
- raw opacity semantics (especially AOD);
- exact progress bytes beyond source/resource references;
- checksum/signature fields if present in other envelope variants;
- NFC/region-specific differences.

The parser reports what it knows and avoids inventing field names for opaque bytes.

## Preview fidelity limits

The SVG preview does not emulate:

- firmware-specific clipping/rounding bugs;
- device color calibration/brightness;
- 5 Hz AOD temporal behavior/flicker;
- burn-in pixel shifting;
- memory allocation limits;
- touch target routing or app jumps;
- companion data staleness;
- actual animation scheduling/power impact;
- localization/12-hour firmware edge cases not represented in source.

## External tooling limits

- Mi Create's UI is GPL but its compiler is third-party closed source.
- EasyFace's public repository distributes binaries/docs, not licensed source.
- Mi8WfBinTool publishes source without a license and failed two valid Band 10 samples in this research.
- Modded Mi Fitness/LSPosed solutions handle sensitive health/device data and expand attack surface.
- Notify for Xiaomi is proprietary and cannot be audited here.
- Gadgetbridge is active/open and lists Band 10 as mostly supported, but pairing/AuthKey and watch-face behavior still vary.

## Required hardware acceptance test

Before changing native status from experimental:

1. Test on a factory-reset-capable non-primary Band 10.
2. Record exact model/region/firmware and installer version.
3. Install the smallest static template first.
4. Install Carbon Signal without AOD, then with AOD.
5. Verify every source at boundary values.
6. Exercise sleep/wake, AOD schedule, face switching, reboot, and companion reconnect.
7. Measure package install/uninstall repeatability.
8. Confirm recovery by switching/removing the face.
9. Compare native and closed-compiler binaries for the same FPRJ.
10. Publish hashes/logs and label results by firmware—not universally.

## Legal limitations

Reverse engineering and sideloading rules vary by jurisdiction and agreement. Use your own device/files, respect licenses, do not bypass paid-content controls, and do not redistribute proprietary compilers or third-party artwork.
