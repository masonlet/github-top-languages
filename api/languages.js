const DEFAULT_COUNT = 8;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 300;
const DEFAULT_TITLE = 'Top Languages'

const DEFAULT_CHART_CENTER_X = 150;
const DEFAULT_LEGEND_START_X = 270;

const SHIFTED_CHART_CENTER_X = 100;
const SHIFTED_LEGEND_START_X = 200;

const TITLE_Y = 30;
const TITLE_FONT_SIZE = 24;

const CHART_CENTER_Y = 170;
const CHART_OUTER_RADIUS = 80;
const CHART_INNER_RADIUS = 50;

const LEGEND_START_Y = 80;
const LEGEND_ROW_HEIGHT = 25;
const LEGEND_SQUARE_SIZE = 12;
const LEGEND_SQUARE_RADIUS = 2;
const LEGEND_FONT_SIZE = 11;

const ERROR_TEXT_Y = 100;
const ERROR_FONT_SIZE = 18;
const ERROR_COLOUR = '#ff6b6b';

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

export default async function handler(req, res) {
  const { count, theme, title, hide_title } = req.query;

  const langCount = Math.min(Math.max(parseInt(count) || DEFAULT_COUNT, 1), 16);
  const selectedTheme = THEMES[theme] || THEMES.default;
  const chartTitle = hide_title === 'true' ? '' : (title || DEFAULT_TITLE);
  const width = parseInt(req.query.width) || DEFAULT_WIDTH;
  const height = parseInt(req.query.height) || DEFAULT_HEIGHT;
 
  try {
    const now = Date.now();

    if (!cachedLanguageData || now - lastRefresh >= REFRESH_INTERVAL) {
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
    }

    const totalBytes = Object.values(cachedLanguageData).reduce((a, b) => a + b, 0);
    const sortedLanguages = Object.entries(cachedLanguageData)
      .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    const topLanguages = sortedLanguages.slice(0, langCount);
    const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
    const normalizedLanguages = topLanguages.map(lang => ({
      ...lang,
      pct: (lang.pct / totalPct) * 100
    }));

    if(normalizedLanguages.length === 0) {
      throw new Error('No language data available');
    }

    const isShifted = normalizedLanguages.length > 8;
    
    const chartX  = isShifted ? SHIFTED_CHART_CENTER_X : DEFAULT_CHART_CENTER_X;
    const legendX = isShifted ? SHIFTED_LEGEND_START_X : DEFAULT_LEGEND_START_X;

    let currentAngle = 0;
    const segments = normalizedLanguages.map((lang, i) => {
      const isLast = i === normalizedLanguages.length - 1;
      const angle = isLast ? 360 - currentAngle : (lang.pct / 100) * 360;

      if (angle >= 359.99) {
        const path = describeSegment(chartX, CHART_CENTER_Y, CHART_INNER_RADIUS, CHART_OUTER_RADIUS, 0, 359.9999);
        currentAngle += angle;
        return `<path d="${path}" fill="${selectedTheme.colours[i]}"/>`;
      } 

      const path = describeSegment(chartX, CHART_CENTER_Y, CHART_INNER_RADIUS, CHART_OUTER_RADIUS, currentAngle, currentAngle + angle);
      currentAngle += angle;
      return `<path d="${path}" fill="${selectedTheme.colours[i]}"/>`;
    }).join('');

    const rows = isShifted ? 2 : 1;
    const itemsPerRow = Math.ceil(normalizedLanguages.length / rows);

    const legend = normalizedLanguages.map((lang, i) => {
      let x, y;

      if (!isShifted) {
        x = DEFAULT_LEGEND_START_X;
        y = LEGEND_START_Y + i * LEGEND_ROW_HEIGHT;
      } else {
        const half = Math.ceil(normalizedLanguages.length / 2);
        const col = i < half ? 0 : 1;
        const row = i % half;

        x = SHIFTED_LEGEND_START_X + col * 100;
        y = LEGEND_START_Y + row * LEGEND_ROW_HEIGHT;
      }

      return `
        <rect x="${x}" y="${y - 10}" width="${LEGEND_SQUARE_SIZE}" height="${LEGEND_SQUARE_SIZE}" fill="${selectedTheme.colours[i]}" rx="2"/>
        <text x="${x + LEGEND_SQUARE_SIZE + 5}" y="${y}" fill="${selectedTheme.text}" font-size="${LEGEND_FONT_SIZE}" font-family="Arial">
          ${lang.lang} ${lang.pct.toFixed(1)}%
        </text>
      `;
    }).join('');

    const titleElement = chartTitle ? `
      <text x="${width/2}" y="${TITLE_Y}" text-anchor="middle" fill="${selectedTheme.text}" font-family="Arial" font-size="${TITLE_FONT_SIZE}">
        ${chartTitle}
      </text>
    ` : '';

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${selectedTheme.bg}" rx="10"/>
        ${titleElement}
        ${segments}
        ${legend}
      </svg>
    `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60');
  res.status(200).send(svg);
  } catch (error) {
     const errorSvg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="${selectedTheme.bg}" rx="10"/>
        <text x="${width/2}" y="${ERROR_TEXT_Y}" text-anchor="middle" fill="${ERROR_COLOUR}" font-family="Arial" font-size="${ERROR_FONT_SIZE}">
          Error: ${error.message}
        </text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorSvg);
  }
}
