import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import ko from "./ko.json";

export const SUPPORTED_LANGUAGES = ["ko", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "ko";

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage
{
    return value === "ko" || value === "en";
}

void i18n.use(initReactI18next).init({
    resources: {
        ko: { translation: ko },
        en: { translation: en },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
});

export default i18n;
