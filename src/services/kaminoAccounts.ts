import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

import { farmsProgramPubkey, klendProgramPubkey } from "@/constants/lending";

// Kamino K-Lend 의 PDA 유도 (web3.js v1). SDK 의 kit 기반 seeds 유틸과 동일한 seed 구성.
// (klend-sdk/dist/utils/seeds.js 참고. 모두 [seed 문자열, pubkey] 2-seed PDA.)
//
// 이 PDA 들은 reserve / market / user pubkey 로 시드되며 트랜잭션 빌드 시 계정으로 쓰인다.

function pda(seeds: Buffer[]): PublicKey
{
    return PublicKey.findProgramAddressSync(seeds, klendProgramPubkey())[0];
}

// 주의: reserve 의 vault 들(liquiditySupply, collateralMint, collateralSupply, feeVault)은
// PDA 로 유도하지 말 것. Kamino reserve 는 실제 vault 주소를 reserve state 에 저장하며
// (reserve.liquidity.supplyVault 등), PDA 유도값과 다를 수 있다 (3012 AccountNotInitialized).
// 따라서 여기서는 state 에 없는 PDA(lendingMarketAuthority, userMetadata)만 유도한다.

export function lendingMarketAuthority(market: PublicKey): PublicKey
{
    return pda([Buffer.from("lma"), market.toBuffer()]);
}

export function userMetadata(user: PublicKey): PublicKey
{
    return pda([Buffer.from("user_meta"), user.toBuffer()]);
}

// 사용자의 obligation farm user state (FARMS program). reserve 에 farm 이 붙은 경우
// deposit/borrow 시 farm refresh 의 obligationFarmUserState 계정으로 쓰인다.
// seeds: ['user', farm, obligation] (Kamino farms seeds 와 동일).
export function obligationFarmUserState(farm: PublicKey, obligation: PublicKey): PublicKey
{
    return PublicKey.findProgramAddressSync(
        [Buffer.from("user"), farm.toBuffer(), obligation.toBuffer()],
        farmsProgramPubkey(),
    )[0];
}
