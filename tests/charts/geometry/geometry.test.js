import { describe, it, expect } from "vitest";
import {
  polarToCartesian,
  describeSegment,
  createDonutSegments
} from "../../../src/charts/geometry/donut.js";
import { FULL_CIRCLE_ANGLE } from "../../../src/charts/geometry/constants.js";

const mockGeometry = { CENTER_Y: 100, INNER_RADIUS: 30, OUTER_RADIUS: 50 };

describe("donut geometry", () => {
  it("polarToCartesian: quadrants correct", () => {
    expect(polarToCartesian(100, 100, 50, 0)).toEqual({ x: 100, y: 50 }); // Top
    expect(polarToCartesian(100, 100, 50, 90)).toEqual({ x: 150, y: 100 }); // Right
    expect(polarToCartesian(100, 100, 50, 180)).toEqual({ x: 100, y: 150 }); // Bottom
    expect(polarToCartesian(100, 100, 50, 270)).toEqual({ x: 50, y: 100 }); // Left
  });

  it('describeSegment: small arc path', () => {
    const path = describeSegment(100, 100, 30, 50, 0, 90);
    expect(path).toMatch(/^M \d+\.?\d* \d+\.?\d*/);
    expect(path).toMatch(/A 50 50 0 0 0/); 
    expect(path).toMatch(/Z$/);
  });

  it('createDonutSegments: single lang full circle', () => {
    const langs = [{ pct: 100 }];
    const paths = createDonutSegments(langs, 100, mockGeometry, ['#f00']);
    expect(paths).toMatch(/fill="#f00"/);
  });

  it('createDonutSegments: multi-lang sums to 360°', () => {
    const langs = [{ pct: 33 }, { pct: 33 }, { pct: 34 }];
    const paths = createDonutSegments(langs, 100, mockGeometry, ['#f00', '#0f0', '#00f']);
    expect(paths.split('/>').length - 1).toBe(3);
  });
});
