export default async function handler(req, res) {
  const svg = `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="#0d1117" rx="10"/>
      <text x="200" y="100" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="24">
        Github Top Languages
      </text>
      <text x="200" y="130" text-anchor="middle" fill="#8b949e" font-family="Arial" font-size="14">
        Coming soon
      </text>
    </svg>
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(svg);
}
