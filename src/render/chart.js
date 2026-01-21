import { generateDonutChart } from "../charts/donut.js";
import { generatePieChart } from "../charts/pie.js";

const CHART_GENERATORS = {
  donut: generateDonutChart,
  pie: generatePieChart,
}

export function generateChartData(data, theme, chartType, width, stroke) {
  const generator = CHART_GENERATORS[chartType] || CHART_GENERATORS.donut;
  return generator(data, theme, width, stroke);
}
