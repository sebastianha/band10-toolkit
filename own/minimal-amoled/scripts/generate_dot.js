#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const FONT_PATH = "Roboto-ExtraBold.ttf";
const OUTPUT_DIR = "../assets/weekdays/";

const CANVAS_WIDTH = 7;
const CANVAS_HEIGHT = 7;
const COLOR = "#999999";

function writeSvg(filename, pathData) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"
  width="${CANVAS_WIDTH}"
  height="${CANVAS_HEIGHT}"
  viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
  ${pathData}
</svg>
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), svg);
}

function generateDot() {
  const buffer = fs.readFileSync(FONT_PATH);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );

  const font = opentype.parse(arrayBuffer);
  const glyph = font.charToGlyph(".");
  const glyphPath = glyph.getPath(0, 0, font.unitsPerEm);
  const bounds = glyphPath.getBoundingBox();

  const glyphWidth = bounds.x2 - bounds.x1;
  const glyphHeight = bounds.y2 - bounds.y1;

  if (glyphWidth <= 0 || glyphHeight <= 0) {
    throw new Error("Invalid glyph bounds for '.'");
  }

  const scale = Math.min(
    (CANVAS_WIDTH * 0.8) / glyphWidth,
    (CANVAS_HEIGHT * 0.8) / glyphHeight
  );

  const offsetX =
    (CANVAS_WIDTH - glyphWidth * scale) / 2 - bounds.x1 * scale;

  const offsetY =
    (CANVAS_HEIGHT - glyphHeight * scale) / 2 - bounds.y1 * scale;

  const pathData = `<path
    fill="${COLOR}"
    transform="translate(${offsetX} ${offsetY}) scale(${scale})"
    d="${glyphPath.toPathData(3)}"/>`;

  writeSvg("dot.svg", pathData);
  console.log(`Generated ${path.join(OUTPUT_DIR, "dot.svg")}`);
}

try {
  generateDot();
} catch (error) {
  console.error("Failed to generate dot SVG:", error);
  process.exitCode = 1;
}
