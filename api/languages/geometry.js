import { FULL_CIRCLE_ANGLE } from './constants.js';

export function polarToCartesian(centerX, centerY, radius, angleInDegrees){
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export function describeSegment(x, y, innerRadius, outerRadius, startAngle, endAngle){
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

export function createDonutSegments(languages, layoutX, geometry, colours) {
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
