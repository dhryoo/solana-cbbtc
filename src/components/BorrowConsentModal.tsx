/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";

const READ_SECONDS = 5;

interface BorrowConsentModalProps
{
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

// D-6 (강): 첫 차입 전 위험 안내를 5초간 강제로 읽게 한 뒤에야 동의 가능.
export function BorrowConsentModal({ visible, onConfirm, onCancel }: BorrowConsentModalProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [remaining, setRemaining] = useState(READ_SECONDS);

    useEffect(() =>
    {
        if (!visible)
        {
            setRemaining(READ_SECONDS);
            return;
        }
        setRemaining(READ_SECONDS);
        const id = setInterval(() =>
        {
            setRemaining((r) => (r <= 1 ? 0 : r - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [visible]);

    const canConfirm = remaining <= 0;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <View style={styles.head}>
                        <Ionicons name="warning" size={24} color={palette.warn} />
                        <Text style={styles.title}>{t("borrowConsent.title")}</Text>
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 4 }}>
                        <Text style={styles.intro}>{t("borrowConsent.intro")}</Text>
                        <Bullet styles={styles} palette={palette}>{t("borrowConsent.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("borrowConsent.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("borrowConsent.b3")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("borrowConsent.b4")}</Bullet>
                    </ScrollView>

                    <View style={styles.actions}>
                        <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}>
                            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !canConfirm }}
                            disabled={!canConfirm}
                            onPress={onConfirm}
                            style={[styles.confirmBtn, !canConfirm && styles.confirmDisabled]}
                        >
                            <Text style={styles.confirmText}>
                                {canConfirm ? t("borrowConsent.confirm") : t("borrowConsent.confirmCountdown", { n: remaining })}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function Bullet({ styles, palette, children }: { styles: ReturnType<typeof makeStyles>; palette: ThemePalette; children: React.ReactNode }): React.JSX.Element
{
    return (
        <View style={styles.bulletRow}>
            <Ionicons name="alert-circle" size={15} color={palette.warn} style={styles.bulletIcon} />
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: t.overlay,
        justifyContent: "center",
        padding: 24,
    },
    card: {
        backgroundColor: t.surface,
        borderRadius: 18,
        padding: 20,
        maxHeight: "80%",
    },
    head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: "800", color: t.text },
    body: { marginBottom: 16 },
    intro: { fontSize: 14, lineHeight: 21, color: t.textMuted, marginBottom: 12 },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
    bulletIcon: { marginTop: 3 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: t.text },
    actions: { flexDirection: "row", gap: 12 },
    cancelBtn: {
        flex: 1, paddingVertical: 13, borderRadius: 12,
        borderWidth: 1, borderColor: t.border, alignItems: "center",
    },
    cancelText: { fontSize: 15, fontWeight: "600", color: t.textMuted },
    confirmBtn: {
        flex: 2, paddingVertical: 13, borderRadius: 12,
        backgroundColor: t.warn, alignItems: "center",
    },
    confirmDisabled: { opacity: 0.5 },
    confirmText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
});
