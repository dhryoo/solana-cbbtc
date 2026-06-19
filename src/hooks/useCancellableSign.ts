import { useCallback, useRef } from "react";

// MWA(Seed Vault) 서명 흐름의 stale-callback 가드 + 취소 토대.
//
// 왜 필요한가: Seeker Seed Vault 는 "거부" 버튼 없이 X(닫기)만 제공한다. X 로 닫으면 MWA 가
// 취소 응답을 보내지 않아 서명 promise 가 영원히 pending → 진행 표시가 멈춰 강제종료뿐.
// (Lightning send 에서 발견·해결한 패턴을 공통화 — Earn/Swap/Receive 에도 적용)
//
// 사용법:
//   const sign = useCancellableSign();
//   const onSubmit = () => {
//       const token = sign.begin();                 // 시도 시작
//       mutate(input, {
//           onSuccess: (r) => { if (!sign.isCurrent(token)) return; ... },
//           onError:   (e) => { if (!sign.isCurrent(token)) return; ... },
//       });
//   };
//   const onCancel = () => { sign.cancel(); /* 로컬 progress 초기화 */ };
// 취소 시 진행 중 promise 의 뒤늦은 settle 은 isCurrent 가 false 라 무시된다.

export interface CancellableSign
{
    /** 새 시도 시작 — 반환 토큰을 콜백 가드에 사용 */
    begin: () => number;
    /** 콜백이 현재(최신) 시도인지 — false 면 폐기된 시도이므로 무시 */
    isCurrent: (token: number) => boolean;
    /** 진행 중 시도 폐기 — 멈춘/뒤늦은 settle 을 무시하게 만든다 */
    cancel: () => void;
}

export function useCancellableSign(): CancellableSign
{
    const tokenRef = useRef(0);
    const begin = useCallback((): number => ++tokenRef.current, []);
    const isCurrent = useCallback((token: number): boolean => token === tokenRef.current, []);
    const cancel = useCallback((): void => { tokenRef.current += 1; }, []);
    return { begin, isCurrent, cancel };
}
