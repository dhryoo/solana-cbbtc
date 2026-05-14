import React from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import type { TokenInfo } from "@/constants/tokens";
import type { QuoteResponse } from "@/types/jupiter";
import { formatRawAmount } from "@/utils/format";

type Status =
    | { kind: "idle" }
    | { kind: "pending" }
    | { kind: "success"; signature: string }
    | { kind: "error"; message: string };

interface SwapConfirmModalProps
{
    visible: boolean;
    inputToken: TokenInfo;
    outputToken: TokenInfo;
    quote: QuoteResponse | undefined;
    status: Status;
    onConfirm: () => void;
    onClose: () => void;
}

function bpsToPercent(bps: number): string
{
    return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

function openSolscan(signature: string): void
{
    void Linking.openURL(`https://solscan.io/tx/${signature}`);
}

export function SwapConfirmModal({
    visible,
    inputToken,
    outputToken,
    quote,
    status,
    onConfirm,
    onClose,
}: SwapConfirmModalProps): React.JSX.Element
{
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {status.kind === "idle" && quote && (
                        <ConfirmStage
                            inputToken={inputToken}
                            outputToken={outputToken}
                            quote={quote}
                            onConfirm={onConfirm}
                            onClose={onClose}
                        />
                    )}

                    {status.kind === "pending" && (
                        <PendingStage />
                    )}

                    {status.kind === "success" && (
                        <SuccessStage signature={status.signature} onClose={onClose} />
                    )}

                    {status.kind === "error" && (
                        <ErrorStage message={status.message} onRetry={onConfirm} onClose={onClose} />
                    )}
                </View>
            </View>
        </Modal>
    );
}

function ConfirmStage({
    inputToken,
    outputToken,
    quote,
    onConfirm,
    onClose,
}: {
    inputToken: TokenInfo;
    outputToken: TokenInfo;
    quote: QuoteResponse;
    onConfirm: () => void;
    onClose: () => void;
}): React.JSX.Element
{
    return (
        <>
            <Text style={styles.title}>Swap 확인</Text>

            <View style={styles.row}>
                <Text style={styles.label}>입력</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.inAmount, inputToken.decimals)} {inputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>예상 수령량</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.outAmount, outputToken.decimals)} {outputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>최소 수령량</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.otherAmountThreshold, outputToken.decimals)}{" "}
                    {outputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>슬리피지</Text>
                <Text style={styles.metric}>{bpsToPercent(quote.slippageBps)}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>라우트</Text>
                <Text style={styles.metric}>
                    {quote.routePlan.length} hop{quote.routePlan.length > 1 ? "s" : ""}
                </Text>
            </View>

            <Text style={styles.warn}>
                지갑에서 한 번 더 승인이 필요합니다. mainnet 실거래입니다.
            </Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnSecondaryText}>취소</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    onPress={onConfirm}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>Swap 실행</Text>
                </Pressable>
            </View>
        </>
    );
}

function PendingStage(): React.JSX.Element
{
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.pendingText}>지갑 승인 후 트랜잭션을 전송 중…</Text>
            <Text style={styles.pendingHint}>네트워크 상황에 따라 수 초 걸릴 수 있습니다.</Text>
        </View>
    );
}

function SuccessStage({
    signature,
    onClose,
}: { signature: string; onClose: () => void }): React.JSX.Element
{
    return (
        <>
            <Text style={styles.title}>Swap 성공</Text>
            <Text style={styles.successLine}>트랜잭션이 네트워크에 전송됐습니다.</Text>
            <Text style={styles.sigLabel}>Signature</Text>
            <Text style={styles.signature} selectable>{signature}</Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="link"
                    onPress={() => openSolscan(signature)}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnSecondaryText}>Solscan 열기</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>확인</Text>
                </Pressable>
            </View>
        </>
    );
}

function ErrorStage({
    message,
    onRetry,
    onClose,
}: {
    message: string;
    onRetry: () => void;
    onClose: () => void;
}): React.JSX.Element
{
    return (
        <>
            <Text style={styles.title}>Swap 실패</Text>
            <Text style={styles.errorMsg}>{message}</Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnSecondaryText}>닫기</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>다시 시도</Text>
                </Pressable>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#fff",
        padding: 20,
        paddingBottom: 36,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111",
        marginBottom: 4,
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
    metric: {
        color: "#111",
        fontSize: 14,
        fontWeight: "600",
    },
    warn: {
        marginTop: 4,
        fontSize: 12,
        color: "#a55",
        textAlign: "center",
    },
    actions: {
        marginTop: 12,
        flexDirection: "row",
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: "center",
    },
    btnPrimary: {
        backgroundColor: "#111",
    },
    btnPrimaryText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    btnSecondary: {
        backgroundColor: "#eee",
    },
    btnSecondaryText: {
        color: "#333",
        fontSize: 15,
        fontWeight: "500",
    },
    pressed: {
        opacity: 0.7,
    },
    center: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 24,
    },
    pendingText: {
        fontSize: 15,
        color: "#222",
        fontWeight: "500",
    },
    pendingHint: {
        fontSize: 12,
        color: "#888",
    },
    successLine: {
        fontSize: 14,
        color: "#222",
    },
    sigLabel: {
        marginTop: 8,
        fontSize: 12,
        color: "#777",
    },
    signature: {
        fontFamily: "Courier",
        fontSize: 12,
        color: "#111",
    },
    errorMsg: {
        fontSize: 14,
        color: "#c33",
        lineHeight: 20,
    },
});
