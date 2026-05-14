import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useColorScheme } from "react-native";

import {
    paletteFor,
    type ThemeMode,
    type ThemePalette,
} from "@/constants/theme";
import { loadThemeMode, saveThemeMode } from "@/utils/themeStorage";

interface ThemeContextValue
{
    mode: ThemeMode;
    palette: ThemePalette;
    setMode: (next: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps
{
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element
{
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>("system");

    useEffect(() =>
    {
        let cancelled = false;
        void (async (): Promise<void> =>
        {
            const stored = await loadThemeMode();
            if (cancelled)
            {
                return;
            }
            if (stored)
            {
                setModeState(stored);
            }
        })();
        return () =>
        {
            cancelled = true;
        };
    }, []);

    const palette = useMemo(() =>
    {
        const resolved: "light" | "dark" =
            mode === "system"
                ? (systemScheme === "dark" ? "dark" : "light")
                : mode;
        return paletteFor(resolved);
    }, [mode, systemScheme]);

    const setMode = useCallback(async (next: ThemeMode): Promise<void> =>
    {
        setModeState(next);
        await saveThemeMode(next);
    }, []);

    const value = useMemo<ThemeContextValue>(() =>
        ({ mode, palette, setMode }), [mode, palette, setMode]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue
{
    const ctx = useContext(ThemeContext);
    if (!ctx)
    {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return ctx;
}
