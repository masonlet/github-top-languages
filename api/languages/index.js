import { parseQueryParams, fetchLanguageData } from './data.js';
import { generateChartData } from './chart.js';
import { renderSvg } from './render/svg.js';
import { renderError } from './render/error.js';

export default async function handler(req, res) {
  const { langCount, selectedTheme, chartTitle, width, height, useTestData } = parseQueryParams(req.query);

  try {
    const languageBytes = await fetchLanguageData(useTestData);
    const { segments, legend } = generateChartData(languageBytes, langCount, selectedTheme);
    
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
