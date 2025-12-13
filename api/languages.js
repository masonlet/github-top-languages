const DEFAULT_CONFIG = {
  TITLE: 'Top Languages',
  WIDTH: 400,
  HEIGHT: 300,
  COUNT: 8
}

const LAYOUT = {
  DEFAULT: {
    CHART_CENTER_X: 150,
    LEGEND_START_X: 270
  },
  SHIFTED: {
    CHART_CENTER_X: 100,
    LEGEND_START_X: 200
  }
}

const DONUT_GEOMETRY = {
  CENTER_Y: 170,
  OUTER_RADIUS: 80,
  INNER_RADIUS: 50
}

const TITLE_STYLES = {
  TEXT_Y: 30,
  FONT_SIZE: 24
}

const LEGEND_STYLES = {
  START_Y: 80,
  ROW_HEIGHT: 25,
  SQUARE_SIZE: 12,
  SQUARE_RADIUS: 2,
  FONT_SIZE: 11
}

const ERROR_STYLES = {
  TEXT_Y: 100,
  FONT_SIZE: 18,
  COLOUR: '#ff6b6b'
}

const THEMES = {
  default: {
    bg: '#0d1117',
    text: '#ffffff',
    colours: ['#A8D5Ba', '#FFD6A5', '#FFAAA6', '#D0CFCF', '#CBAACB', '#FFE156', '#96D5E9', '#F3B0C3']
  },
  light: {
    bg: '#ffffff',
    text: '#2f2f2f',
    colours: ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
  },
  dark: {
    bg: '#1a1a1a',
    text: '#ccd6f6',
    colours: ['#ff6b6b', '#4ecdc3', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e2']
  }
};

function polarToCartesian(centerX, centerY, radius, angleInDegrees){
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeSegment(x, y, innerRadius, outerRadius, startAngle, endAngle){
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `
M ${startOuter.x} ${startOuter.y} 
A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y} 
L ${startInner.x} ${startInner.y} 
A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y} 
Z
`;    
}

let cachedLanguageData = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 1000 * 60 * 60;
const MAX_COUNT = 16;
const LEGEND_SHIFT_THRESHOLD = 8;
const FULL_CIRCLE_ANGLE = 359.9999;

function parseQueryParams(query) {
  const count = parseInt(query.count || query.langCount) || DEFAULT_CONFIG.COUNT;

  return {
    langCount: Math.min(Math.max(count, 1), MAX_COUNT),
    selectedTheme: THEMES[query.theme] || THEMES.default,
    chartTitle: query.hide_title === 'true' ? '' : (query.title || DEFAULT_CONFIG.TITLE),
    width: parseInt(query.width) || DEFAULT_CONFIG.WIDTH,
    height: parseInt(query.height) || DEFAULT_CONFIG.HEIGHT,
  }
}

async function fetchLanguageData() {
  const now = Date.now();

  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) {
    return cachedLanguageData;
  }

  const username = process.env.GITHUB_USERNAME;
  if(!username) throw new Error(`No user called`);

  const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
  if(!reposResponse.ok) throw new Error(`GitHub API error: ${reposResponse.status}`);

  const repos = await reposResponse.json();
  const ignored = process.env.IGNORED_REPOS?.split(',').map(name => name.trim()) || [];
  const filteredRepos = repos.filter(
    repo => !repo.fork && !ignored.includes(repo.name)
  );

  const languageFetches = filteredRepos.map(repo =>
    fetch(`https://api.github.com/repos/${repo.full_name}/languages`)
    .then(r => r.ok ? r.json() : {})
  );

  const langResults = await Promise.all(languageFetches);
  const languageBytes = {};

  for (const languages of langResults) {
    for (const [lang, bytes] of Object.entries(languages)) {
      languageBytes[lang] = (languageBytes[lang] || 0) + bytes;
    }
  }

  cachedLanguageData = languageBytes;
  lastRefresh = now;
  return languageBytes;
}

function processLanguageData(languageBytes, langCount){
  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const topLanguages = sortedLanguages.slice(0, langCount);

  if (topLanguages.length === 0){
    throw new Error('No language data available');
  }

  const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
  return topLanguages.map(lang => ({
    ...lang,
    pct: (lang.pct / totalPct) * 100
  }));
}

function createDonutSegments(languages, layoutX, geometry, colours) {
  let currentAngle = 0;

  return languages.map((lang, i) => {
    const isLast = i === languages.length - 1;
    let angle = (lang.pct / 100) * 360;

    if (isLast) {
      angle = 360 - currentAngle
    }

    const segmentAngle = angle >= FULL_CIRCLE_ANGLE ? FULL_CIRCLE_ANGLE : currentAngle + angle;

    const path = describeSegment(
      layoutX,
      geometry.CENTER_Y,
      geometry.INNER_RADIUS,
      geometry.OUTER_RADIUS,
      currentAngle,
      segmentAngle
    );
    
    currentAngle += angle;
    return `<path d="${path}" fill="${colours[i]}"/>`;
  }).join('');
}

function createLegend(languages, isShifted, selectedTheme) {
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

function renderSvg(width, height, background, titleElement, segments, legend) {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
    ${titleElement}
    ${segments}
    ${legend}
    </svg>
  `;
}
function renderError(message, width, height, selectedTheme){
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

export default async function handler(req, res) {
  const { langCount, selectedTheme, chartTitle, width, height } = parseQueryParams(req.query);

  try {
    const languageBytes = await fetchLanguageData();
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
