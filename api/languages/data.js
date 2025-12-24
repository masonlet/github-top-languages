import {
  DEFAULT_CONFIG,
  THEMES,
  MAX_COUNT,
  REFRESH_INTERVAL,
  VALID_TYPES
} from './constants.js';
import { sanitize } from './sanitize.js';

export function parseQueryParams(query) {
  const count = parseInt(query.count || query.langCount) || DEFAULT_CONFIG.COUNT;
  const customTheme = THEMES[query.theme] || THEMES.default;
  const customText = query.text || customTheme.text;
  const customBg = THEMES[query.bg]?.bg || query.bg || customTheme.bg;
  const customColours = [...customTheme.colours];
  for (let i = 1; i <= 16; i++) {
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

let cachedLanguageData = null;
let lastRefresh = 0;

export async function fetchLanguageData(useTestData = false) {
  if (useTestData) {
    const testData = await import ('./test-data.json', { with: { type: 'json' } });
    return testData.default;
  }

  const now = Date.now();
  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) {
    return cachedLanguageData;
  }

  const username = process.env.GITHUB_USERNAME;
  if(!username) throw new Error(`Configuration Error: GITHUB_USERNAME environment variable is not set.`);

  const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
  if(!reposResponse.ok) throw new Error(`GitHub API error: ${reposResponse.status} ${reposResponse.statusText}`);

  const repos = await reposResponse.json();
  const ignored = process.env.IGNORED_REPOS?.split(',').map(name => name.trim()) || [];

  const filteredRepos = repos.filter(repo => !repo.fork && !ignored.includes(repo.name));

  const languageFetches = filteredRepos.map(repo =>
    fetch(`https://api.github.com/repos/${repo.full_name}/languages`)
      .then(r => r.ok ? r.json() : {})
  );

  const langResults = await Promise.all(languageFetches);

  cachedLanguageData = langResults.reduce((acc, languages) => {
    for (const [lang, bytes] of Object.entries(languages)) {
      acc[lang] = (acc[lang] || 0) + bytes;
    }
    return acc;
  }, {});

  lastRefresh = now;
  return cachedLanguageData;
}

export function processLanguageData(languageBytes, langCount){
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
