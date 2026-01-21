import { DEFAULT_CONFIG, MAX_COUNT } from "../constants/config.js";
import { THEMES } from "../constants/themes.js";
import { VALID_TYPES } from "../constants/types.js";
import { sanitize } from "./sanitize.js";

const parseIntSafe = (val, fallback) => {
  const parsed = Number.parseInt(val, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseQueryParams(query) {
  const baseTheme = THEMES[query.theme] ?? THEMES.default;

  const count = parseIntSafe(query.count, DEFAULT_CONFIG.COUNT);

  const customColours = [...baseTheme.colours];
  for (let i = 1; i <= MAX_COUNT; i++) {
    if(query[`c${i}`]) {
      const colour = query[`c${i}`].replace(/^#/, '');
      customColours[i-1] = `#${colour}`;
    }
  }

  return {
    chartType: VALID_TYPES.includes(query.type) ? query.type : "donut",
    chartTitle: query.hide_title === "true" ? '' : sanitize(query.title ?? DEFAULT_CONFIG.TITLE),
    width: Math.max(parseIntSafe(query.width,  DEFAULT_CONFIG.WIDTH), DEFAULT_CONFIG.MIN_WIDTH),
    height: parseIntSafe(query.height, DEFAULT_CONFIG.HEIGHT),
    count: Math.min(Math.max(count, 1), MAX_COUNT),
    selectedTheme: {
      bg: THEMES[query.bg]?.bg ?? query.bg ?? baseTheme.bg,
      text: query.text ?? baseTheme.text,
      colours: customColours
    },
    stroke: query.stroke === "true",
    useTestData: query.test === "true"
  }
}
