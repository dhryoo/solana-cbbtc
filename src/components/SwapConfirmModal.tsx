import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    Share,
    Text,
    View,
} from "react-native";

import type { ThemePalette } from "@/constants/theme";
import type { TokenInfo } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useToast } from "@/providers/ToastProvider";
import { hapticError, hapticLight, hapticSuccess } from "@/services/HapticsService";
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
    const styles = useThemedStyles(makeStyles);

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

                    {status.kind === "success" && quote && (
                        <SuccessStage
                            signature={status.signature}
                            inputToken={inputToken}
                            outputToken={outputToken}
                            quote={quote}
                            onClose={onClose}
                        />
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
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    return (
        <>
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.confirmTitle")}</Text>

            <View style={styles.row}>
                <Text style={styles.label}>{t("swap.confirmInput")}</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.inAmount, inputToken.decimals)} {inputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>{t("swap.expected")}</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.outAmount, outputToken.decimals)} {outputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>{t("swap.minReceive")}</Text>
                <Text style={styles.metric}>
                    {formatRawAmount(quote.otherAmountThreshold, outputToken.decimals)}{" "}
                    {outputToken.symbol}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>{t("swap.slippage")}</Text>
                <Text style={styles.metric}>{bpsToPercent(quote.slippageBps)}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>{t("swap.route")}</Text>
                <Text style={styles.metric}>
                    {quote.routePlan.length === 1
                        ? t("swap.hopSingular", { count: 1 })
                        : t("swap.hopPlural", { count: quote.routePlan.length })}
                </Text>
            </View>

            <Text style={styles.warn}>{t("swap.mainnetWarn")}</Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnSecondaryText}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    onPress={onConfirm}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>{t("swap.swapButton")}</Text>
                </Pressable>
            </View>
        </>
    );
}

function PendingStage(): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.pendingText}>{t("swap.pendingText")}</Text>
            <Text style={styles.pendingHint}>{t("swap.pendingHint")}</Text>
        </View>
    );
}

function SuccessStage({
    signature,
    inputToken,
    outputToken,
    quote,
    onClose,
}: {
    signature: string;
    inputToken: TokenInfo;
    outputToken: TokenInfo;
    quote: QuoteResponse;
    onClose: () => void;
}): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { showToast } = useToast();

    useEffect(() =>
    {
        void hapticSuccess();
    }, []);

    const onLongPressSignature = useCallback(async (): Promise<void> =>
    {
        try
        {
            await Clipboard.setStringAsync(signature);
            void hapticLight();
            showToast(t("common.copied"), { variant: "success" });
        }
        catch { /* ignore */ }
    }, [signature, showToast, t]);

    const onShare = useCallback(async (): Promise<void> =>
    {
        void hapticLight();
        const inputAmount = formatRawAmount(quote.inAmount, inputToken.decimals);
        const outputAmount = formatRawAmount(quote.outAmount, outputToken.decimals);
        const url = `https://solscan.io/tx/${signature}`;
        // 본문에 URL 포함 — Android/iOS 모두 Share sheet에서 본문 그대로 노출.
        const message = [
            t("swap.shareText", {
                inputAmount,
                inputSymbol: inputToken.symbol,
                outputAmount,
                outputSymbol: outputToken.symbol,
            }),
            url,
            t("swap.shareVia"),
        ].join("\n");
        try
        {
            await Share.share({
                message,
                url, // iOS 전용 필드 — Share sheet에서 별도 link card로 렌더링
                title: t("swap.successTitle"),
            });
        }
        catch
        {
            // 사용자가 dismiss 한 경우 등은 무시
        }
    }, [signature, inputToken, outputToken, quote, t]);

    return (
        <>
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.successTitle")}</Text>
            <Text style={styles.successLine}>{t("swap.successLine")}</Text>
            <Text style={styles.sigLabel}>{t("swap.signatureLabel")}</Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.copyAddress")}
                accessibilityHint={t("common.copyAddressHint")}
                onLongPress={() => { void onLongPressSignature(); }}
                delayLongPress={400}
            >
                <Text style={styles.signature} selectable>{signature}</Text>
            </Pressable>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t("swap.openSolscan")}
                    onPress={() => openSolscan(signature)}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Ionicons name="open-outline" size={14} style={styles.iconSecondary} />
                    <Text style={styles.btnSecondaryText}>{t("swap.openSolscan")}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("swap.share")}
                    onPress={() => { void onShare(); }}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Ionicons name="share-social-outline" size={14} style={styles.iconSecondary} />
                    <Text style={styles.btnSecondaryText}>{t("swap.share")}</Text>
                </Pressable>
            </View>
            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>{t("common.ok")}</Text>
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
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);

    useEffect(() =>
    {
        void hapticError();
    }, []);

    return (
        <>
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.failureTitle")}</Text>
            <Text style={styles.errorMsg}>{message}</Text>

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onClose}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnSecondary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnSecondaryText}>{t("common.close")}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={({ pressed }) =>
                        [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                >
                    <Text style={styles.btnPrimaryText}>{t("common.retry")}</Text>
                </Pressable>
            </View>
        </>
    );
}

const makeStyles = (t: ThemePalette) => ({
    backdrop: {
        flex: 1,
        backgroundColor: t.overlay,
        justifyContent: "flex-end" as const,
    },
    sheet: {
        backgroundColor: t.surface,
        padding: 20,
        paddingBottom: 36,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: t.borderStrong,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: t.text,
        marginBottom: 4,
    },
    row: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
    },
    label: {
        color: t.textMuted,
        fontSize: 13,
    },
    metric: {
        color: t.text,
        fontSize: 14,
        fontWeight: "600" as const,
    },
    warn: {
        marginTop: 4,
        fontSize: 12,
        color: t.warn,
        textAlign: "center" as const,
    },
    actions: {
        marginTop: 12,
        flexDirection: "row" as const,
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: "center" as const,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        gap: 6,
    },
    iconSecondary: {
        color: t.text,
    },
    btnPrimary: {
        backgroundColor: t.primary,
    },
    btnPrimaryText: {
        color: t.textInverse,
        fontSize: 15,
        fontWeight: "600" as const,
    },
    btnSecondary: {
        backgroundColor: t.surfaceMuted,
    },
    btnSecondaryText: {
        color: t.text,
        fontSize: 15,
        fontWeight: "500" as const,
    },
    pressed: {
        opacity: 0.7,
    },
    center: {
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 24,
    },
    pendingText: {
        fontSize: 15,
        color: t.text,
        fontWeight: "500" as const,
    },
    pendingHint: {
        fontSize: 12,
        color: t.textMuted,
    },
    successLine: {
        fontSize: 14,
        color: t.text,
    },
    sigLabel: {
        marginTop: 8,
        fontSize: 12,
        color: t.textMuted,
    },
    signature: {
        fontFamily: "Courier",
        fontSize: 12,
        color: t.text,
    },
    errorMsg: {
        fontSize: 14,
        color: t.error,
        lineHeight: 20,
    },
});
