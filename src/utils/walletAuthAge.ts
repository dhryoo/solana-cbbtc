import AsyncStorage from "@react-native-async-storage/async-storage";

// MWA 세션 만료 사전 감지.
//
// 두 가지 신호로 stale 판정:
//   1) 시간 기반 — 마지막 성공한 connect/reauthorize 로부터 12시간 이상 지났으면 의심
//   2) 실패 이력 — isAuthFailure 가 한 번이라도 발생하면 connectedAt 을 0 으로 마킹 → 다음 진입부터 deterministic stale
//
// 사용자가 수동으로 재연결하면 connect() 가 다시 Date.now() 저장 → 배너 사라짐 → 12시간 사이클 재개.
// no-backend 정책 준수 — 로컬 AsyncStorage 만 사용.

export const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

const KEY = "wallet:connectedAt";

export async function saveWalletConnectedAt(ts: number | null): Promise<void>
{
    try
    {
        if (ts === null)
        {
            await AsyncStorage.removeItem(KEY);
        }
        else
        {
            await AsyncStorage.setItem(KEY, String(ts));
        }
    }
    catch
    {
        // 저장 실패는 silently 무시 — 사용자에게는 다음 세션에 배너 다시 뜨는 정도.
    }
}

export async function loadWalletConnectedAt(): Promise<number | null>
{
    try
    {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw === null)
        {
            return null;
        }
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }
    catch
    {
        return null;
    }
}

/** isAuthFailure 가 발생했을 때 호출 — connectedAt 을 0 으로 마킹해서 즉시 stale 판정되게. */
export async function markAuthFailureNow(): Promise<void>
{
    await saveWalletConnectedAt(0);
}

/**
 * stale 여부 판정 (순수 함수, 테스트 친화).
 *
 * - null: 지갑 연결 전 → 배너 X (의미 없음)
 * - 0: 실패 이력 마킹 → stale
 * - 12시간 이상 지남 → stale
 * - 음수 age(미래 timestamp, 시계 조정): stale 아님 (안전 기본값)
 */
export function isStaleAuth(connectedAt: number | null, now: number): boolean
{
    if (connectedAt === null)
    {
        return false;
    }
    if (connectedAt === 0)
    {
        return true;
    }
    const age = now - connectedAt;
    if (age < 0)
    {
        return false;
    }
    return age >= STALE_THRESHOLD_MS;
}
