import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "settings:appLock:enabled";

export async function loadAppLockEnabled(): Promise<boolean>
{
    try
    {
        const raw = await AsyncStorage.getItem(KEY);
        return raw === "1";
    }
    catch
    {
        return false;
    }
}

export async function saveAppLockEnabled(enabled: boolean): Promise<void>
{
    await AsyncStorage.setItem(KEY, enabled ? "1" : "0");
}
