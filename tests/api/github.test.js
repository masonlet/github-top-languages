import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchLanguageData, processLanguageData, resetCache } from "../../src/api/github.js";

const repos = [
  { name: "repo1", fork: false, full_name: "user/repo1" },
  { name: "repo2", fork: true, full_name: "user/repo2" },
  { name: "ignored-repo", fork: false, full_name: "user/ignored-repo" }
];

const languages = {
  JavaScript: 5000,
  Python: 3000,
  HTML: 2000
};

describe("fetchLanguageData", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_USERNAMES", "testuser");
    vi.stubEnv("IGNORED_REPOS", "ignored-repo");
    global.fetch = vi.fn();
    vi.resetModules();
    resetCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses test data when useTestData is true", async () => {
    const result = await fetchLanguageData(true);
    expect(result).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws error when GITHUB_USERNAMES env variable not set", async () => {
    vi.unstubAllEnvs();
    await expect(fetchLanguageData()).rejects.toThrow("At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set");
  });

  it("handles missing IGNORED_REPOS env variable", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_USERNAMES", "testuser");

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => repos })
      .mockResolvedValueOnce({ ok: true, json: async () => languages })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await fetchLanguageData();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      JavaScript: 5000,
      Python: 3000,
      HTML: 2000
    });
  });

  it("fetches repos and filters forks and ignored", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => repos })
      .mockResolvedValueOnce({ ok: true, json: async () => languages });

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100"
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/user/repo1/languages"
    );

    expect(global.fetch).not.toHaveBeenCalledWith(
      "https://api.github.com/repos/user/repo2/languages"
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      "https://api.github.com/repos/user/ignored-repo/languages"
    );
  });

  it("aggregates language bytes across repos", async () => {
    const repos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => repos })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ JavaScript: 1000 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ JavaScript: 500, Python: 300 }) });

    const result = await fetchLanguageData();
    expect(result).toEqual({ JavaScript: 1500, Python: 300 });
  });

  it("throws on repos API error", async () => {
    global.fetch.mockResolvedValueOnce({ 
      ok: false, 
      status: 404, 
      statusText: "Not Found" 
    });

    await expect(fetchLanguageData()).rejects.toThrow("GitHub API error: 404 Not Found");
  });

  it("caches results within refresh interval", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [repos[0]] })
      .mockResolvedValueOnce({ ok: true, json: async () => languages });

    const result1 = await fetchLanguageData();
    const result2 = await fetchLanguageData();
    expect(result1).toBe(result2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("handles failed language fetch gracefully", async () => {
    const repos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => repos })
      .mockResolvedValueOnce({ ok: false, status: 403 }) // Failed language fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Python: 500 }) });

    const result = await fetchLanguageData();
    expect(result).toEqual({ Python: 500 });
  });

  it("fetches from organizations", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_ORGS", "test-org");

    const orgRepos = [
      { name: "org-repo", fork: false, full_name: "test-org/org-repo" }
    ];

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => orgRepos })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ TypeScript: 4000 }) })

    const result = await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/orgs/test-org/repos?per_page=100"
    );
    expect(result).toEqual({ TypeScript: 4000 });
  });
});

describe("processLanguageData", () => {
  it("calculates percentages correctly", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lang: "JavaScript", pct: 50 });
    expect(result[1]).toEqual({ lang: "Python", pct: 30 });
    expect(result[2]).toEqual({ lang: "HTML", pct: 20 });
  });

  it("sorts by percentage descending", () => {
    const data = { HTML: 1000, JavaScript: 5000, Python: 3000 };
    const result = processLanguageData(data, 3);

    expect(result[0].lang).toBe("JavaScript");
    expect(result[1].lang).toBe("Python");
    expect(result[2].lang).toBe("HTML");
  });

  it("limits to count", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000, CSS: 1000 };
    const result = processLanguageData(data, 2);

    expect(result).toHaveLength(2);
    expect(result.map(l => l.lang)).toEqual(["JavaScript", "Python"]);
  });

  it("renormalizes percentages after slicing", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 2);

    const totalPct = result.reduce((sum, l) => sum + l.pct, 0);
    expect(totalPct).toBeCloseTo(100);
  });

  it("throws when no language data", () => {
    expect(() => processLanguageData({}, 5)).toThrow("No language data available");
  });
});
