export default async function handler(req, res) {
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
    langResults.forEach((langs, idx) => {
      console.log(`Repo: ${filteredRepos[idx].name}`, langs);
    });

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

    const topLanguages = sortedLanguages.slice(0, 8);
    console.log("Top 8 Languages:");
    topLanguages.forEach(l => console.log(`${l.lang}: ${l.pct.toFixed(2)}%`));

    const svg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#0d1117" rx="10"/>
        <text x="200" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="24">
          Github Top Languages
        </text>
        <text x="200" y="130" text-anchor="middle" fill="#8b949e" font-family="Arial" font-size="14">
           Found ${Object.keys(languageBytes).length} languages across ${filteredRepos.length} repos
        </text>
      </svg>
    `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(svg);
  } catch (error) {
     const errorSvg = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="200" fill="#0d1117" rx="10"/>
        <text x="200" y="100" text-anchor="middle" fill="#ff6b6b" font-family="Arial" font-size="18">
          Error: ${error.message}
        </text>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(500).send(errorSvg);
  }
}
