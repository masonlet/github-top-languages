const BASE_GEOMETRY = {
  CENTER_Y: 170,
  OUTER_RADIUS: 80,
  MARGIN_RIGHT: 20
} as const;

export const DONUT_GEOMETRY = { ...BASE_GEOMETRY, INNER_RADIUS: 50 } as const;
export const PIE_GEOMETRY   = { ...BASE_GEOMETRY, INNER_RADIUS: 0  } as const;

export const FULL_CIRCLE_ANGLE = 359.9999;
