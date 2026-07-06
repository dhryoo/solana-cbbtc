import * as LocalAuthentication from "expo-local-authentication";

import { authenticate, getCapability } from "./AppLockService";

jest.mock("expo-local-authentication");

const mockedLA = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

describe("getCapability", () =>
{
    it("hasHardware / isEnrolled / types 를 모아 반환", async () =>
    {
        mockedLA.hasHardwareAsync.mockResolvedValue(true);
        mockedLA.isEnrolledAsync.mockResolvedValue(false);
        mockedLA.supportedAuthenticationTypesAsync.mockResolvedValue([1]);

        expect(await getCapability()).toEqual({ hasHardware: true, isEnrolled: false, types: [1] });
    });
});

describe("authenticate — 결과 정규화", () =>
{
    afterEach(() =>
    {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("success → { kind: 'success' }", async () =>
    {
        mockedLA.authenticateAsync.mockResolvedValue({ success: true });
        expect(await authenticate("unlock")).toEqual({ kind: "success" });
    });

    it("user_cancel / system_cancel → cancelled", async () =>
    {
        mockedLA.authenticateAsync.mockResolvedValue({ success: false, error: "user_cancel" });
        expect(await authenticate("x")).toEqual({ kind: "cancelled" });
        mockedLA.authenticateAsync.mockResolvedValue({ success: false, error: "system_cancel" });
        expect(await authenticate("x")).toEqual({ kind: "cancelled" });
    });

    it("user_fallback → fallback-needed", async () =>
    {
        mockedLA.authenticateAsync.mockResolvedValue({ success: false, error: "user_fallback" });
        expect(await authenticate("x")).toEqual({ kind: "fallback-needed" });
    });

    it("그 외 에러(lockout 등) → { kind: 'error', message }", async () =>
    {
        mockedLA.authenticateAsync.mockResolvedValue({ success: false, error: "lockout" });
        expect(await authenticate("x")).toEqual({ kind: "error", message: "lockout" });
    });

    it("authenticateAsync 가 throw → { kind: 'error' }", async () =>
    {
        mockedLA.authenticateAsync.mockRejectedValue(new Error("native boom"));
        expect(await authenticate("x")).toEqual({ kind: "error", message: "native boom" });
    });

    it("OS prompt 가 hang(무한 대기)하면 timeoutMs 뒤 error:timeout 으로 방어", async () =>
    {
        jest.useFakeTimers();
        // 절대 resolve 되지 않는 prompt (known Android hang 재현)
        mockedLA.authenticateAsync.mockReturnValue(new Promise(() => { /* never */ }));

        const p = authenticate("x", 5_000);
        await jest.advanceTimersByTimeAsync(5_000);
        await expect(p).resolves.toEqual({ kind: "error", message: "timeout" });
    });
});
