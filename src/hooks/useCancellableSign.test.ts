import { renderHook } from "@testing-library/react-native";

import { useCancellableSign } from "./useCancellableSign";

describe("useCancellableSign", () =>
{
    it("begin returns a fresh token each call; only the latest is current", () =>
    {
        const { result } = renderHook(() => useCancellableSign());
        const t1 = result.current.begin();
        expect(result.current.isCurrent(t1)).toBe(true);
        const t2 = result.current.begin();
        expect(result.current.isCurrent(t2)).toBe(true);
        // 이전 토큰은 더 이상 current 아님 (stale)
        expect(result.current.isCurrent(t1)).toBe(false);
    });

    it("cancel invalidates the in-flight token", () =>
    {
        const { result } = renderHook(() => useCancellableSign());
        const t = result.current.begin();
        expect(result.current.isCurrent(t)).toBe(true);
        result.current.cancel();
        expect(result.current.isCurrent(t)).toBe(false);
    });

    it("a token from before cancel stays invalid even after a new begin", () =>
    {
        const { result } = renderHook(() => useCancellableSign());
        const stale = result.current.begin();
        result.current.cancel();
        const fresh = result.current.begin();
        expect(result.current.isCurrent(stale)).toBe(false);
        expect(result.current.isCurrent(fresh)).toBe(true);
    });

    it("identity is stable across renders (callbacks don't change)", () =>
    {
        const { result, rerender } = renderHook(() => useCancellableSign());
        const begin1 = result.current.begin;
        rerender({});
        expect(result.current.begin).toBe(begin1);
    });
});
