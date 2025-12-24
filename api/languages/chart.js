import { processLanguageData } from './data.js';
import { generateDonutChart } from './charts/donut.js';

export function generateChartData(languageBytes, langCount, selectedTheme, chartType, width) {
  const normalizedLanguages = processLanguageData(languageBytes, langCount);

  switch (chartType) {
    case 'donut':
      return generateDonutChart(normalizedLanguages, selectedTheme, width);
    default:
      return generateDonutChart(normalizedLanguages, selectedTheme, width);  
  }
}
