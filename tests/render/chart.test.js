import { describe, it, expect, vi } from "vitest";
import { generateChartData } from "../../src/render/chart.js";
import { generateDonutChart } from "../../src/charts/donut.js";

vi.mock("../../src/charts/donut.js", () => ({
  generateDonutChart: vi.fn((data, theme, width) => ({
    mockData: true,
    data,
    theme,
    width
  }))
}));

describe("generateChartData", () => {
  const data = [{ lang: "JavaScript", pct: 60 }];
  const theme = 'light';
  const chartType = 'donut';
  const width = 400;

  it('should call donut generator when chartType is donut', () => {
    const result = generateChartData(data, theme, chartType, width);
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width);
    expect(result.data).toBe(data);
    expect(result.theme).toBe(theme);
    expect(result.width).toBe(width);
  });

  it("defaults to donut generator when chartType is undefined", () => {
    generateChartData(data, theme, undefined, width);
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width);
  });

  it("defaults to donut generator for unrecognized chartType", () => {
    generateChartData(data, theme, 'bigbadwolf', width);
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width);
  });
});
