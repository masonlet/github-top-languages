import { LAYOUT, LEGEND_STYLES } from './constants.js';

export function createLegend(languages, isShifted, selectedTheme) {
  const legendLayout = isShifted ? LAYOUT.SHIFTED : LAYOUT.DEFAULT;
  const legendXBase = legendLayout.LEGEND_START_X;
  const numLangs = languages.length;

  return languages.map((lang, i) => {
    let x, y;

    if (!isShifted) {
      x = legendXBase;
      y = LEGEND_STYLES.START_Y + i * LEGEND_STYLES.ROW_HEIGHT;
    } else {
      const half = Math.ceil(numLangs / 2);
      const col = Math.floor(i / half);
      const row = i % half;

      x = legendXBase + col * 100;
      y = LEGEND_STYLES.START_Y + row * LEGEND_STYLES.ROW_HEIGHT;
    }

    return `
      <rect x="${x}" y="${y - LEGEND_STYLES.SQUARE_SIZE + 3}" width="${LEGEND_STYLES.SQUARE_SIZE}" height="${LEGEND_STYLES.SQUARE_SIZE}" fill="${selectedTheme.colours[i]}" rx="${LEGEND_STYLES.SQUARE_RADIUS}"/>
      <text x="${x + LEGEND_STYLES.SQUARE_SIZE + 5}" y="${y}" fill="${selectedTheme.text}" font-size="${LEGEND_STYLES.FONT_SIZE}" font-family="Arial">
      ${lang.lang} ${lang.pct.toFixed(1)}%
    </text>
    `;
  }).join('');
} 
