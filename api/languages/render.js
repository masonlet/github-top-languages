import { THEMES, ERROR_STYLES } from './constants.js';

export function renderSvg(width, height, background, titleElement, segments, legend) {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
    ${titleElement}
    ${segments}
    ${legend}
    </svg>
  `;
}
export function renderError(message, width, height, selectedTheme){
  const background = selectedTheme?.bg || THEMES.default.bg; 
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
      <text x="${width/2}" y="${ERROR_STYLES.TEXT_Y}" text-anchor="middle" fill="${ERROR_STYLES.COLOUR}" font-family="Arial" font-size="${ERROR_STYLES.FONT_SIZE}">
        Error: ${message}
      </text>
    </svg>
  `;
}
