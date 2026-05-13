import React, { useCallback, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { QuoteDisplay } from "@/components/QuoteDisplay";
import { CBBTC, SOL, type TokenInfo } from "@/constants/tokens";
import { useSwapQuote } from "@/hooks/useSwapQuote";

const DEFAULT_SLIPPAGE_BPS = 50;

export function SwapScreen(): React.JSX.Element
{
    const [inputToken, setInputToken] = useState<TokenInfo>(SOL);
    const [outputToken, setOutputToken] = useState<TokenInfo>(CBBTC);
    const [amount, setAmount] = useState("");
    const [slippageBps, setSlippageBps] = useState<number>(DEFAULT_SLIPPAGE_BPS);

    const quote = useSwapQuote({
        input: inputToken,
        output: outputToken,
        uiAmount: amount,
        slippageBps,
    });

    const onFlip = useCallback((): void =>
    {
        setInputToken(outputToken);
        setOutputToken(inputToken);
        setAmount("");
    }, [inputToken, outputToken]);

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Swap</Text>

            <View style={styles.inputCard}>
                <View style={styles.headerRow}>
                    <Text style={styles.tokenSymbol}>{inputToken.symbol}</Text>
                    <Text style={styles.tokenName}>{inputToken.name}</Text>
                </View>
                <TextInput
                    style={styles.amountInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#bbb"
                    value={amount}
                    onChangeText={setAmount}
                    autoCorrect={false}
                    accessibilityLabel="입력 금액"
                />
            </View>

            <View style={styles.flipRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="토큰 방향 전환"
                    onPress={onFlip}
                    style={({ pressed }) =>
                        [styles.flipButton, pressed && styles.flipPressed]}
                >
                    <Text style={styles.flipText}>↕</Text>
                </Pressable>
            </View>

            <View style={styles.outputCard}>
                <View style={styles.headerRow}>
                    <Text style={styles.tokenSymbol}>{outputToken.symbol}</Text>
                    <Text style={styles.tokenName}>{outputToken.name}</Text>
                </View>
                <Text style={styles.placeholderHint}>↓ 견적이 아래에 표시됩니다</Text>
            </View>

            <QuoteDisplay
                outputToken={outputToken}
                quote={quote.data}
                isLoading={quote.isLoading}
                isFetching={quote.isFetching}
                error={quote.error}
                slippageBps={slippageBps}
                onSlippageChange={setSlippageBps}
                inputIsEmpty={amount.trim() === ""}
            />

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="swap 실행"
                disabled
                style={[styles.swapButton, styles.swapButtonDisabled]}
            >
                <Text style={styles.swapButtonText}>
                    Swap (M4에서 활성화)
                </Text>
            </Pressable>
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
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111",
        marginBottom: 8,
    },
    inputCard: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 16,
        padding: 16,
        gap: 8,
        backgroundColor: "#fff",
    },
    outputCard: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 16,
        padding: 16,
        gap: 8,
        backgroundColor: "#fafafa",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    tokenSymbol: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
    },
    tokenName: {
        fontSize: 12,
        color: "#888",
    },
    amountInput: {
        fontSize: 28,
        fontWeight: "600",
        color: "#111",
        paddingVertical: 4,
    },
    placeholderHint: {
        fontSize: 12,
        color: "#bbb",
    },
    flipRow: {
        alignItems: "center",
    },
    flipButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#111",
        alignItems: "center",
        justifyContent: "center",
    },
    flipPressed: {
        opacity: 0.7,
    },
    flipText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    swapButton: {
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: "center",
    },
    swapButtonDisabled: {
        backgroundColor: "#ddd",
    },
    swapButtonText: {
        color: "#666",
        fontSize: 15,
        fontWeight: "600",
    },
});
