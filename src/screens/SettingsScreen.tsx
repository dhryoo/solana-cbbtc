import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";

import { getClusterId } from "@/constants/cluster";
import type { ThemeMode, ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useLanguage } from "@/providers/I18nProvider";
import { useTheme } from "@/providers/ThemeProvider";

const APP_VERSION = "0.1.0";

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];
const THEME_LABEL_KEY: Record<ThemeMode, string> = {
    system: "settings.themeSystem",
    light: "settings.themeLight",
    dark: "settings.themeDark",
};

export function SettingsScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();
    const { mode: themeMode, setMode: setThemeMode } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const onSelectLanguage = (next: SupportedLanguage): void =>
    {
        if (next === language) return;
        void setLanguage(next);
    };

    const onSelectTheme = (next: ThemeMode): void =>
    {
        if (next === themeMode) return;
        void setThemeMode(next);
    };

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>{t("settings.title")}</Text>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t("settings.language")}</Text>
                <View style={styles.options}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <Pressable
                            key={lang}
                            accessibilityRole="button"
                            accessibilityState={{ selected: language === lang }}
                            onPress={() => onSelectLanguage(lang)}
                            style={({ pressed }) =>
                                [
                                    styles.option,
                                    language === lang && styles.optionActive,
                                    pressed && styles.optionPressed,
                                ]}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    language === lang && styles.optionTextActive,
                                ]}
                            >
                                {t(`settings.${lang}`)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t("settings.theme")}</Text>
                <View style={styles.options}>
                    {THEME_MODES.map((mode) => (
                        <Pressable
                            key={mode}
                            accessibilityRole="button"
                            accessibilityState={{ selected: themeMode === mode }}
                            onPress={() => onSelectTheme(mode)}
                            style={({ pressed }) =>
                                [
                                    styles.option,
                                    themeMode === mode && styles.optionActive,
                                    pressed && styles.optionPressed,
                                ]}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    themeMode === mode && styles.optionTextActive,
                                ]}
                            >
                                {t(THEME_LABEL_KEY[mode])}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t("settings.about")}</Text>
                <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>{t("settings.version")}</Text>
                    <Text style={styles.kvValue}>{APP_VERSION}</Text>
                </View>
                <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>{t("settings.network")}</Text>
                    <Text style={styles.kvValue}>{getClusterId()}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const makeStyles = (t: ThemePalette) => ({
    scroll: {
        flexGrow: 1,
        backgroundColor: t.background,
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 48,
        gap: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700" as const,
        color: t.text,
        marginBottom: 4,
    },
    section: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 12,
        color: t.textMuted,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
    },
    options: {
        gap: 8,
    },
    option: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
    },
    optionActive: {
        borderColor: t.primary,
        backgroundColor: t.primary,
    },
    optionPressed: {
        opacity: 0.7,
    },
    optionText: {
        fontSize: 15,
        color: t.text,
        fontWeight: "500" as const,
    },
    optionTextActive: {
        color: t.textInverse,
        fontWeight: "600" as const,
    },
    kvRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 6,
    },
    kvKey: {
        fontSize: 13,
        color: t.textMuted,
    },
    kvValue: {
        fontSize: 13,
        color: t.text,
        fontWeight: "500" as const,
    },
});
