import { isStale, relativeTime } from "./relativeTime";

describe("relativeTime", () =>
{
    const NOW = 1_000_000_000_000;

    it("returns 'never' key for null/undefined", () =>
    {
        expect(relativeTime(null, NOW).key).toBe("relative.never");
        expect(relativeTime(undefined, NOW).key).toBe("relative.never");
    });

    it("returns 'justNow' for under 5 seconds", () =>
    {
        expect(relativeTime(NOW - 3_000, NOW).key).toBe("relative.justNow");
    });

    it("returns secondsAgo with count for under 60s", () =>
    {
        const r = relativeTime(NOW - 30_000, NOW);
        expect(r.key).toBe("relative.secondsAgo");
        expect(r.params?.count).toBe(30);
    });

    it("returns minutesAgo for under 1h", () =>
    {
        const r = relativeTime(NOW - 5 * 60_000, NOW);
        expect(r.key).toBe("relative.minutesAgo");
        expect(r.params?.count).toBe(5);
    });

    it("returns hoursAgo for under 24h", () =>
    {
        const r = relativeTime(NOW - 3 * 3600_000, NOW);
        expect(r.key).toBe("relative.hoursAgo");
        expect(r.params?.count).toBe(3);
    });

    it("returns daysAgo for >= 24h", () =>
    {
        const r = relativeTime(NOW - 48 * 3600_000, NOW);
        expect(r.key).toBe("relative.daysAgo");
        expect(r.params?.count).toBe(2);
    });
});

describe("isStale", () =>
{
    const NOW = 1_000_000_000_000;

    it("returns true for null/undefined timestamps", () =>
    {
        expect(isStale(null, 10, NOW)).toBe(true);
        expect(isStale(undefined, 10, NOW)).toBe(true);
    });

    it("returns false when within threshold", () =>
    {
        expect(isStale(NOW - 5_000, 10, NOW)).toBe(false);
    });

    it("returns true when beyond threshold", () =>
    {
        expect(isStale(NOW - 15_000, 10, NOW)).toBe(true);
    });
});
