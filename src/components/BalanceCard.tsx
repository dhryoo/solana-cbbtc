import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { TokenInfo } from "@/constants/tokens";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { formatTokenAmount } from "@/utils/format";

interface BalanceCardProps
{
    token: TokenInfo;
}

export function BalanceCard({ token }: BalanceCardProps): React.JSX.Element
{
    const { account } = useWallet();
    const ownerPubkey = account?.publicKey ?? null;
    const query = useTokenBalance(token, ownerPubkey);

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
                    <Text style={styles.placeholder}>지갑 연결 후 표시됩니다</Text>
                )}

                {ownerPubkey && query.isPending && (
                    <ActivityIndicator />
                )}

                {ownerPubkey && query.isError && (
                    <Text style={styles.error}>잔액을 불러오지 못했습니다</Text>
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

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 16,
        padding: 16,
        backgroundColor: "#fafafa",
        gap: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    iconPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    iconText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    identity: {
        flex: 1,
    },
    symbol: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
    },
    name: {
        fontSize: 12,
        color: "#888",
    },
    body: {
        minHeight: 32,
        justifyContent: "center",
    },
    placeholder: {
        color: "#888",
        fontSize: 13,
    },
    amount: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111",
    },
    amountUnit: {
        fontSize: 14,
        fontWeight: "500",
        color: "#666",
    },
    error: {
        color: "#c33",
        fontSize: 13,
    },
});
