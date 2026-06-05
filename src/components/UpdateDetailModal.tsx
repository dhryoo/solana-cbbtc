/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { DAPP_STORE_LISTING_URL } from "@/constants/app";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { UpdateCheckResult } from "@/hooks/useUpdateCheck";
import { useTheme } from "@/providers/ThemeProvider";

interface UpdateDetailModalProps
{
    visible: boolean;
    onClose: () => void;
    update: UpdateCheckResult;
}

// release notes 본문을 단순 라인으로 분해. 마크다운 렌더링 의존성 회피.
// 빈 줄 무시, 앞쪽 `- ` / `* ` / `• ` 는 bullet 으로 표시.
interface BodyLine { kind: "bullet" | "text"; content: string }

function parseBody(body: string, maxLines = 8): BodyLine[]
{
    const out: BodyLine[] = [];
    for (const raw of body.split(/\r?\n/))
    {
        const trimmed = raw.trim();
        if (trimmed.length === 0)
        {
            continue;
        }
        const bulletMatch = /^[-*•]\s+(.*)$/.exec(trimmed);
        if (bulletMatch && bulletMatch[1])
        {
            out.push({ kind: "bullet", content: bulletMatch[1] });
        }
        else if (!/^#/.test(trimmed))
        {
            out.push({ kind: "text", content: trimmed });
        }
        if (out.length >= maxLines)
        {
            break;
        }
    }
    return out;
}

export function UpdateDetailModal({ visible, onClose, update }: UpdateDetailModalProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    const latest = update.latest;
    const lines = latest ? parseBody(latest.body) : [];

    const onOpenUpdate = (): void =>
    {
        if (!latest)
        {
            return;
        }
        // dApp Store 공식 URL 이 있으면 거기로, 아니면 GitHub Release 페이지로.
        const target = DAPP_STORE_LISTING_URL ?? latest.htmlUrl;
        if (target)
        {
            void Linking.openURL(target);
        }
        onClose();
    };

    const onOpenGitHub = (): void =>
    {
        if (latest?.htmlUrl)
        {
            void Linking.openURL(latest.htmlUrl);
        }
        onClose();
    };

    const onLater = (): void =>
    {
        onClose();
    };

    const onIgnore = (): void =>
    {
        void update.ignoreLatest();
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>{t("update.modalTitle", { version: latest?.tag ?? "" })}</Text>
                            <Text style={styles.subtitle}>
                                {t("update.currentVersion", { version: update.currentVersion })}
                            </Text>
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("common.close")}
                            onPress={onClose}
                            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                        >
                            <Ionicons name="close" size={20} color={palette.text} />
                        </Pressable>
                    </View>

                    {lines.length > 0 ? (
                        <ScrollView style={styles.notes} contentContainerStyle={styles.notesContent}>
                            {lines.map((line, idx) => (
                                line.kind === "bullet" ? (
                                    <View key={idx} style={styles.bulletRow}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.bulletText}>{line.content}</Text>
                                    </View>
                                ) : (
                                    <Text key={idx} style={styles.bodyText}>{line.content}</Text>
                                )
                            ))}
                        </ScrollView>
                    ) : null}

                    <View style={styles.actions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("update.openUpdate")}
                            onPress={onOpenUpdate}
                            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                        >
                            <Ionicons name="cloud-download-outline" size={18} color="#ffffff" />
                            <Text style={styles.primaryText}>{t("update.openUpdate")}</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("update.openGitHub")}
                            onPress={onOpenGitHub}
                            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                        >
                            <Ionicons name="logo-github" size={16} color={palette.text} />
                            <Text style={styles.secondaryText}>{t("update.openGitHub")}</Text>
                        </Pressable>

                        <View style={styles.tertiaryRow}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("update.later")}
                                onPress={onLater}
                                style={({ pressed }) => [styles.tertiaryBtn, pressed && styles.pressed]}
                            >
                                <Text style={styles.tertiaryText}>{t("update.later")}</Text>
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("update.ignoreThisVersion")}
                                onPress={onIgnore}
                                style={({ pressed }) => [styles.tertiaryBtn, pressed && styles.pressed]}
                            >
                                <Text style={styles.tertiaryTextMuted}>{t("update.ignoreThisVersion")}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: t.overlay,
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: t.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        paddingTop: 16,
        paddingHorizontal: 20,
        gap: 16,
        // Android status bar 가 모달과 안 겹치게.
        marginTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    title: { fontSize: 18, fontWeight: "700", color: t.text },
    subtitle: { fontSize: 13, color: t.textMuted },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceMuted,
    },
    pressed: { opacity: 0.7 },
    notes: { maxHeight: 240 },
    notesContent: { gap: 6, paddingVertical: 4 },
    bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    bullet: { color: BRAND_PURPLE, fontSize: 14, lineHeight: 20, fontWeight: "700" },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: t.text },
    bodyText: { fontSize: 13, lineHeight: 19, color: t.textMuted },
    actions: { gap: 10 },
    primaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: BRAND_PURPLE,
        borderRadius: 12,
        paddingVertical: 14,
    },
    primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
    secondaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        paddingVertical: 12,
        backgroundColor: t.surface,
    },
    secondaryText: { color: t.text, fontSize: 14, fontWeight: "600" },
    tertiaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 2,
    },
    tertiaryBtn: { paddingVertical: 8, paddingHorizontal: 10 },
    tertiaryText: { fontSize: 13, color: t.textMuted, fontWeight: "500" },
    tertiaryTextMuted: { fontSize: 13, color: t.textDim, fontWeight: "500" },
});
