import { REFRESH_INTERVAL } from '../constants/config.js';

let cachedLanguageData = null;
let lastRefresh = 0;

export async function fetchLanguageData(useTestData = false) {
  if (useTestData) {
    const testData = await import ('../data/test-data.json', { with: { type: 'json' } });
    return testData.default;
  }

  const now = Date.now();
  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) 
    return cachedLanguageData;

  const username = process.env.GITHUB_USERNAME;
  if(!username) throw new Error(`GITHUB_USERNAME environment variable is not set`);

  const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
  if(!reposResponse.ok) 
    throw new Error(`GitHub API error: ${reposResponse.status} ${reposResponse.statusText}`);

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
  if(Object.keys(languageBytes).length === 0)
    throw new Error('No language data available');

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const topLanguages = sortedLanguages.slice(0, langCount);

  const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
  return topLanguages.map(lang => ({
    ...lang,
    pct: (lang.pct / totalPct) * 100
  }));
}

export function resetCache() {
  cachedLanguageData = null;
  lastRefresh = 0;
}