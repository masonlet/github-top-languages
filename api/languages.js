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
    const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
    const normalizedLanguages = topLanguages.map(lang => ({
      ...lang,
      pct: (lang.pct / totalPct) * 100
    }));

    const centerX = 150;
    const centerY = 170;
    const radius = 80;
    const innerRadius = 50;

    const colours = ['#A8D5Ba', '#FFD6A5', '#FFAAA6', '#D0CFCF', '#CBAACB', '#FFE156', '#96D5E9', '#F3B0C3'];

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

    let currentAngle = 0;
    const segments = normalizedLanguages.map((lang, i) => {
      const angle = (lang.pct / 100) * 360;
      const pathD = describeSegment(centerX, centerY, innerRadius, radius, currentAngle, currentAngle + angle);
      currentAngle += angle;

      return `<path d="${pathD}" fill="${colours[i]}"/>`;
    }).join('');

    const legend = normalizedLanguages.map((lang, i) => {
      const y = 80 + (i * 25);
      return `
        <rect x="270" y="${y - 10}" width="12" height="12" fill="${colours[i]}" rx="2"/>
        <text x="287" y="${y}" fill="#ffffff" font-size="11" font-family="Arial">
          ${lang.lang} ${lang.pct.toFixed(1)}%
        </text>
      `;
    }).join('');

    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#0d1117" rx="10"/>
        <text x="200" y="30" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="24">
          Top Languages
        </text>
        ${segments}
        ${legend}
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
