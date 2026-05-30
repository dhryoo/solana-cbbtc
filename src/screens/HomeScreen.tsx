import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { BalanceCard } from "@/components/BalanceCard";
import { NetworkBadge } from "@/components/NetworkBadge";
import { SeekerBadge } from "@/components/SeekerBadge";
import { TransactionRow } from "@/components/TransactionRow";
import { WalletButton } from "@/components/WalletButton";
import { WalletCard } from "@/components/WalletCard";
import { CBBTC, SKR, SOL, USDC } from "@/constants/tokens";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/providers/ThemeProvider";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { hapticSelection } from "@/services/HapticsService";

const RECENT_PREVIEW_COUNT = 5;

export function HomeScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const history = useTransactionHistory({ limit: RECENT_PREVIEW_COUNT });

    const onRefresh = useCallback(async (): Promise<void> =>
    {
        setRefreshing(true);
        try
        {
            await queryClient.invalidateQueries({ queryKey: ["balance"] });
            await queryClient.invalidateQueries({ queryKey: ["history"] });
        }
        finally
        {
            setRefreshing(false);
        }
    }, [queryClient]);

    const onOpenHistory = useCallback((): void =>
    {
        void hapticSelection();
        setHistoryOpen(true);
    }, []);

    const recent = (history.data ?? []).slice(0, RECENT_PREVIEW_COUNT);

    return (
        <>
        <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={(
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    enabled={Boolean(account)}
                    tintColor={BRAND_PURPLE}
                    colors={[BRAND_PURPLE]}
                    progressBackgroundColor={palette.surface}
                />
            )}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} maxFontSizeMultiplier={1.4}>Solana cbBTC</Text>
                    <NetworkBadge />
                </View>
                <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
                <View style={styles.badgeRow}>
                    <SeekerBadge />
                </View>
            </View>

            <View style={styles.cards}>
                <BalanceCard token={CBBTC} />
                <BalanceCard token={SOL} />
                <BalanceCard token={USDC} />
                <BalanceCard token={SKR} />
            </View>

            {account && (
                <View style={styles.walletBlock}>
                    <WalletCard publicKey={account.publicKey} />
                </View>
            )}

            {account && recent.length > 0 && (
                <View style={styles.recent}>
                    <View style={styles.recentHead}>
                        <Text style={styles.recentTitle}>{t("home.recentActivity")}</Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t("home.viewAll")}
                            onPress={onOpenHistory}
                            style={({ pressed }) => [styles.viewAll, pressed && styles.viewAllPressed]}
                        >
                            <Text style={styles.viewAllText}>{t("home.viewAll")}</Text>
                            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                        </Pressable>
                    </View>
                    <View style={styles.recentList}>
                        {recent.map((item) => (
                            <TransactionRow key={item.signature} item={item} />
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.footer}>
                <WalletButton />
                {account && (
                    <Text style={styles.hint}>{t("home.pullToRefresh")}</Text>
                )}
            </View>
        </ScrollView>
        <HistoryScreen visible={historyOpen} onClose={() => setHistoryOpen(false)} />
        </>
    );
}

const makeStyles = (t: ThemePalette) => ({
    scroll: {
        flexGrow: 1,
        backgroundColor: t.background,
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 48,
    },
    header: {
        alignItems: "center" as const,
        marginBottom: 24,
    },
    titleRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
    },
    badgeRow: {
        marginTop: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: "700" as const,
        color: t.text,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: t.textMuted,
    },
    cards: {
        gap: 12,
        marginBottom: 16,
    },
    walletBlock: {
        marginBottom: 24,
    },
    recent: {
        marginBottom: 24,
        gap: 10,
    },
    recentHead: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
    },
    recentTitle: {
        fontSize: 14,
        fontWeight: "700" as const,
        color: t.text,
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    viewAll: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    viewAllPressed: { opacity: 0.6 },
    viewAllText: { fontSize: 13, color: t.textMuted, fontWeight: "500" as const },
    recentList: { gap: 8 },
    footer: {
        alignItems: "center" as const,
        gap: 8,
    },
    hint: {
        fontSize: 11,
        color: t.textDim,
    },
});
