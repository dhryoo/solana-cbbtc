import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
/* eslint-disable react-native/no-unused-styles */
import Markdown from "react-native-markdown-display";

import { ABOUT_EN, ABOUT_KO } from "@/content/about";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useLanguage } from "@/providers/I18nProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface AboutScreenProps
{
    visible: boolean;
    onClose: () => void;
}

export function AboutScreen({ visible, onClose }: AboutScreenProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { language } = useLanguage();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const content = language === "en" ? ABOUT_EN : ABOUT_KO;
    const markdownStyles = useMemo(() => buildMarkdownStyles(palette), [palette]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={false}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t("about.title")}</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        onPress={onClose}
                        style={({ pressed }) =>
                            [styles.closeButton, pressed && styles.closePressed]}
                    >
                        <Ionicons name="close" size={22} color={palette.text} />
                    </Pressable>
                </View>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Markdown style={markdownStyles}>
                        {content}
                    </Markdown>
                </ScrollView>
            </View>
        </Modal>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        // status bar / 노치 영역 회피. Android는 StatusBar.currentHeight, iOS는 상수 패딩.
        paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        backgroundColor: t.background,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: t.text,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.surfaceMuted,
    },
    closePressed: {
        opacity: 0.7,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
});

// 마크다운 element별 스타일. theme palette를 따르도록 동적 생성.
// 노드 종류는 react-native-markdown-display 문서 참조.
function buildMarkdownStyles(t: ThemePalette): Record<string, object>
{
    return {
        body: {
            color: t.text,
            fontSize: 14,
            lineHeight: 22,
        },
        heading1: {
            color: t.text,
            fontSize: 24,
            fontWeight: "700",
            marginTop: 8,
            marginBottom: 12,
        },
        heading2: {
            color: t.text,
            fontSize: 18,
            fontWeight: "700",
            marginTop: 20,
            marginBottom: 8,
        },
        heading3: {
            color: t.text,
            fontSize: 15,
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 6,
        },
        paragraph: {
            color: t.text,
            marginTop: 0,
            marginBottom: 10,
            lineHeight: 22,
        },
        list_item: {
            color: t.text,
            marginBottom: 4,
        },
        bullet_list: {
            marginBottom: 10,
        },
        ordered_list: {
            marginBottom: 10,
        },
        strong: {
            color: t.text,
            fontWeight: "700",
        },
        em: {
            color: t.text,
            fontStyle: "italic",
        },
        code_inline: {
            color: t.text,
            backgroundColor: t.surfaceMuted,
            fontFamily: "Courier",
            paddingHorizontal: 4,
            paddingVertical: 1,
            borderRadius: 4,
            fontSize: 13,
        },
        code_block: {
            color: t.text,
            backgroundColor: t.surfaceMuted,
            fontFamily: "Courier",
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            marginVertical: 8,
        },
        fence: {
            color: t.text,
            backgroundColor: t.surfaceMuted,
            fontFamily: "Courier",
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            marginVertical: 8,
        },
        link: {
            color: "#9945FF",
        },
        hr: {
            backgroundColor: t.border,
            height: 1,
            marginVertical: 16,
        },
        blockquote: {
            backgroundColor: t.surfaceMuted,
            borderLeftWidth: 3,
            borderLeftColor: t.primary,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginVertical: 8,
        },
    };
}
