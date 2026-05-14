import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "settings:notifications:enabled";

export async function loadNotificationsEnabled(): Promise<boolean>
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

export async function saveNotificationsEnabled(enabled: boolean): Promise<void>
{
    await AsyncStorage.setItem(KEY, enabled ? "1" : "0");
}
