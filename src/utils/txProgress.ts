// 트랜잭션 진행 단계 (supply/borrow/repay/withdraw 공용).
// 실제 mutation 의 async 경계에 1:1 대응 — 가짜 진행이 아님.
//   preparing  : 트랜잭션 조립 (계정 조회·instruction 빌드)
//   simulating : 서명 전 시뮬레이션 (안전 게이트)
//   signing    : 지갑(Seed Vault/MWA) 승인 대기
//   sending    : 네트워크 제출됨
//   confirming : 온체인 확정 대기 (getSignatureStatuses 폴링 — 확정 전 성공 처리 방지)
//   done       : 포지션 갱신 완료

export type TxStep = "preparing" | "simulating" | "signing" | "sending" | "confirming" | "done";

export const TX_STEPS: readonly TxStep[] = ["preparing", "simulating", "signing", "sending", "confirming", "done"];

export type ProgressState = "running" | "success" | "error";

export type StepVisual = "done" | "active" | "pending" | "error";

/** 특정 단계의 시각 상태 (current = 현재 진행/실패 단계, state = 전체 상태). */
export function stepVisual(step: TxStep, current: TxStep, state: ProgressState): StepVisual
{
    const si = TX_STEPS.indexOf(step);
    const ci = TX_STEPS.indexOf(current);

    if (state === "error")
    {
        if (si < ci)
        {
            return "done";
        }
        return si === ci ? "error" : "pending";
    }
    // running | success
    if (si < ci)
    {
        return "done";
    }
    if (si === ci)
    {
        return state === "success" ? "done" : "active";
    }
    return "pending";
}

/** 진행 비율 0~1 (진행 막대용). */
export function stepProgressRatio(current: TxStep): number
{
    return TX_STEPS.indexOf(current) / (TX_STEPS.length - 1);
}
