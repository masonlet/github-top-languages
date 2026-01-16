import { parseQueryParams } from './utils/params.js';
import { fetchLanguageData, processLanguageData } from './api/github.js';
import { generateChartData } from './charts/chart.js';
import { renderSvg } from './render/svg.js';
import { renderError } from './render/error.js';

export default async function handler(req, res) {
  const params = parseQueryParams(req.query);
  const { width, height, selectedTheme, langCount, chartType, chartTitle, useTestData } = params;

  try {
    const rawData = await fetchLanguageData(useTestData);
    const normalizedData = processLanguageData(rawData, langCount);

    const { segments, legend } = generateChartData(normalizedData, selectedTheme, chartType, width);

    const svg = renderSvg(width, height, selectedTheme.bg, segments, legend, chartTitle, selectedTheme.text);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
    res.status(200).send(svg);
  } catch (error) {
    const errorSvg = renderError(error.message, width, height, selectedTheme);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorSvg);
  }
}
