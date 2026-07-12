import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import ko from "./ko.json";
import vi from "./vi.json";
import zh from "./zh.json";

export const SUPPORTED_LANGUAGES = ["ko", "en", "vi", "zh"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// 글로벌 dApp Store 노출 기준 → 시스템 locale 감지 실패 / 미지원 locale일 땐 영어.
// 한국 사용자는 시스템 locale이 ko-* 이면 자동으로 한국어, vi-* 이면 베트남어, 그 외엔 영어로 첫 실행.
//
// "zh" 는 간체(zh-Hans) 리소스만 싣는다. 번체(zh-Hant-TW/HK) 디바이스도 languageCode 가 "zh" 라
// 간체 UI를 받게 되는데, 번체 사용자에게 간체는 영어보다 훨씬 읽기 쉬우므로 의도된 fallback이다.
// (Android/iOS 의 locale resolution 도 동일하게 동작한다.) 원치 않으면 설정에서 English 선택 가능.
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage
{
    return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
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
        vi: { translation: vi },
        zh: { translation: zh },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    returnNull: false,
});

export default i18n;
