import * as Haptics from "expo-haptics";

// 햅틱 피드백 wrapper. 실패 시 silently 무시 (햅틱 미지원 디바이스).
// Android/iOS 모두에서 동일 동작.

export async function hapticLight(): Promise<void>
{
    try
    {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    catch
    {
        // 미지원 디바이스
    }
}

export async function hapticMedium(): Promise<void>
{
    try
    {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    catch { /* ignore */ }
}

export async function hapticSuccess(): Promise<void>
{
    try
    {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    catch { /* ignore */ }
}

export async function hapticError(): Promise<void>
{
    try
    {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    catch { /* ignore */ }
}

export async function hapticSelection(): Promise<void>
{
    try
    {
        await Haptics.selectionAsync();
    }
    catch { /* ignore */ }
}
