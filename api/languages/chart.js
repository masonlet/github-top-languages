import { processLanguageData } from './data.js';
import { createDonutSegments } from './geometry/donut.js';
import { createLegend } from './legend.js';
import { 
  LAYOUT, 
  DONUT_GEOMETRY, 
  LEGEND_SHIFT_THRESHOLD
} from './constants.js';

function generateDonutChart(normalizedLanguages, selectedTheme) {
  const isShifted = normalizedLanguages.length > LEGEND_SHIFT_THRESHOLD;
  const currentLayout = isShifted ? LAYOUT.SHIFTED : LAYOUT.DEFAULT;
  const chartX = currentLayout.CHART_CENTER_X;

  const segments = createDonutSegments(
    normalizedLanguages,
    chartX,
    DONUT_GEOMETRY,
    selectedTheme.colours
  );

  const legend = createLegend(
    normalizedLanguages,
    isShifted,
    selectedTheme
  )

  return { segments, legend };
}

export function generateChartData(languageBytes, langCount, selectedTheme, chartType) {
  const normalizedLanguages = processLanguageData(languageBytes, langCount);

  switch (chartType) {
    case 'donut':
      return generateDonutChart(normalizedLanguages, selectedTheme);
    default:
      return generateDonutChart(normalizedLanguages, selectedTheme);  
  }
}
