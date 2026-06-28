// Hermes(RN)가 빠뜨린 표준 런타임 메서드들의 순수 구현.
// WHY 분리: 루트 polyfills.ts 는 import 시점 side-effect(global 설치)라 jest 에서 테스트가 불가능하고,
//   Node 에는 native 가 이미 있어 설치 가드가 항상 false → 패치 본문이 CI 에서 한 번도 실행되지 않는다.
//   순수 함수만 떼어 직접 단위 테스트하면 device-only 회귀(subarray/throwIfAborted/timeout/any)를
//   CI 계약으로 고정한다. 설치는 polyfills.ts 가 환경 가드 뒤에서 이 함수들을 할당한다.
//   (M17.1/M18 디바이스 디버깅에서 실제로 깨졌던 함정들 — 자세한 배경은 polyfills.ts 주석 참조)

import { Buffer } from "buffer";

export interface AbortSignalCompat
{
    aborted: boolean;
    reason?: unknown;
}

/**
 * Hermes 의 Buffer.subarray 는 species constructor 미지원으로 평범한 Uint8Array 를 반환해
 * readUIntLE/readBigUInt64LE 등이 사라진다(anchor/borsh 가 "readUIntLE is not a function"으로 죽음).
 * 결과에 Buffer 프로토타입을 복원한다.
 */
export function patchedSubarray(this: Buffer, begin?: number, end?: number): Buffer
{
    const result = Uint8Array.prototype.subarray.call(this, begin, end);
    Object.setPrototypeOf(result, Buffer.prototype);
    return result as Buffer;
}

/**
 * AbortSignal.prototype.throwIfAborted 대체.
 * reason 이 Error 면 그대로 던지고, 아니면 AbortError 이름의 Error 로 던진다.
 */
export function patchedThrowIfAborted(this: AbortSignalCompat): void
{
    if (this.aborted)
    {
        const reason = this.reason;
        if (reason instanceof Error)
        {
            throw reason;
        }
        const err = new Error(reason === undefined ? "Aborted" : String(reason));
        err.name = "AbortError";
        throw err;
    }
}

/** AbortSignal.timeout 대체 — ms 후 TimeoutError 로 abort 되는 signal 을 반환. */
export function timeoutSignal(ms: number): AbortSignal
{
    const controller = new AbortController();
    setTimeout(() =>
    {
        const err = new Error("The operation timed out");
        err.name = "TimeoutError";
        // abort(reason) 미지원 환경이면 reason 없이 abort (동작은 동일)
        try { (controller.abort as (r?: unknown) => void)(err); }
        catch { controller.abort(); }
    }, ms);
    return controller.signal;
}

/** AbortSignal.any 대체 — 입력 signal 중 하나라도 abort 되면 abort. 이미 aborted 면 즉시. */
export function anySignal(signals: Iterable<AbortSignal>): AbortSignal
{
    const controller = new AbortController();
    const list = Array.from(signals);
    const onAbort = (sig: AbortSignal): void =>
    {
        try { (controller.abort as (r?: unknown) => void)((sig as { reason?: unknown }).reason); }
        catch { controller.abort(); }
    };
    for (const sig of list)
    {
        if (sig.aborted)
        {
            onAbort(sig);
            break;
        }
        sig.addEventListener("abort", () => onAbort(sig), { once: true });
    }
    return controller.signal;
}
