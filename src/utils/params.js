import { DEFAULT_CONFIG, MAX_COUNT } from '../constants/config.js';
import { THEMES } from '../constants/themes.js';
import { VALID_TYPES } from '../constants/types.js';
import { sanitize } from './sanitize.js';

export function parseQueryParams(query) {
  const count = parseInt(query.count || query.langCount) || DEFAULT_CONFIG.COUNT;
  const customTheme = THEMES[query.theme] || THEMES.default;
  const customText = query.text || customTheme.text;
  const customBg = THEMES[query.bg]?.bg || query.bg || customTheme.bg;
  const customColours = [...customTheme.colours];
  for (let i = 1; i <= MAX_COUNT; i++) {
    if(query[`c${i}`]) {
      const colour = query[`c${i}`].replace(/^#/, '');
      customColours[i-1] = `#${colour}`;
    }
  }

  return {
    chartType: VALID_TYPES.includes(query.type) ? query.type : 'donut',
    chartTitle: query.hide_title === 'true' ? '' : sanitize(query.title || DEFAULT_CONFIG.TITLE),
    langCount: Math.min(Math.max(count, 1), MAX_COUNT),
    selectedTheme: {
      bg: customBg,
      text: customText,
      colours: customColours
    },
    width: Math.max(parseInt(query.width) || DEFAULT_CONFIG.WIDTH, DEFAULT_CONFIG.MIN_WIDTH),
    height: parseInt(query.height) || DEFAULT_CONFIG.HEIGHT,
    useTestData: query.test === 'true'   
  }
}

