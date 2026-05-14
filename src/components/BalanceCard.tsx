import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, View } from "react-native";

import { EmptyView, ErrorView, SkeletonBlock } from "@/components/StateViews";
import type { ThemePalette } from "@/constants/theme";
import type { TokenInfo } from "@/constants/tokens";
import { useSeekerIdentity } from "@/hooks/useSeekerIdentity";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { classifyBalanceError } from "@/utils/balanceError";
import { formatTokenAmount } from "@/utils/format";
import { relativeTime } from "@/utils/relativeTime";

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
    const { hasGenesisToken } = useSeekerIdentity();

    const updated = relativeTime(query.dataUpdatedAt || null);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    {token.logoSource ? (
                        <Image source={token.logoSource} style={styles.iconImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.iconPlaceholder}>
                            <Text style={styles.iconText}>{token.symbol.slice(0, 1)}</Text>
                        </View>
                    )}
                    {hasGenesisToken && (
                        <View style={styles.verifiedAccent}>
                            <Ionicons name="checkmark" size={10} color="#ffffff" />
                        </View>
                    )}
                </View>
                <View style={styles.identity}>
                    <Text style={styles.symbol}>{token.symbol}</Text>
                    <Text style={styles.name}>{token.name}</Text>
                </View>
            </View>

            <View style={styles.body}>
                {!ownerPubkey && (
                    <EmptyView
                        icon="wallet-outline"
                        message={t("balance.connectFirst")}
                    />
                )}

                {ownerPubkey && query.isPending && (
                    <SkeletonBlock width={140} height={26} />
                )}

                {ownerPubkey && query.isError && (
                    <ErrorView
                        message={t(classifyBalanceError(query.error).key)}
                        onRetry={() => { void query.refetch(); }}
                        retryLabel={t("common.retry")}
                        compact
                    />
                )}

                {ownerPubkey && query.data && (
                    <>
                        <Text style={styles.amount}>
                            {formatTokenAmount(query.data.uiAmount, query.data.decimals)}
                            <Text style={styles.amountUnit}> {token.symbol}</Text>
                        </Text>
                        <Text style={styles.timestamp}>
                            {t("relative.updated", { when: t(updated.key, updated.params ?? {}) })}
                        </Text>
                    </>
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
    iconContainer: {
        position: "relative" as const,
    },
    iconPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: t.primary,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    iconImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    verifiedAccent: {
        position: "absolute" as const,
        right: -2,
        bottom: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#9945FF",
        borderWidth: 2,
        borderColor: t.surface,
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
    timestamp: {
        marginTop: 4,
        fontSize: 11,
        color: t.textDim,
    },
});
