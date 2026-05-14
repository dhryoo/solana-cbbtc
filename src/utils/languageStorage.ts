import AsyncStorage from "@react-native-async-storage/async-storage";

import { isSupportedLanguage, type SupportedLanguage } from "@/i18n";

const KEY = "settings:language";

export async function loadLanguagePreference(): Promise<SupportedLanguage | null>
{
    try
    {
        const raw = await AsyncStorage.getItem(KEY);
        return isSupportedLanguage(raw) ? raw : null;
    }
    catch
    {
        return null;
    }
}

export async function saveLanguagePreference(lang: SupportedLanguage): Promise<void>
{
    await AsyncStorage.setItem(KEY, lang);
}
