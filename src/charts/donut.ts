import type { Language, Theme, ChartResult                          } from "../types.js";
import { resolveLayout, calculateChartCenter, calculateLegendStartX } from "./layout.js";
import { DONUT_GEOMETRY                                             } from "../constants/geometry.js";
import { createDonutSegments                                        } from "./geometry.js";
import { createLegend                                               } from "./legend.js";

export function generateDonutChart(
  normalizedLanguages: Language[],
  selectedTheme:       Theme,
  width:               number,
  stroke:              boolean
): ChartResult {
  const { isShifted, useStroke } = resolveLayout(normalizedLanguages.length, stroke);

  const chartX                   = calculateChartCenter(width, isShifted);
  const legendStartX             = calculateLegendStartX(chartX, DONUT_GEOMETRY.OUTER_RADIUS);

  const segments = createDonutSegments(normalizedLanguages, chartX, DONUT_GEOMETRY, [...selectedTheme.colours], useStroke);
  const legend   = createLegend(normalizedLanguages, isShifted, selectedTheme, legendStartX, useStroke);

  return { segments, legend };
}
