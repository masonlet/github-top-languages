import { createDonutSegments } from "./geometry.js";
import { DONUT_GEOMETRY } from "../constants/geometry.js";
import { createLegend } from "./legend.js";
import {
  LEGEND_SHIFT_THRESHOLD,
  LEGEND_STYLES
} from "../constants/styles.js";

function calculatePieCenter(width, isShifted) {
  const legendWidth = isShifted 
    ? LEGEND_STYLES.COLUMN_WIDTH * 2
    : LEGEND_STYLES.WIDTH;

  const availableSpace = width - legendWidth - DONUT_GEOMETRY.MARGIN_RIGHT;
  return availableSpace / 2;
}

function calculateLegendStartX(chartCenterX, pieRadius) {
  return chartCenterX + pieRadius + DONUT_GEOMETRY.MARGIN_RIGHT;
}

export function generatePieChart(normalizedLanguages, selectedTheme, width, stroke) {
  const isShifted = normalizedLanguages.length > LEGEND_SHIFT_THRESHOLD;
  const chartX = calculatePieCenter(width, isShifted);
  const legendStartX = calculateLegendStartX(chartX, DONUT_GEOMETRY.OUTER_RADIUS);
  const pieGeometry = { ...DONUT_GEOMETRY, INNER_RADIUS: 0 };
  const useStroke = normalizedLanguages.length > 1 ? stroke : false;

  const segments = createDonutSegments(
    normalizedLanguages,
    chartX,
    pieGeometry,
    selectedTheme.colours,
    useStroke
  );

  const legend = createLegend(
    normalizedLanguages,
    isShifted,
    selectedTheme,
    legendStartX,
    useStroke
  );

  return { segments, legend };
}
