import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import ko from "./ko.json";

export const SUPPORTED_LANGUAGES = ["ko", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// 글로벌 dApp Store 노출 기준 → 시스템 locale 감지 실패 / 미지원 locale일 땐 영어.
// 한국 사용자는 시스템 locale이 ko-* 이면 자동으로 한국어, 그 외엔 영어로 첫 실행.
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage
{
    return value === "ko" || value === "en";
}

// 시스템 locale 우선순위 리스트를 훑어 첫 번째 지원 언어 반환.
// 예: ["ja-JP", "en-US"] → "en", ["ko-KR", "en-US"] → "ko"
// expo-localization 호출이 실패하면 (테스트 환경 등) DEFAULT_LANGUAGE.
export function detectSystemLanguage(): SupportedLanguage
{
    try
    {
        const locales = Localization.getLocales();
        for (const locale of locales)
        {
            const code = locale.languageCode;
            if (isSupportedLanguage(code))
            {
                return code;
            }
        }
    }
    catch
    {
        // Localization API 미가용 (jest 환경 등) — fallback
    }
    return DEFAULT_LANGUAGE;
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
