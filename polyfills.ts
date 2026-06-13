// 다른 모든 import보다 먼저 평가되어야 하는 polyfill 모음.
// index.ts에서 가장 처음 `import "./polyfills"`로 호출.
// 한 파일로 격리한 이유: ESM/Metro에서 동일 파일 안의 import가 호이스트되어
// `global.Buffer = Buffer` 라인이 web3.js의 transitive import 뒤에 실행되는 문제를 회피.

import "react-native-get-random-values";
import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined")
{
    global.Buffer = Buffer;
}

// Hermes 는 TypedArray 서브클래싱(species constructor)을 지원하지 않아 Buffer.subarray() 가
// Buffer 가 아닌 평범한 Uint8Array 를 반환한다 → anchor/borsh 계열의 readUIntLE/readBigUInt64LE
// 등이 "b.readUIntLE is not a function" 으로 죽는다 (Solana Mobile 공식 문서의 알려진 이슈).
// Atomiq chain-solana(anchor 0.29)의 LP 평판 계정 파싱에서 실제 발생 (M17.1, 2026-06-13).
// 표준 패치: subarray 결과에 Buffer 프로토타입을 복원.
const subarrayBroken = (() =>
{
    const probe = Buffer.alloc(2).subarray(0, 1) as unknown as { readUIntLE?: unknown };
    return typeof probe.readUIntLE !== "function";
})();

if (subarrayBroken)
{
    Buffer.prototype.subarray = function subarray(this: Buffer, begin?: number, end?: number): Buffer
    {
        const result = Uint8Array.prototype.subarray.call(this, begin, end);
        Object.setPrototypeOf(result, Buffer.prototype);
        return result as Buffer;
    };
}

// Hermes 의 AbortSignal 에는 최신 스펙의 throwIfAborted() 가 없다 (RN 0.81 / 2026-06 기준).
// Atomiq SDK 가 48곳에서 호출 — 없으면 LP discovery 가 전부 TypeError 로 죽어
// "No intermediary found" 가 된다 (M17.1 디바이스 검증에서 발견, 2026-06-13).
interface AbortSignalCompat
{
    aborted: boolean;
    reason?: unknown;
    throwIfAborted?: () => void;
}

const abortSignalProto = (globalThis as {
    AbortSignal?: { prototype: AbortSignalCompat };
}).AbortSignal?.prototype;

if (abortSignalProto && typeof abortSignalProto.throwIfAborted !== "function")
{
    abortSignalProto.throwIfAborted = function (this: AbortSignalCompat): void
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
    };
}
