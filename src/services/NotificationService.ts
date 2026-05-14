import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 앱 전역 알림 동작. 모듈 로드 시 한 번 등록.
// foreground일 때도 배너로 표시 — swap 성공 모달과 약간 중복되지만 백그라운드 케이스 일관성 우선.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowAlert: true, // legacy field for older OS combos
    }),
});

export const SWAP_CHANNEL_ID = "swap-events";

// Android는 채널 등록 후에만 알림이 정상 표시됨. iOS는 채널 개념 없음.
export async function ensureSwapChannel(): Promise<void>
{
    if (Platform.OS !== "android")
    {
        return;
    }
    await Notifications.setNotificationChannelAsync(SWAP_CHANNEL_ID, {
        name: "Swap events",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: "#9945FF",
        showBadge: false,
    });
}

export type PermissionStatus = "granted" | "denied" | "undetermined";

function normalizeStatus(raw: string): PermissionStatus
{
    if (raw === "granted") return "granted";
    if (raw === "denied") return "denied";
    return "undetermined";
}

export async function getPermissionStatus(): Promise<PermissionStatus>
{
    const result = await Notifications.getPermissionsAsync();
    return normalizeStatus(result.status);
}

// OS 권한 요청. 이미 허용된 경우 즉시 'granted' 반환.
// 거부된 경우 OS 정책상 같은 세션에서 재요청 불가 — 사용자가 시스템 설정에서 직접 변경해야 함.
export async function requestPermission(): Promise<PermissionStatus>
{
    const current = await getPermissionStatus();
    if (current === "granted")
    {
        return "granted";
    }
    const result = await Notifications.requestPermissionsAsync();
    return normalizeStatus(result.status);
}

export interface SwapNotificationPayload
{
    title: string;
    body: string;
    signature: string;
}

export async function notifySwapSuccess(payload: SwapNotificationPayload): Promise<void>
{
    await Notifications.scheduleNotificationAsync({
        content: {
            title: payload.title,
            body: payload.body,
            data: {
                signature: payload.signature,
                url: `https://solscan.io/tx/${payload.signature}`,
            },
        },
        trigger: null, // immediate
    });
}

// 사용자가 알림을 탭했을 때 호출되는 리스너 등록. unsubscribe 함수 반환.
export function addTapListener(
    handler: (signature: string | undefined, url: string | undefined) => void,
): () => void
{
    const sub = Notifications.addNotificationResponseReceivedListener((response) =>
    {
        const data = response.notification.request.content.data as
            | { signature?: string; url?: string }
            | undefined;
        handler(data?.signature, data?.url);
    });
    return () => sub.remove();
}
