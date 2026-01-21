import { TITLE_STYLES } from "../constants/styles.js"

export function renderSvg(width, height, background, segments, legend, title, textColour) {
  const titleElement = title ? `
    <text 
      x="${width/2}" 
      y="${TITLE_STYLES.TEXT_Y}" 
      text-anchor="middle" fill="${textColour}" 
      font-family="Arial" font-size="${TITLE_STYLES.FONT_SIZE}"
    >
      ${title}
    </text>
  ` : '';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
      ${titleElement}
      ${segments}
      ${legend}
    </svg>
  `;
}
