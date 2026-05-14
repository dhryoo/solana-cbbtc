import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { EmptyView, ErrorView, SkeletonBlock } from "@/components/StateViews";
import type { ThemePalette } from "@/constants/theme";
import type { TokenInfo } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { formatTokenAmount } from "@/utils/format";

interface BalanceCardProps
{
    token: TokenInfo;
}

export function BalanceCard({ token }: BalanceCardProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const ownerPubkey = account?.publicKey ?? null;
    const query = useTokenBalance(token, ownerPubkey);
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconPlaceholder}>
                    <Text style={styles.iconText}>{token.symbol.slice(0, 1)}</Text>
                </View>
                <View style={styles.identity}>
                    <Text style={styles.symbol}>{token.symbol}</Text>
                    <Text style={styles.name}>{token.name}</Text>
                </View>
            </View>

            <View style={styles.body}>
                {!ownerPubkey && (
                    <EmptyView message={t("balance.connectFirst")} compact />
                )}

                {ownerPubkey && query.isPending && (
                    <SkeletonBlock width={140} height={26} />
                )}

                {ownerPubkey && query.isError && (
                    <ErrorView
                        message={t("balance.loadError")}
                        onRetry={() => { void query.refetch(); }}
                        retryLabel={t("common.retry")}
                        compact
                    />
                )}

                {ownerPubkey && query.data && (
                    <Text style={styles.amount}>
                        {formatTokenAmount(query.data.uiAmount, query.data.decimals)}
                        <Text style={styles.amountUnit}> {token.symbol}</Text>
                    </Text>
                )}
            </View>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    card: {
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 16,
        backgroundColor: t.surface,
        gap: 12,
    },
    header: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
    },
    iconPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: t.primary,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    iconText: {
        color: t.textInverse,
        fontSize: 14,
        fontWeight: "700" as const,
    },
    identity: {
        flex: 1,
    },
    symbol: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: t.text,
    },
    name: {
        fontSize: 12,
        color: t.textMuted,
    },
    body: {
        minHeight: 32,
        justifyContent: "center" as const,
    },
    amount: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: t.text,
    },
    amountUnit: {
        fontSize: 14,
        fontWeight: "500" as const,
        color: t.textMuted,
    },
});
