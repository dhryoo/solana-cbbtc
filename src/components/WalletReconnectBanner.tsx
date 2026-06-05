import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWallet } from "@/hooks/useWallet";
import { useWalletStale } from "@/hooks/useWalletStale";
import { useTheme } from "@/providers/ThemeProvider";
import { hapticSelection } from "@/services/HapticsService";

export function WalletReconnectBanner(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const { stale } = useWalletStale();
    const { reconnect, status } = useWallet();

    if (!stale)
    {
        return null;
    }

    const busy = status === "connecting" || status === "disconnecting";

    const onPress = (): void =>
    {
        if (busy)
        {
            return;
        }
        void hapticSelection();
        void reconnect();
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("walletStale.bannerAction")}
            disabled={busy}
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && !busy && styles.rowPressed]}
        >
            <Ionicons name="alert-circle-outline" size={18} color={BRAND_PURPLE} />
            <View style={styles.text}>
                <Text style={styles.title}>{t("walletStale.bannerTitle")}</Text>
                <Text style={styles.subtitle}>{t("walletStale.bannerSubtitle")}</Text>
            </View>
            {busy
                ? <ActivityIndicator size="small" color={palette.text} />
                : (
                    <View style={styles.actionPill}>
                        <Text style={styles.actionText}>{t("walletStale.bannerAction")}</Text>
                        <Ionicons name="chevron-forward" size={14} color={palette.text} />
                    </View>
                )}
        </Pressable>
    );
}

const makeStyles = (t: ThemePalette) => ({
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: t.surfaceMuted,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
    },
    rowPressed: { opacity: 0.7 },
    text: { flex: 1, gap: 2 },
    title: {
        fontSize: 13,
        fontWeight: "700" as const,
        color: t.text,
    },
    subtitle: {
        fontSize: 11,
        color: t.textMuted,
        lineHeight: 15,
    },
    actionPill: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.borderStrong,
    },
    actionText: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: t.text,
    },
});
