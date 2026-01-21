import { generateDonutChart } from "../charts/donut.js";

const CHART_GENERATORS = {
  donut: generateDonutChart,
}

export function generateChartData(data, selectedTheme, chartType, width) {
  const generator = CHART_GENERATORS[chartType] || CHART_GENERATORS.donut;
  return generator(data, selectedTheme, width);
}
