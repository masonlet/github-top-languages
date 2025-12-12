const TOP_LANGUAGES_COUNT = 8;

const TITLE_Y = 30;
const TITLE_FONT_SIZE = 24;

const SVG_WIDTH = 400;
const SVG_HEIGHT = 300;

const CHART_CENTER_X = 150;
const CHART_CENTER_Y = 170;
const CHART_OUTER_RADIUS = 80;
const CHART_INNER_RADIUS = 50;

const LEGEND_START_X = 270;
const LEGEND_TEXT_X = 287;
const LEGEND_START_Y = 80;
const LEGEND_ROW_HEIGHT = 25;
const LEGEND_SQUARE_SIZE = 12;
const LEGEND_SQUARE_RADIUS = 2;
const LEGEND_FONT_SIZE = 11;

const ERROR_TEXT_Y = 100;
const ERROR_FONT_SIZE = 18;

const BG_COLOUR = '#0d1117';
const TEXT_COLOUR = '#ffffff';
const ERROR_COLOUR = '#ff6b6b';
const COLOURS = [
  '#A8D5Ba', '#FFD6A5', '#FFAAA6', '#D0CFCF', 
  '#CBAACB', '#FFE156', '#96D5E9', '#F3B0C3'
];

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


let cachedSVG = null;
let lastRefresh = 0;
const REFRESH_INTERVAL = 1000 * 60 * 60;

export default async function handler(req, res) {
  const now = Date.now();

  if (cachedSVG && now - lastRefresh < REFRESH_INTERVAL){
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(cachedSVG);
  }

  const token = process.env.GITHUB_TOKEN
  if(!token){
    return res.status(500).send('GitHub token not configured');
  }

  try {
    const reposResponse = await fetch(
      `https://api.github.com/user/repos?per_page=100&affiliation=owner`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: `application/vnd.github.v3+json`
        }
      }
    );

    if(!reposResponse){
      throw new Error(`GitHub API error: ${reposResponse.status}`);
    }

    const repos = await reposResponse.json();
    const ignored = process.env.IGNORED_REPOS?.split(',').map(name => name.trim()) || [];
    const filteredRepos = repos.filter(
      repo => !repo.fork && !ignored.includes(repo.name)
    );

    const languageFetches = filteredRepos.map(repo =>
      fetch(`https://api.github.com/repos/${repo.full_name}/languages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      }).then(r => r.ok ? r.json() : {})
    );

    const langResults = await Promise.all(languageFetches);
    const languageBytes = {};

    for (const languages of langResults) {
      for (const [lang, bytes] of Object.entries(languages)) {
        languageBytes[lang] = (languageBytes[lang] || 0) + bytes;
      }
    }

    const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);

    const sortedLanguages = Object.entries(languageBytes)
      .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    const topLanguages = sortedLanguages.slice(0, TOP_LANGUAGES_COUNT);
    const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
    const normalizedLanguages = topLanguages.map(lang => ({
      ...lang,
      pct: (lang.pct / totalPct) * 100
    }));

    let currentAngle = 0;
    const segments = normalizedLanguages.map((lang, i) => {
      const angle = (lang.pct / 100) * 360;
      const pathD = describeSegment(CHART_CENTER_X, CHART_CENTER_Y, CHART_INNER_RADIUS, CHART_OUTER_RADIUS, currentAngle, currentAngle + angle);
      currentAngle += angle;

      return `<path d="${pathD}" fill="${COLOURS[i]}"/>`;
    }).join('');

    const legend = normalizedLanguages.map((lang, i) => {
      const y = LEGEND_START_Y + (i * LEGEND_ROW_HEIGHT);
      return `
        <rect x="${LEGEND_START_X}" y="${y - 10}" width="${LEGEND_SQUARE_SIZE}" height="${LEGEND_SQUARE_SIZE}" fill="${COLOURS[i]}" rx="2"/>
        <text x="${LEGEND_TEXT_X}" y="${y}" fill="${TEXT_COLOUR}" font-size="${LEGEND_FONT_SIZE}" font-family="Arial">
          ${lang.lang} ${lang.pct.toFixed(1)}%
        </text>
      `;
    }).join('');

    const svg = `
      <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${BG_COLOUR}" rx="10"/>
        <text x="${SVG_WIDTH/2}" y="${TITLE_Y}" text-anchor="middle" fill="${TEXT_COLOUR}" font-family="Arial" font-size="${TITLE_FONT_SIZE}">
          Top Languages
        </text>
        ${segments}
        ${legend}
      </svg>
    `;

  cachedSVG = svg;
  lastRefresh = now;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=60');
  res.status(200).send(svg);
  } catch (error) {
     const errorSvg = `
      <svg width="${SVG_WIDTH}" height="${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${BG_COLOUR}" rx="10"/>
        <text x="${SVG_WIDTH/2}" y="${ERROR_TEXT_Y}" text-anchor="middle" fill="${ERROR_COLOUR}" font-family="Arial" font-size="${ERROR_FONT_SIZE}">
          Error: ${error.message}
        </text>
      </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorSvg);
  }
}
