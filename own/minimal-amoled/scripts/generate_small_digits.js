#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const FONT_PATH = "Roboto-ExtraBold.ttf";
const OUTPUT_DIR = "../assets/digits-small/";

const CANVAS_WIDTH = 15;
const CANVAS_HEIGHT = 20;
const COLOR = "#aaaaaa";

const SIDE_PADDING = 1;

// Minus sign settings.
const MINUS_WIDTH = 10;
const MINUS_HEIGHT = 2;
const MINUS_Y = 17;

if (!fs.existsSync(FONT_PATH)) {
  console.error(`Font file not found: ${FONT_PATH}`);
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const buffer = fs.readFileSync(FONT_PATH);
const arrayBuffer = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength
);
const font = opentype.parse(arrayBuffer);

function writeSvg(filename, pathData) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"
     viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  ${pathData}
</svg>
`;

  fs.writeFileSync(
    path.join(OUTPUT_DIR, filename),
    svg,
    "utf8"
  );
}

function generateDigit(digit) {
  const glyph = font.charToGlyph(digit);
  const glyphPath = glyph.getPath(0, 0, font.unitsPerEm);
  const bounds = glyphPath.getBoundingBox();

  const glyphWidth = bounds.x2 - bounds.x1;
  const glyphHeight = bounds.y2 - bounds.y1;

  if (glyphWidth <= 0 || glyphHeight <= 0) {
    throw new Error(`Invalid glyph bounds for digit ${digit}`);
  }

  // Fill the reduced canvas height while preserving aspect ratio.
  const scale = CANVAS_HEIGHT / glyphHeight;
  const visibleWidth = glyphWidth * scale;
  const visibleHeight = glyphHeight * scale;

  // Center horizontally and vertically.
  const offsetX =
    (CANVAS_WIDTH - visibleWidth) / 2 -
    bounds.x1 * scale;

  const offsetY =
    (CANVAS_HEIGHT - visibleHeight) / 2 -
    bounds.y1 * scale;

  const pathData = `<path
    fill="${COLOR}"
    transform="translate(${offsetX} ${offsetY}) scale(${scale})"
    d="${glyphPath.toPathData(3)}"/>`;

  writeSvg(`${digit}.svg`, pathData);

  console.log(
    `Generated ${digit}.svg: canvas ${CANVAS_WIDTH} × ${CANVAS_HEIGHT}, ` +
    `visible size ${visibleWidth.toFixed(2)} × ${visibleHeight.toFixed(2)}`
  );
}

function generateMinus() {
  const x = (CANVAS_WIDTH - MINUS_WIDTH) / 2;

  const pathData = `<path
    fill="${COLOR}"
    d="M ${x} ${MINUS_Y}
       H ${x + MINUS_WIDTH}
       V ${MINUS_Y + MINUS_HEIGHT}
       H ${x}
       Z"/>`;

  writeSvg("minus.svg", pathData);
  console.log("Generated minus.svg");
}

try {
  for (let digit = 0; digit <= 9; digit++) {
    generateDigit(String(digit));
  }

  generateMinus();

  console.log(`\nOutput directory: ${path.resolve(OUTPUT_DIR)}`);
} catch (error) {
  console.error("Failed to generate SVG files:", error);
  process.exitCode = 1;
}
