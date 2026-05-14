import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { Platform } from "react-native";

import { SEEKER_DEVICE_MODEL, SGT_MINT_AUTHORITY } from "@/constants/seeker";

// Platform.constants.Model을 통한 디바이스 식별. Android 전용.
// 한계: 다른 폰에서 model을 변경해 spoof 가능 — 권한 부여에는 사용 X. 단순 UX 힌트.
export function isSeekerDevice(): boolean
{
    if (Platform.OS !== "android")
    {
        return false;
    }
    // Platform.constants는 RN의 plat-specific 상수. Android에서 Model 필드 존재.
    const model = (Platform.constants as { Model?: string }).Model;
    return model === SEEKER_DEVICE_MODEL;
}

// 연결된 지갑이 Seed Vault Wallet일 가능성이 높은지 판정.
// 실기 관찰: Seeker에서 Seed Vault로 연결하면 wallet_uri_base가 빈 문자열로 옴.
// 다른 지갑(Phantom 등)은 보통 자체 URI(예: https://phantom.app/...)를 설정.
// 따라서 (Seeker 디바이스 + walletUriBase가 빈/undefined) 조합을 Seed Vault로 추정.
// 한계: Seeker 폰에 다른 지갑을 설치하고 그 지갑이 URI를 안 설정하면 false positive 가능.
export function isLikelySeedVault(walletUriBase: string | undefined | null): boolean
{
    const empty = walletUriBase === undefined || walletUriBase === null || walletUriBase === "";
    return empty && isSeekerDevice();
}

// 사용자 지갑이 Seeker Genesis Token을 보유하는지 확인.
// Token-2022 토큰 계정을 모두 조회 후 각 mint의 authority가 SGT_MINT_AUTHORITY와 일치하면 보유.
// 보유 중인 토큰이 많으면 RPC 호출이 늘어나지만 보통 사용자의 Token-2022 holdings는 매우 적음.
export async function hasGenesisToken(
    connection: Connection,
    owner: PublicKey,
): Promise<boolean>
{
    const response = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_2022_PROGRAM_ID,
    });

    if (response.value.length === 0)
    {
        return false;
    }

    // 잔액 > 0인 mint들만 확인 대상으로 추림
    const candidateMints: PublicKey[] = [];
    for (const { account } of response.value)
    {
        // parsed token account의 data는 ParsedAccountData | Buffer 둘 다 가능.
        // jsonParsed로 받았으니 ParsedAccountData 형태여야 함.
        const data = account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number | null } } } };
        const info = data.parsed?.info;
        const ui = info?.tokenAmount?.uiAmount;
        if (!info?.mint || !ui || ui <= 0)
        {
            continue;
        }
        candidateMints.push(new PublicKey(info.mint));
    }

    if (candidateMints.length === 0)
    {
        return false;
    }

    // 각 mint의 authority를 병렬 조회. mint authority 매칭 시 즉시 true.
    const mintInfos = await Promise.all(
        candidateMints.map((mint) => connection.getParsedAccountInfo(mint)),
    );

    const expected = SGT_MINT_AUTHORITY.toBase58();
    for (const result of mintInfos)
    {
        const data = result.value?.data as
            | { parsed?: { info?: { mintAuthority?: string | null } } }
            | undefined;
        const mintAuthority = data?.parsed?.info?.mintAuthority;
        if (mintAuthority === expected)
        {
            return true;
        }
    }

    return false;
}
