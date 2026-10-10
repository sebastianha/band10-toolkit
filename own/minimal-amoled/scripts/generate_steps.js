#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = "../assets/steps-progress/";

const CANVAS_SIZE = 150;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = 64;
const STROKE_WIDTH = 18;

const BACKGROUND_COLOR = "#333333";
const PROGRESS_COLOR = "#aaaaaa";

function describeArc(cx, cy, radius, percentage) {
  const startAngle = -90;
  const endAngle = startAngle + (percentage / 100) * 360;

  const toRadians = angle => (angle * Math.PI) / 180;

  const startX = cx + radius * Math.cos(toRadians(startAngle));
  const startY = cy + radius * Math.sin(toRadians(startAngle));

  const endX = cx + radius * Math.cos(toRadians(endAngle));
  const endY = cy + radius * Math.sin(toRadians(endAngle));

  const largeArcFlag = percentage > 50 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
}

function generateProgressSvg(percentage) {
  const backgroundCircle = `
    <circle
      cx="${CENTER}"
      cy="${CENTER}"
      r="${RADIUS}"
      fill="none"
      stroke="${BACKGROUND_COLOR}"
      stroke-width="${STROKE_WIDTH}"
    />`;

  let progressArc = "";

  if (percentage === 100) {
    progressArc = `
      <circle
        cx="${CENTER}"
        cy="${CENTER}"
        r="${RADIUS}"
        fill="none"
        stroke="${PROGRESS_COLOR}"
        stroke-width="${STROKE_WIDTH}"
      />`;
  } else if (percentage > 0) {
    progressArc = `
      <path
        d="${describeArc(CENTER, CENTER, RADIUS, percentage)}"
        fill="none"
        stroke="${PROGRESS_COLOR}"
        stroke-width="${STROKE_WIDTH}"
      />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg"
  width="${CANVAS_SIZE}"
  height="${CANVAS_SIZE}"
  viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}">
  ${backgroundCircle}
  ${progressArc}
</svg>
`;
}

function generateAllProgressSvgs() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let percentage = 0; percentage <= 100; percentage += 5) {
    const filename = `${percentage}.svg`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(
      outputPath,
      generateProgressSvg(percentage),
      "utf8"
    );

    console.log(`Generated ${filename}`);
  }

  console.log("Generated all 21 progress SVG files.");
}

generateAllProgressSvgs();
