import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { AddressDisplay } from "@/components/AddressDisplay";
import { BalanceCard } from "@/components/BalanceCard";
import { SeekerBadge } from "@/components/SeekerBadge";
import { WalletButton } from "@/components/WalletButton";
import { CBBTC, SOL } from "@/constants/tokens";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";
import { useWallet } from "@/hooks/useWallet";

export function HomeScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();

    const onRefresh = useCallback(async (): Promise<void> =>
    {
        setRefreshing(true);
        try
        {
            await queryClient.invalidateQueries({ queryKey: ["balance"] });
        }
        finally
        {
            setRefreshing(false);
        }
    }, [queryClient]);

    return (
        <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={(
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    enabled={Boolean(account)}
                    tintColor={palette.text}
                    colors={[palette.text]}
                />
            )}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Solana cbBTC</Text>
                <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
                <View style={styles.badgeRow}>
                    <SeekerBadge />
                </View>
            </View>

            <View style={styles.cards}>
                <BalanceCard token={CBBTC} />
                <BalanceCard token={SOL} />
            </View>

            {account && (
                <View style={styles.addressBlock}>
                    <Text style={styles.addressLabel}>{t("home.connectedLabel")}</Text>
                    <AddressDisplay address={account.publicKey.toBase58()} style="full" />
                </View>
            )}

            <View style={styles.footer}>
                <WalletButton />
                {account && (
                    <Text style={styles.hint}>{t("home.pullToRefresh")}</Text>
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
    },
    header: {
        alignItems: "center" as const,
        marginBottom: 24,
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
    addressBlock: {
        alignItems: "center" as const,
        gap: 4,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    addressLabel: {
        fontSize: 11,
        color: t.textMuted,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
    },
    footer: {
        alignItems: "center" as const,
        gap: 8,
    },
    hint: {
        fontSize: 11,
        color: t.textDim,
    },
});
