import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    isStaleAuth,
    loadWalletConnectedAt,
    markAuthFailureNow,
    saveWalletConnectedAt,
    STALE_THRESHOLD_MS,
} from "./walletAuthAge";

beforeEach(async () =>
{
    await AsyncStorage.clear();
});

describe("walletAuthAge storage", () =>
{
    it("returns null when nothing stored", async () =>
    {
        expect(await loadWalletConnectedAt()).toBeNull();
    });

    it("round-trips a timestamp", async () =>
    {
        const t = 1_700_000_000_000;
        await saveWalletConnectedAt(t);
        expect(await loadWalletConnectedAt()).toBe(t);
    });

    it("null clears the entry", async () =>
    {
        await saveWalletConnectedAt(1_700_000_000_000);
        await saveWalletConnectedAt(null);
        expect(await loadWalletConnectedAt()).toBeNull();
    });

    it("markAuthFailureNow forces stale by writing 0", async () =>
    {
        await saveWalletConnectedAt(Date.now());
        await markAuthFailureNow();
        expect(await loadWalletConnectedAt()).toBe(0);
    });
});

describe("isStaleAuth", () =>
{
    const now = 1_700_000_000_000;

    it("returns false when freshly connected", () =>
    {
        expect(isStaleAuth(now - 1_000, now)).toBe(false);
        expect(isStaleAuth(now - (STALE_THRESHOLD_MS - 1), now)).toBe(false);
    });

    it("returns true at exactly the threshold", () =>
    {
        expect(isStaleAuth(now - STALE_THRESHOLD_MS, now)).toBe(true);
    });

    it("returns true past the threshold", () =>
    {
        expect(isStaleAuth(now - STALE_THRESHOLD_MS - 60_000, now)).toBe(true);
    });

    it("returns true for 0 (failure-marked, deterministic stale)", () =>
    {
        expect(isStaleAuth(0, now)).toBe(true);
    });

    it("returns false when connectedAt is null (no wallet connected yet)", () =>
    {
        expect(isStaleAuth(null, now)).toBe(false);
    });

    it("returns false for clock skew (negative age)", () =>
    {
        // 미래 timestamp 가 들어오면 (시계 조정 등) stale 로 보지 않음.
        expect(isStaleAuth(now + 60_000, now)).toBe(false);
    });
});

describe("STALE_THRESHOLD_MS", () =>
{
    it("is 12 hours", () =>
    {
        expect(STALE_THRESHOLD_MS).toBe(12 * 60 * 60 * 1000);
    });
});
