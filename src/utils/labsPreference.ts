import AsyncStorage from "@react-native-async-storage/async-storage";

// 실험실(Labs) 기능 토글 — 기본 OFF. 켜기 전까지 실험 기능 코드는 렌더되지 않음.
// no-backend 정책: 로컬 저장만, 원격 플래그 없음.

const LIGHTNING_KEY = "labs:lightning:enabled";

export async function loadLightningLabsEnabled(): Promise<boolean>
{
    try
    {
        const raw = await AsyncStorage.getItem(LIGHTNING_KEY);
        return raw === "1";
    }
    catch
    {
        return false;
    }
}

export async function saveLightningLabsEnabled(enabled: boolean): Promise<void>
{
    await AsyncStorage.setItem(LIGHTNING_KEY, enabled ? "1" : "0");
}
