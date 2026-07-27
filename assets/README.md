# Asset pipeline

Project assets live beside each `layout.json`; this top-level directory documents the shared pipeline rather than storing device resources.

- Input: PNG, SVG, JPEG, or any raster/vector format supported by Sharp.
- Staging: `band10 assets <project>` rasterizes to deterministic PNG at the SVG's declared pixel size.
- Output: assets are hashed by source path, deduplicated by reference, and copied into FPRJ/GMF build trees.
- Packaging: the native o66 backend chooses a 256-entry BGRA palette when possible and applies the reverse-engineered RLE v2 stream; otherwise it stores BGRA32 plus RLE v1.
- Transparency: use it only where needed. Large RGBA layers cost more RAM/storage than opaque assets.

Source artwork remains the source of truth. Never edit files under a project's `build/` directory.