import {
  DEFAULT_CONFIG,
  THEMES,
  MAX_COUNT,
  REFRESH_INTERVAL
} from './constants.js';

export function parseQueryParams(query) {
  const count = parseInt(query.count || query.langCount) || DEFAULT_CONFIG.COUNT;

  return {
    langCount: Math.min(Math.max(count, 1), MAX_COUNT),
    selectedTheme: THEMES[query.theme] || THEMES.default,
    chartTitle: query.hide_title === 'true' ? '' : (query.title || DEFAULT_CONFIG.TITLE),
    width: parseInt(query.width) || DEFAULT_CONFIG.WIDTH,
    height: parseInt(query.height) || DEFAULT_CONFIG.HEIGHT,
  }
}

let cachedLanguageData = null;
let lastRefresh = 0;

export async function fetchLanguageData() {
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
