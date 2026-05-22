import { PublicKey } from "@solana/web3.js";

import { KAMINO_MAIN_MARKET } from "@/constants/lending";

import { lendingMarketAuthority, userMetadata, obligationFarmUserState } from "./kaminoAccounts";

// 기준값: SDK(kit) 의 seeds 유틸로 계산 (scratch, 2026-05-21).
const MARKET = new PublicKey(KAMINO_MAIN_MARKET);
const USER = new PublicKey("So11111111111111111111111111111111111111112");
const CBBTC_FARM = new PublicKey("9CinLHLAcMkzs4Ji8pwS2qwyz1LU46A4Ry7BNLGLubxs");
const TEST_OBLIGATION = new PublicKey("BqAVQC4SHR2UbU2Wwh45465Ez1YZ7SoC5niBLioBCgQq");

describe("kaminoAccounts PDA (SDK cross-check)", () =>
{
    it("lendingMarketAuthority", () =>
    {
        expect(lendingMarketAuthority(MARKET).toBase58()).toBe("9DrvZvyWh1HuAoZxvYWMvkf2XCzryCpGgHqrMjyDWpmo");
    });

    it("userMetadata", () =>
    {
        expect(userMetadata(USER).toBase58()).toBe("3EPbKVc3VhtJZUQj6SziWx1gMr6Qw4Ck6tQK1avPdAQp");
    });

    it("obligationFarmUserState (farms program)", () =>
    {
        expect(obligationFarmUserState(CBBTC_FARM, TEST_OBLIGATION).toBase58())
            .toBe("HC2f95QyTuRKiVh9pGxDxoGAAkNDLnSqouoiX1BLsWiT");
    });
});
