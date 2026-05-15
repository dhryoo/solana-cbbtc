import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import i18n, {
    DEFAULT_LANGUAGE,
    detectSystemLanguage,
    type SupportedLanguage,
} from "@/i18n";
import { loadLanguagePreference, saveLanguagePreference } from "@/utils/languageStorage";

interface I18nContextValue
{
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => Promise<void>;
    isReady: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps
{
    children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps): React.JSX.Element
{
    const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
    const [isReady, setIsReady] = useState(false);

    useEffect(() =>
    {
        let cancelled = false;
        const restore = async (): Promise<void> =>
        {
            // 1) 저장된 사용자 선택이 있으면 그것을 사용
            // 2) 없으면 시스템 locale 기반 자동 감지 (예: ko-KR → ko, 그 외 → en)
            const stored = await loadLanguagePreference();
            if (cancelled)
            {
                return;
            }
            const next = stored ?? detectSystemLanguage();
            await i18n.changeLanguage(next);
            if (cancelled)
            {
                return;
            }
            setLanguageState(next);
            setIsReady(true);
        };
        void restore();
        return () =>
        {
            cancelled = true;
        };
    }, []);

    const setLanguage = useCallback(async (lang: SupportedLanguage): Promise<void> =>
    {
        await i18n.changeLanguage(lang);
        await saveLanguagePreference(lang);
        setLanguageState(lang);
    }, []);

    const value = useMemo<I18nContextValue>(() =>
        ({
            language,
            setLanguage,
            isReady,
        }), [language, setLanguage, isReady]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLanguage(): I18nContextValue
{
    const ctx = useContext(I18nContext);
    if (!ctx)
    {
        throw new Error("useLanguage must be used within I18nProvider");
    }
    return ctx;
}
