import * as LocalAuthentication from "expo-local-authentication";

// expo-local-authentication 래퍼. 디바이스 능력 점검 + biometric prompt.
// Seeker의 hardware-backed biometric (지문/얼굴)을 활용.

export interface DeviceLockCapability
{
    hasHardware: boolean;
    isEnrolled: boolean;
    /** 사용 가능한 인증 종류. Android에서 보통 [FINGERPRINT] 또는 [FACE/IRIS] */
    types: LocalAuthentication.AuthenticationType[];
}

export async function getCapability(): Promise<DeviceLockCapability>
{
    const [hasHardware, isEnrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return { hasHardware, isEnrolled, types };
}

export type AuthenticateOutcome =
    | { kind: "success" }
    | { kind: "cancelled" }
    | { kind: "fallback-needed" }
    | { kind: "error"; message: string };

// authenticateAsync는 OS-native prompt를 표시. 결과를 정규화해 상위에 전달.
// disableDeviceFallback: false (기본) — biometric 실패 시 OS가 PIN/패턴 fallback을 자동 제공.
export async function authenticate(promptMessage: string): Promise<AuthenticateOutcome>
{
    try
    {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            disableDeviceFallback: false,
            // Android에서 cancellation 처리 명확하게
            cancelLabel: undefined,
        });

        if (result.success)
        {
            return { kind: "success" };
        }
        // Expo API: result.error가 "user_cancel" | "system_cancel" | "user_fallback" | "lockout" 등
        if (result.error === "user_cancel" || result.error === "system_cancel")
        {
            return { kind: "cancelled" };
        }
        if (result.error === "user_fallback")
        {
            return { kind: "fallback-needed" };
        }
        return { kind: "error", message: result.error ?? "unknown" };
    }
    catch (err)
    {
        const msg = err instanceof Error ? err.message : String(err);
        return { kind: "error", message: msg };
    }
}
