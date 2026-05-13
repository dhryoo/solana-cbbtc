import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { TokenInfo } from "@/constants/tokens";
import type { QuoteResponse } from "@/types/jupiter";
import { formatRawAmount } from "@/utils/format";

export const SLIPPAGE_OPTIONS_BPS = [10, 50, 100] as const;

interface QuoteDisplayProps
{
    outputToken: TokenInfo;
    quote: QuoteResponse | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    slippageBps: number;
    onSlippageChange: (bps: number) => void;
    inputIsEmpty: boolean;
}

export function QuoteDisplay({
    outputToken,
    quote,
    isLoading,
    isFetching,
    error,
    slippageBps,
    onSlippageChange,
    inputIsEmpty,
}: QuoteDisplayProps): React.JSX.Element
{
    const showSpinner = isLoading || (isFetching && !quote);

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>예상 수령량</Text>
                <View style={styles.valueWrap}>
                    {inputIsEmpty && (
                        <Text style={styles.placeholder}>금액을 입력하세요</Text>
                    )}
                    {!inputIsEmpty && showSpinner && <ActivityIndicator />}
                    {!inputIsEmpty && !showSpinner && error && (
                        <Text style={styles.error}>견적 실패</Text>
                    )}
                    {!inputIsEmpty && !showSpinner && !error && quote && (
                        <Text style={styles.amount}>
                            {formatRawAmount(quote.outAmount, outputToken.decimals)}
                            <Text style={styles.unit}> {outputToken.symbol}</Text>
                        </Text>
                    )}
                </View>
            </View>

            {quote && !inputIsEmpty && (
                <>
                    <View style={styles.row}>
                        <Text style={styles.label}>가격 영향</Text>
                        <Text style={styles.metric}>
                            {formatPriceImpact(quote.priceImpactPct)}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>라우트</Text>
                        <Text style={styles.metric}>
                            {quote.routePlan.length} hop
                            {quote.routePlan.length > 1 ? "s" : ""}
                            {quote.routePlan.length > 0 && (
                                <Text style={styles.dim}>
                                    {" · "}
                                    {quote.routePlan.map((r) => r.swapInfo.label).join(" → ")}
                                </Text>
                            )}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>최소 수령량</Text>
                        <Text style={styles.metric}>
                            {formatRawAmount(quote.otherAmountThreshold, outputToken.decimals)}{" "}
                            {outputToken.symbol}
                        </Text>
                    </View>
                </>
            )}

            <View style={styles.slippageRow}>
                <Text style={styles.label}>슬리피지 허용치</Text>
                <View style={styles.slippageOptions}>
                    {SLIPPAGE_OPTIONS_BPS.map((bps) => (
                        <Pressable
                            key={bps}
                            accessibilityRole="button"
                            onPress={() => onSlippageChange(bps)}
                            style={({ pressed }) =>
                                [
                                    styles.slipChip,
                                    bps === slippageBps && styles.slipChipActive,
                                    pressed && styles.slipChipPressed,
                                ]}
                        >
                            <Text
                                style={[
                                    styles.slipChipText,
                                    bps === slippageBps && styles.slipChipTextActive,
                                ]}
                            >
                                {bpsToPercent(bps)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </View>
    );
}

function bpsToPercent(bps: number): string
{
    return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function formatPriceImpact(pct: string): string
{
    const value = Number(pct);
    if (!Number.isFinite(value))
    {
        return "—";
    }
    if (value === 0)
    {
        return "0%";
    }
    return `${(value * 100).toFixed(3)}%`;
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 16,
        backgroundColor: "#fafafa",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    label: {
        color: "#777",
        fontSize: 13,
    },
    valueWrap: {
        alignItems: "flex-end",
        minHeight: 22,
    },
    amount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
    },
    unit: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
    },
    metric: {
        fontSize: 13,
        color: "#222",
    },
    dim: {
        color: "#888",
    },
    placeholder: {
        color: "#bbb",
        fontSize: 13,
    },
    error: {
        color: "#c33",
        fontSize: 13,
    },
    slippageRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    slippageOptions: {
        flexDirection: "row",
        gap: 6,
    },
    slipChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    slipChipActive: {
        borderColor: "#111",
        backgroundColor: "#111",
    },
    slipChipPressed: {
        opacity: 0.7,
    },
    slipChipText: {
        fontSize: 12,
        color: "#555",
        fontWeight: "500",
    },
    slipChipTextActive: {
        color: "#fff",
    },
});
