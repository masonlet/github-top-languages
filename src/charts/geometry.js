import { FULL_CIRCLE_ANGLE } from "../constants/geometry.js";

export const polarToCartesian = (cx, cy, r, angleDeg) => {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + (r * Math.cos(angleRad)),
    y: cy + (r * Math.sin(angleRad))
  };
};

export const describeSegment = (cx, cy, innerR, outerR, startAngle, endAngle) => {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter   = polarToCartesian(cx, cy, outerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  if (innerR === 0) {
    return `
      M ${cx} ${cy}
      L ${startOuter.x} ${startOuter.y}
      A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}
      Z
    `.trim();
  }

  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner   = polarToCartesian(cx, cy, innerR, endAngle);

  return `
    M ${startOuter.x} ${startOuter.y} 
    A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y} 
    L ${startInner.x} ${startInner.y} 
    A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y} 
    Z
  `.trim();
};

export const createDonutSegments = (languages, cx, geometry, colours, stroke) => {
  let currentAngle = -0.1;

  return languages.map((lang, i) => {
    let angle = (lang.pct / 100) * 360;

    const segmentAngle =  Math.min(currentAngle + angle + 0.1, FULL_CIRCLE_ANGLE);
    const path = describeSegment(
      cx,
      geometry.CENTER_Y,
      geometry.INNER_RADIUS,
      geometry.OUTER_RADIUS,
      currentAngle,
      segmentAngle
    );

    currentAngle += angle;
    const fillColour = colours[i % colours.length];
    const strokeAttr = stroke
      ? ` stroke="#000" stroke-width="0.5" stroke-linejoin="round"`
      : ` stroke="${fillColour}" stroke-width="0.2"`;
    return `<path d="${path}" fill="${fillColour}"${strokeAttr} shape-rendering="geometricPrecision"/>`;
  }).join('');
}
