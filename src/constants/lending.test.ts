import { PublicKey } from "@solana/web3.js";

import {
    KAMINO_MAIN_MARKET,
    kaminoMainMarketPubkey,
    RECOMMENDED_MAX_LTV,
    WARN_LTV,
    HEALTH_SAFE_MIN,
    HEALTH_CAUTION_MIN,
} from "./lending";

describe("lending constants", () =>
{
    it("KAMINO_MAIN_MARKET 는 유효한 base58 PublicKey", () =>
    {
        expect(() => new PublicKey(KAMINO_MAIN_MARKET)).not.toThrow();
    });

    it("kaminoMainMarketPubkey() 는 같은 주소의 PublicKey 반환", () =>
    {
        expect(kaminoMainMarketPubkey().toBase58()).toBe(KAMINO_MAIN_MARKET);
    });

    it("보수적 LTV 정책: 0 < RECOMMENDED_MAX_LTV < WARN_LTV < 1 (D-6)", () =>
    {
        expect(RECOMMENDED_MAX_LTV).toBeGreaterThan(0);
        expect(RECOMMENDED_MAX_LTV).toBeLessThan(WARN_LTV);
        expect(WARN_LTV).toBeLessThan(1);
    });

    it("health 임계: 1 < HEALTH_CAUTION_MIN < HEALTH_SAFE_MIN", () =>
    {
        // health factor 1.0 이 청산선이므로 주의 임계는 그보다 커야 함
        expect(HEALTH_CAUTION_MIN).toBeGreaterThan(1);
        expect(HEALTH_CAUTION_MIN).toBeLessThan(HEALTH_SAFE_MIN);
    });
});
