import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { BalanceCard } from "@/components/BalanceCard";
import { WalletButton } from "@/components/WalletButton";
import { CBBTC, SOL } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";

export function HomeScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);

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
                />
            )}
        >
            <View style={styles.header}>
                <Text style={styles.title}>seeker-btcfi</Text>
                <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
            </View>

            <View style={styles.cards}>
                <BalanceCard token={CBBTC} />
                <BalanceCard token={SOL} />
            </View>

            <View style={styles.footer}>
                <WalletButton />
                {account && (
                    <Text style={styles.hint}>{t("home.pullToRefresh")}</Text>
                )}
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
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111",
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: "#888",
    },
    cards: {
        gap: 12,
        marginBottom: 32,
    },
    footer: {
        alignItems: "center",
        gap: 8,
    },
    hint: {
        fontSize: 11,
        color: "#aaa",
    },
});
