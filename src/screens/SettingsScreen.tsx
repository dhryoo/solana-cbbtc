import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { getClusterId } from "@/constants/cluster";
import type { ThemeMode, ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useLanguage } from "@/providers/I18nProvider";
import { useNotifications } from "@/providers/NotificationProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { hapticSelection } from "@/services/HapticsService";
import { useSeekerIdentity } from "@/hooks/useSeekerIdentity";
import { useWallet } from "@/hooks/useWallet";

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
    const notifications = useNotifications();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const seeker = useSeekerIdentity();
    const { account } = useWallet();

    const onSelectLanguage = (next: SupportedLanguage): void =>
    {
        if (next === language) return;
        void hapticSelection();
        void setLanguage(next);
    };

    const onSelectTheme = (next: ThemeMode): void =>
    {
        if (next === themeMode) return;
        void hapticSelection();
        void setThemeMode(next);
    };

    const onToggleNotifications = (next: boolean): void =>
    {
        void hapticSelection();
        void notifications.setEnabled(next);
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
                <Text style={styles.sectionLabel}>{t("settings.notifications")}</Text>
                <View style={styles.toggleRow}>
                    <View style={styles.toggleText}>
                        <Text style={styles.toggleTitle}>{t("settings.notificationsToggle")}</Text>
                        <Text style={styles.toggleDesc}>{t("settings.notificationsDescription")}</Text>
                        {notifications.permissionStatus === "denied" && !notifications.enabled && (
                            <Text style={styles.toggleWarn}>{t("settings.notificationsDenied")}</Text>
                        )}
                    </View>
                    <Switch
                        accessibilityLabel={t("settings.notificationsToggle")}
                        value={notifications.enabled}
                        onValueChange={onToggleNotifications}
                        trackColor={{ false: palette.borderStrong, true: "#9945FF" }}
                        thumbColor="#ffffff"
                    />
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
                <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>{t("settings.seekerVerified")}</Text>
                    <Text
                        style={[
                            styles.kvValue,
                            seeker.hasGenesisToken && styles.kvValueAccent,
                        ]}
                    >
                        {seeker.isLoading
                            ? "…"
                            : seeker.hasGenesisToken
                                ? `✓ ${t("settings.seekerYes")}`
                                : t("settings.seekerNo")}
                    </Text>
                </View>
                {seeker.isSeekerDevice && !seeker.hasGenesisToken && (
                    <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>{t("settings.deviceModel")}</Text>
                        <Text style={styles.kvValue}>{t("settings.seekerDevice")}</Text>
                    </View>
                )}
                {account && (
                    <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>{t("settings.walletId")}</Text>
                        <Text style={styles.kvValueMono} selectable>
                            {account.walletUriBase === "" || account.walletUriBase === undefined
                                ? "(empty)"
                                : account.walletUriBase}
                        </Text>
                    </View>
                )}
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
    toggleRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
        gap: 16,
    },
    toggleText: {
        flex: 1,
        gap: 4,
    },
    toggleTitle: {
        fontSize: 15,
        color: t.text,
        fontWeight: "600" as const,
    },
    toggleDesc: {
        fontSize: 12,
        color: t.textMuted,
        lineHeight: 16,
    },
    toggleWarn: {
        fontSize: 12,
        color: t.warn,
        lineHeight: 16,
        marginTop: 4,
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
    kvValueAccent: {
        color: "#9945FF",
        fontWeight: "700" as const,
    },
    kvValueMono: {
        fontSize: 11,
        color: t.textMuted,
        fontFamily: "Courier",
        maxWidth: 200,
        textAlign: "right" as const,
    },
});
