#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const FONT_PATH = "Roboto-ExtraBold.ttf";
const OUTPUT_DIR = "../assets/weekdays/";

const CANVAS_WIDTH = 60;
const CANVAS_HEIGHT = 34;
const COLOR = "#aaaaaa";

const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const SIDE_PADDING = 1;
const VERTICAL_PADDING = 2;

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

function generateWeekday(label) {
  const paths = [];
  let cursorX = 0;

  for (const char of label) {
    const glyph = font.charToGlyph(char);
    const glyphPath = glyph.getPath(0, 0, font.unitsPerEm);
    const bounds = glyphPath.getBoundingBox();

    if (char !== " ") {
      paths.push({
        path: glyphPath,
        x: cursorX,
        bounds
      });
    }

    cursorX += glyph.advanceWidth ?? 0;
  }

  if (paths.length === 0) {
    throw new Error(`No visible characters in ${label}`);
  }

  const minX = Math.min(
    ...paths.map(item => item.x + item.bounds.x1)
  );
  const maxX = Math.max(
    ...paths.map(item => item.x + item.bounds.x2)
  );
  const minY = Math.min(...paths.map(item => item.bounds.y1));
  const maxY = Math.max(...paths.map(item => item.bounds.y2));

  const textWidth = maxX - minX;
  const textHeight = maxY - minY;

  if (textWidth <= 0 || textHeight <= 0) {
    throw new Error(`Invalid text bounds for ${label}`);
  }

  // Use the same target height for every weekday.
  const targetHeight = CANVAS_HEIGHT * 0.6;
  const scale = targetHeight / textHeight;

  const offsetX = SIDE_PADDING - minX * scale;

  const offsetY =
    (CANVAS_HEIGHT - textHeight * scale) / 2 - minY * scale;

  const pathData = paths.map(item => {
    const x = offsetX + item.x * scale;

    return `<path
      fill="${COLOR}"
      transform="translate(${x} ${offsetY}) scale(${scale})"
      d="${item.path.toPathData(3)}"/>`;
  }).join("\n");

  writeSvg(`${label}.svg`, pathData);

  console.log(
    `Generated ${label}.svg: canvas ${CANVAS_WIDTH} × ${CANVAS_HEIGHT}, ` +
    `visible height ${(textHeight * scale).toFixed(2)}`
  );
}

try {
  for (const weekday of WEEKDAYS) {
    generateWeekday(weekday);
  }

  console.log(`\nOutput directory: ${path.resolve(OUTPUT_DIR)}`);
} catch (error) {
  console.error("Failed to generate weekday SVG files:", error);
  process.exitCode = 1;
}
