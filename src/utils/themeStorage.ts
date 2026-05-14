import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeMode } from "@/constants/theme";

const KEY = "settings:themeMode";

function isThemeMode(v: string | null): v is ThemeMode
{
    return v === "system" || v === "light" || v === "dark";
}

export async function loadThemeMode(): Promise<ThemeMode | null>
{
    try
    {
        const raw = await AsyncStorage.getItem(KEY);
        return isThemeMode(raw) ? raw : null;
    }
    catch
    {
        return null;
    }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void>
{
    await AsyncStorage.setItem(KEY, mode);
}
