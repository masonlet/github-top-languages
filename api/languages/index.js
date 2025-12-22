import { parseQueryParams, fetchLanguageData, processLanguageData } from './data.js';
import { createDonutSegments } from './geometry/donut.js';
import { createLegend } from './legend.js';
import { renderSvg, renderError } from './render.js';
import { 
  LAYOUT, 
  DONUT_GEOMETRY, 
  LEGEND_SHIFT_THRESHOLD, 
  TITLE_STYLES
} from './constants.js';

export default async function handler(req, res) {
  const { langCount, selectedTheme, chartTitle, width, height, useTestData } = parseQueryParams(req.query);

  try {
    const languageBytes = await fetchLanguageData(useTestData);
    const normalizedLanguages = processLanguageData(languageBytes, langCount);

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

    const titleElement = chartTitle ? `
      <text x="${width/2}" y="${TITLE_STYLES.TEXT_Y}" text-anchor="middle" fill="${selectedTheme.text}" font-family="Arial" font-size="${TITLE_STYLES.FONT_SIZE}">
        ${chartTitle}
      </text>
    ` : '';

    const svg = renderSvg(width, height, selectedTheme.bg, titleElement, segments, legend);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
    res.status(200).send(svg);
  } catch (error) {
    const errorSvg = renderError(error.message, width, height, selectedTheme);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorSvg);
  }
}
