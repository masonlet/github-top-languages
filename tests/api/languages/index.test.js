import { describe, it, expect, vi, beforeEach } from "vitest";
import handler from "../../../api/languages/index.js";
import { parseQueryParams } from "../../../src/utils/params.js";
import { fetchLanguageData, processLanguageData } from "../../../src/api/github.js";
import { generateChartData } from "../../../src/charts/chart.js";
import { renderSvg } from "../../../src/render/svg.js";
import { renderError } from "../../../src/render/error.js";

vi.mock("../../../src/utils/params.js");
vi.mock("../../../src/api/github.js");
vi.mock("../../../src/charts/chart.js");
vi.mock("../../../src/render/svg.js");
vi.mock("../../../src/render/error.js");

describe("handler", () => {
  let req, res;

  beforeEach(() => {
    req = { query: {} };
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };

    parseQueryParams.mockReturnValue({
      width: 600,
      height: 400,
      selectedTheme: { bg: "#fff", text: "#000" },
      langCount: 5,
      chartType: "donut",
      chartTitle: "Languages",
      useTestData: false
    });
  });

  it("renders SVG successfully with valid data", async () => {
    const rawData = { JavaScript: 5000, Python: 3000 };
    const normalizedData = [
      { lang: "JavaScript", pct: 62.5 },
      { lang: "Python", pct: 37.5 }
    ];
    const chartData = {
      segments: [{ lang: "JavaScript", pct: 62.5 }],
      legend: [{ lang: "JavaScript", colour: "#f00" }]
    };
    const svgOutput = "<svg>chart</svg>";

    fetchLanguageData.mockResolvedValue(rawData);
    processLanguageData.mockReturnValue(normalizedData);
    generateChartData.mockReturnValue(chartData);
    renderSvg.mockReturnValue(svgOutput);

    await handler(req, res);

    expect(fetchLanguageData).toHaveBeenCalledWith(false);
    expect(processLanguageData).toHaveBeenCalledWith(rawData, 5);
    expect(generateChartData).toHaveBeenCalledWith(normalizedData, { bg: "#fff", text: "#000" }, "donut", 600);
    expect(renderSvg).toHaveBeenCalledWith(600, 400, "#fff", chartData.segments, chartData.legend, "Languages", "#000");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(svgOutput);
  });

  it("renders error SVG when fetchLanguageData fails", async () => {
    const error = new Error("GitHub API error");
    const errorSvg = "<svg>error</svg>";

    fetchLanguageData.mockRejectedValue(error);
    renderError.mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("GitHub API error", 600, 400, { bg: "#fff", text: "#000" });
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(errorSvg);
  });

  it("renders error SVG when processLanguageData fails", async () => {
    const error = new Error("No language data available");
    const errorSvg = "<svg>error</svg>";

    fetchLanguageData.mockResolvedValue({});
    processLanguageData.mockImplementation(() => { throw error; });
    renderError.mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("No language data available", 600, 400, { bg: "#fff", text: "#000" });
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
