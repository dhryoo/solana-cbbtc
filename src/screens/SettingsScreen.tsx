import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getClusterId } from "@/constants/cluster";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useLanguage } from "@/providers/I18nProvider";

// app.json의 version을 직접 임포트하는 건 Expo bundling 환경에 따라 다름.
// 가장 호환 좋은 방식: process.env 또는 별도 상수.
const APP_VERSION = "0.1.0";

export function SettingsScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();

    const onSelect = (next: SupportedLanguage): void =>
    {
        if (next === language) return;
        void setLanguage(next);
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
                            onPress={() => onSelect(lang)}
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

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 48,
        gap: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111",
        marginBottom: 4,
    },
    section: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 12,
        color: "#888",
        textTransform: "uppercase",
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
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    optionActive: {
        borderColor: "#111",
        backgroundColor: "#111",
    },
    optionPressed: {
        opacity: 0.7,
    },
    optionText: {
        fontSize: 15,
        color: "#333",
        fontWeight: "500",
    },
    optionTextActive: {
        color: "#fff",
        fontWeight: "600",
    },
    kvRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    kvKey: {
        fontSize: 13,
        color: "#777",
    },
    kvValue: {
        fontSize: 13,
        color: "#222",
        fontWeight: "500",
    },
});
