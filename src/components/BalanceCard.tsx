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
import { useNetworkStatus } from "@/providers/NetworkProvider";
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
    const { isOnline } = useNetworkStatus();

    const updated = relativeTime(query.dataUpdatedAt || null);

    // 오프라인 상태에서는 query가 disabled되어 isLoading=false. 캐시 데이터가 있으면 그대로 표시,
    // 없으면 offline 안내. (isPending은 disabled + no-data 케이스에도 true이므로 isLoading 사용)
    const showOffline = !isOnline && !query.data && Boolean(ownerPubkey);

    // 카드 전체를 단일 a11y 그룹으로 묶어 screen reader가 의미 단위로 읽도록.
    const a11yLabel = (() =>
    {
        if (!ownerPubkey) return t("balance.a11yCardEmpty", { symbol: token.symbol });
        if (showOffline) return `${token.symbol} ${t("offline.balance")}`;
        if (query.isLoading) return t("balance.a11yCardLoading", { symbol: token.symbol });
        if (query.isError) return t("balance.a11yCardError", { symbol: token.symbol });
        if (query.data)
        {
            const formatted = formatTokenAmount(query.data.uiAmount, query.data.decimals);
            return t("balance.a11yCardData", { symbol: token.symbol, amount: `${formatted} ${token.symbol}` });
        }
        return token.symbol;
    })();

    return (
        <View
            style={styles.card}
            accessible={true}
            accessibilityLabel={a11yLabel}
            accessibilityRole="summary"
        >
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

                {showOffline && (
                    <EmptyView
                        icon="cloud-offline-outline"
                        message={t("offline.balance")}
                    />
                )}

                {ownerPubkey && !showOffline && query.isLoading && (
                    <SkeletonBlock width={140} height={26} />
                )}

                {ownerPubkey && !showOffline && query.isError && (
                    <ErrorView
                        message={t(classifyBalanceError(query.error).key)}
                        onRetry={() => { void query.refetch(); }}
                        retryLabel={t("common.retry")}
                        compact
                    />
                )}

                {ownerPubkey && query.data && (
                    <>
                        <Text style={styles.amount} maxFontSizeMultiplier={1.4} numberOfLines={1}>
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
