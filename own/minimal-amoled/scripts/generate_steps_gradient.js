#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = "../assets/steps-progress/";

const CANVAS_SIZE = 150;
const CENTER = CANVAS_SIZE / 2;
const RADIUS = 64;
const STROKE_WIDTH = 18;

const BACKGROUND_COLOR = "#333333";

function getProgressColor(percentage) {
  const stops = [
    { percentage: 0,   r: 240, g: 75,  b: 75  }, // Coral red
    { percentage: 50,  r: 245, g: 195, b: 65  }, // Golden yellow
    { percentage: 100, r: 65,  g: 205, b: 110 }  // Leaf green
  ];

  const segment = percentage <= 50 ? 0 : 1;
  const start = stops[segment];
  const end = stops[segment + 1];

  const t =
    (percentage - start.percentage) /
    (end.percentage - start.percentage);

  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

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
  const progressColor = getProgressColor(percentage);

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
        stroke="${progressColor}"
        stroke-width="${STROKE_WIDTH}"
      />`;
  } else if (percentage > 0) {
    progressArc = `
      <path
        d="${describeArc(CENTER, CENTER, RADIUS, percentage)}"
        fill="none"
        stroke="${progressColor}"
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

    fs.writeFileSync(
      path.join(OUTPUT_DIR, filename),
      generateProgressSvg(percentage),
      "utf8"
    );

    console.log(`Generated ${filename} (${percentage}%)`);
  }

  console.log("Generated all 21 progress SVG files.");
}

generateAllProgressSvgs();
