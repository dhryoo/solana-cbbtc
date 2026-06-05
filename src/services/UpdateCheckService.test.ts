import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    compareSemver,
    fetchLatestRelease,
    loadIgnoredVersion,
    parseSemver,
    saveIgnoredVersion,
    type LatestRelease,
} from "./UpdateCheckService";

beforeEach(async () =>
{
    await AsyncStorage.clear();
});

describe("parseSemver", () =>
{
    it("strips 'v' prefix", () =>
    {
        expect(parseSemver("v0.2.3")).toEqual({ major: 0, minor: 2, patch: 3 });
    });

    it("handles no prefix", () =>
    {
        expect(parseSemver("1.4.7")).toEqual({ major: 1, minor: 4, patch: 7 });
    });

    it("handles double-digit components", () =>
    {
        expect(parseSemver("0.2.10")).toEqual({ major: 0, minor: 2, patch: 10 });
    });

    it("ignores prerelease/build suffix", () =>
    {
        expect(parseSemver("v1.2.3-rc1")).toEqual({ major: 1, minor: 2, patch: 3 });
        expect(parseSemver("0.2.3+build.42")).toEqual({ major: 0, minor: 2, patch: 3 });
    });

    it("returns null on invalid", () =>
    {
        expect(parseSemver("abc")).toBeNull();
        expect(parseSemver("0.2")).toBeNull();
        expect(parseSemver("")).toBeNull();
    });
});

describe("compareSemver", () =>
{
    it("compares major", () =>
    {
        expect(compareSemver("2.0.0", "1.99.99")).toBe(1);
        expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    });

    it("compares minor when major equal", () =>
    {
        expect(compareSemver("0.3.0", "0.2.99")).toBe(1);
    });

    it("compares patch when major+minor equal", () =>
    {
        expect(compareSemver("0.2.10", "0.2.9")).toBe(1);
        expect(compareSemver("0.2.3", "0.2.4")).toBe(-1);
    });

    it("equal => 0", () =>
    {
        expect(compareSemver("v0.2.3", "0.2.3")).toBe(0);
    });

    it("invalid version => 0 (safe fallback, never shows banner)", () =>
    {
        expect(compareSemver("invalid", "0.2.3")).toBe(0);
        expect(compareSemver("0.2.3", "invalid")).toBe(0);
    });
});

describe("loadIgnoredVersion / saveIgnoredVersion", () =>
{
    it("returns null when nothing stored", async () =>
    {
        expect(await loadIgnoredVersion()).toBeNull();
    });

    it("round-trips a version", async () =>
    {
        await saveIgnoredVersion("0.2.3");
        expect(await loadIgnoredVersion()).toBe("0.2.3");
    });

    it("clearing with null removes the entry", async () =>
    {
        await saveIgnoredVersion("0.2.3");
        await saveIgnoredVersion(null);
        expect(await loadIgnoredVersion()).toBeNull();
    });
});

describe("fetchLatestRelease", () =>
{
    function mockFetchOnce(status: number, body: unknown): void
    {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
        });
    }

    it("returns the parsed release on 200", async () =>
    {
        mockFetchOnce(200, {
            tag_name: "v0.2.3",
            name: "v0.2.3",
            body: "- bug fixes\n- new spinner",
            html_url: "https://github.com/dhryoo/solana-cbbtc/releases/tag/v0.2.3",
            published_at: "2026-05-30T00:00:00Z",
            prerelease: false,
            draft: false,
        });
        const r = await fetchLatestRelease("dhryoo", "solana-cbbtc");
        const expected: LatestRelease = {
            tag: "v0.2.3",
            name: "v0.2.3",
            body: "- bug fixes\n- new spinner",
            htmlUrl: "https://github.com/dhryoo/solana-cbbtc/releases/tag/v0.2.3",
            publishedAt: "2026-05-30T00:00:00Z",
        };
        expect(r).toEqual(expected);
    });

    it("returns null on 404 (no releases yet)", async () =>
    {
        mockFetchOnce(404, { message: "Not Found" });
        expect(await fetchLatestRelease("dhryoo", "solana-cbbtc")).toBeNull();
    });

    it("returns null on rate limit (no spam)", async () =>
    {
        mockFetchOnce(403, { message: "API rate limit exceeded" });
        expect(await fetchLatestRelease("dhryoo", "solana-cbbtc")).toBeNull();
    });

    it("returns null on network failure", async () =>
    {
        global.fetch = jest.fn().mockRejectedValueOnce(new Error("network"));
        expect(await fetchLatestRelease("dhryoo", "solana-cbbtc")).toBeNull();
    });

    it("returns null when response missing tag_name", async () =>
    {
        mockFetchOnce(200, { name: "weird", body: "" });
        expect(await fetchLatestRelease("dhryoo", "solana-cbbtc")).toBeNull();
    });
});
