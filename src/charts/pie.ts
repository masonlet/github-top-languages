import type { Language, Theme, ChartResult                          } from "../types.js";
import { resolveLayout, calculateChartCenter, calculateLegendStartX } from "./layout.js";
import { PIE_GEOMETRY                                               } from "../constants/geometry.js";
import { createDonutSegments                                        } from "./geometry.js";
import { createLegend                                               } from "./legend.js";

export function generatePieChart(
  normalizedLanguages: Language[],
  selectedTheme:       Theme,
  width:               number,
  stroke:              boolean
): ChartResult {
  const { isShifted, useStroke } = resolveLayout(normalizedLanguages.length, stroke);

  const chartX                   = calculateChartCenter(width, isShifted);
  const legendStartX             = calculateLegendStartX(chartX, PIE_GEOMETRY.OUTER_RADIUS);

  const segments = createDonutSegments(normalizedLanguages, chartX, PIE_GEOMETRY, [...selectedTheme.colours], useStroke);
  const legend = createLegend(normalizedLanguages, isShifted, selectedTheme, legendStartX, useStroke);

  return { segments, legend };
}
