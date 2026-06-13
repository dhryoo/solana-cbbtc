/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { TxProgress } from "@/components/TxProgress";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { SOL, USDC, type TokenInfo } from "@/constants/tokens";
import { useLightningPay, useLightningQuote, useRefundableSwaps, useRefundAll } from "@/hooks/useLightning";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import { LightningGuideScreen } from "@/screens/LightningGuideScreen";
import { LightningQuoteError } from "@/services/lightning/LightningService";
import type { LightningPayOutcome, LightningPayPhase, LightningQuote } from "@/services/lightning/types";
import { formatRawAmount } from "@/utils/format";
import { isAuthFailure, isUserRejection, isWalletTimeout } from "@/utils/lendingErrors";
import { parseLightningInput } from "@/utils/lightningInvoice";
import type { ProgressState, TxStep } from "@/utils/txProgress";

// Phase 3 실험 기능 — Lightning 인보이스 결제 (Labs 토글 ON 일 때만 진입 가능).
// 흐름: 입력(BOLT11/lightning address) → 견적(자금 이동 없음) → 결제(MWA 서명 → LP 가 LN 지급).
// 실패 시 cooperative refund 로 자금 회수 (Solana 서명만).

const SOURCE_TOKENS: TokenInfo[] = [USDC, SOL];

interface LightningScreenProps
{
    visible: boolean;
    onClose: () => void;
}

// LightningPayPhase → 기존 TxProgress 단계 매핑 (TxProgress 무수정 재사용)
function phaseToStep(phase: LightningPayPhase): TxStep
{
    switch (phase)
    {
        case "signing": return "signing";
        case "paying": return "sending";
        case "refunding": return "sending";
    }
}

export function LightningScreen({ visible, onClose }: LightningScreenProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { account } = useWallet();
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();

    const [destination, setDestination] = useState("");
    const [amountSatsText, setAmountSatsText] = useState("");
    const [srcToken, setSrcToken] = useState<TokenInfo>(USDC);
    const [quote, setQuote] = useState<LightningQuote | null>(null);
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [outcome, setOutcome] = useState<LightningPayOutcome | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [guideOpen, setGuideOpen] = useState(false);

    const quoteMutation = useLightningQuote();
    const payMutation = useLightningPay();
    const refundable = useRefundableSwaps(visible);
    const refundAllMutation = useRefundAll();

    const onRefundAll = (): void =>
    {
        if (refundAllMutation.isPending)
        {
            return;
        }
        refundAllMutation.mutate(undefined, {
            onSuccess: (count) =>
            {
                showToast(t("lightning.refundDone", { count }), { variant: "info", durationMs: 5000 });
                void refundable.refetch();
            },
            onError: (err) =>
            {
                const cancelled = isUserRejection(err.message);
                showToast(
                    cancelled ? t("errors.userCancelled") : t("lightning.refundError"),
                    { variant: cancelled ? "info" : "error", durationMs: 5000 },
                );
            },
        });
    };

    // bolt11 에 금액이 내장돼 있으면 금액 입력 비활성
    const parsedInput = useMemo(() => parseLightningInput(destination), [destination]);
    const amountEmbedded = parsedInput.kind === "bolt11" && parsedInput.amountSats !== null;
    const amountSats = useMemo(() =>
    {
        if (amountEmbedded)
        {
            return null;
        }
        const n = amountSatsText.trim();
        return /^\d+$/.test(n) && n !== "0" ? BigInt(n) : null;
    }, [amountSatsText, amountEmbedded]);

    const canQuote = isOnline
        && Boolean(account)
        && destination.trim().length > 0
        && !quoteMutation.isPending
        && (amountEmbedded || amountSats !== null);

    const resetResult = useCallback((): void =>
    {
        setQuote(null);
        setOutcome(null);
        setProgress(null);
        setNotice(null);
        setLastError(null);
    }, []);

    const quoteErrorMessage = useCallback((err: Error): string =>
    {
        if (err instanceof LightningQuoteError)
        {
            switch (err.code)
            {
                case "invalid_input": return t("lightning.errInvalidInput");
                case "expired_invoice": return t("lightning.errExpiredInvoice");
                case "amount_required": return t("lightning.errAmountRequired");
                case "amount_not_allowed": return t("lightning.errAmountNotAllowed");
            }
        }
        return err.message;
    }, [t]);

    const onGetQuote = (): void =>
    {
        if (!canQuote)
        {
            return;
        }
        resetResult();
        quoteMutation.mutate(
            { rawInput: destination, amountSats, srcToken },
            {
                onSuccess: (q) => setQuote(q),
                onError: (err) => setLastError(quoteErrorMessage(err)),
            },
        );
    };

    const onPay = (): void =>
    {
        if (!quote || payMutation.isPending)
        {
            return;
        }
        setNotice(null);
        setLastError(null);
        setProgress({ step: "signing", state: "running" });
        payMutation.mutate(
            {
                quote,
                onPhase: (phase) =>
                {
                    if (phase === "refunding")
                    {
                        setNotice(t("lightning.refundingNotice"));
                    }
                    setProgress({ step: phaseToStep(phase), state: "running" });
                },
            },
            {
                onSuccess: (res) =>
                {
                    setProgress(null);
                    setOutcome(res);
                    setQuote(null);
                    if (res.status === "paid")
                    {
                        setDestination("");
                        setAmountSatsText("");
                    }
                },
                onError: (err) =>
                {
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    const cancelled = isUserRejection(err.message);
                    const noticeMsg = isAuthFailure(err.message) ? t("earn.authFailedHint")
                        : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    setNotice(noticeMsg);
                    setLastError(noticeMsg || cancelled ? null : err.message);
                    showToast(
                        cancelled ? t("errors.userCancelled") : t("lightning.payFailed"),
                        { variant: cancelled ? "info" : "error", durationMs: 5000 },
                    );
                },
            },
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                            <Ionicons name="flash" size={18} color={BRAND_PURPLE} />
                            <Text style={styles.headerTitle}>{t("lightning.title")}</Text>
                            <View style={styles.labsBadge}>
                                <Text style={styles.labsBadgeText}>{t("labs.badge")}</Text>
                            </View>
                        </View>
                        <Text style={styles.headerSubtitle}>{t("lightning.subtitle")}</Text>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("lightningGuide.title")}
                        onPress={() => setGuideOpen(true)}
                        style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                    >
                        <Ionicons name="help-circle-outline" size={22} color={palette.textMuted} />
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        onPress={onClose}
                        style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                    >
                        <Ionicons name="close" size={22} color={palette.text} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* 실험 기능 고지 */}
                    <View style={styles.experimentBox}>
                        <Ionicons name="flask-outline" size={16} color={palette.textMuted} />
                        <Text style={styles.experimentText}>{t("lightning.experimentNotice")}</Text>
                    </View>

                    {/* 중단된 swap 환불 안내 + 실행 */}
                    {(refundable.data ?? 0) > 0 && (
                        <View style={styles.warnBox}>
                            <View style={styles.warnRow}>
                                <Ionicons name="alert-circle-outline" size={16} color={palette.warn} />
                                <Text style={styles.warnText}>{t("lightning.refundableNotice", { count: refundable.data })}</Text>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("lightning.refundButton")}
                                accessibilityState={{ busy: refundAllMutation.isPending }}
                                disabled={refundAllMutation.isPending}
                                onPress={onRefundAll}
                                style={({ pressed }) => [styles.refundButton, pressed && { opacity: 0.7 }]}
                            >
                                {refundAllMutation.isPending
                                    ? <ActivityIndicator size="small" color={palette.text} />
                                    : <Text style={styles.refundButtonText}>{t("lightning.refundButton")}</Text>}
                            </Pressable>
                        </View>
                    )}

                    {/* 입력 */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("lightning.destLabel")}</Text>
                        <TextInput
                            style={styles.input}
                            value={destination}
                            onChangeText={(v) => { setDestination(v); resetResult(); }}
                            placeholder={t("lightning.destPlaceholder")}
                            placeholderTextColor={palette.textDim}
                            autoCapitalize="none"
                            autoCorrect={false}
                            multiline
                            editable={!payMutation.isPending}
                            accessibilityLabel={t("lightning.destLabel")}
                        />
                        {!amountEmbedded && (
                            <>
                            <Text style={styles.cardTitle}>{t("lightning.amountLabel")}</Text>
                            <TextInput
                                style={styles.input}
                                value={amountSatsText}
                                onChangeText={(v) => { setAmountSatsText(v); resetResult(); }}
                                keyboardType="number-pad"
                                placeholder={t("lightning.amountPlaceholder")}
                                placeholderTextColor={palette.textDim}
                                maxLength={12}
                                editable={!payMutation.isPending}
                                accessibilityLabel={t("lightning.amountLabel")}
                            />
                            </>
                        )}
                        {amountEmbedded && parsedInput.kind === "bolt11" && (
                            <Text style={styles.embeddedAmount}>
                                {t("lightning.embeddedAmount", { sats: parsedInput.amountSats?.toString() ?? "" })}
                            </Text>
                        )}

                        <Text style={styles.cardTitle}>{t("lightning.srcTokenLabel")}</Text>
                        <View style={styles.tokenRow}>
                            {SOURCE_TOKENS.map((tok) => (
                                <Pressable
                                    key={tok.symbol}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: srcToken.symbol === tok.symbol }}
                                    onPress={() => { setSrcToken(tok); resetResult(); }}
                                    style={({ pressed }) =>
                                        [
                                            styles.tokenChip,
                                            srcToken.symbol === tok.symbol && styles.tokenChipActive,
                                            pressed && { opacity: 0.7 },
                                        ]}
                                >
                                    <Text
                                        style={[
                                            styles.tokenChipText,
                                            srcToken.symbol === tok.symbol && styles.tokenChipTextActive,
                                        ]}
                                    >
                                        {tok.symbol}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !canQuote, busy: quoteMutation.isPending }}
                            disabled={!canQuote}
                            onPress={onGetQuote}
                            style={[styles.button, !canQuote && styles.buttonDisabled]}
                        >
                            {quoteMutation.isPending
                                ? <ActivityIndicator color={palette.textInverse} />
                                : <Text style={styles.buttonText}>{t("lightning.quoteButton")}</Text>}
                        </Pressable>
                        {quoteMutation.isPending && (
                            <Text style={styles.initHint}>{t("lightning.initHint")}</Text>
                        )}
                    </View>

                    {/* 견적 카드 */}
                    {quote && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{t("lightning.quoteHeading")}</Text>
                            <Row label={t("lightning.quoteSend")} value={`${formatRawAmount(quote.inputBase, quote.srcToken.decimals)} ${quote.srcToken.symbol}`} styles={styles} />
                            <Row label={t("lightning.quoteFee")} value={`${formatRawAmount(quote.feeBase, quote.srcToken.decimals)} ${quote.srcToken.symbol}`} styles={styles} />
                            <Row label={t("lightning.quoteReceive")} value={`${quote.outputSats.toString()} sats`} styles={styles} />
                            <Row label={t("lightning.quoteDest")} value={quote.destinationLabel} styles={styles} />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ disabled: payMutation.isPending, busy: payMutation.isPending }}
                                disabled={payMutation.isPending}
                                onPress={onPay}
                                style={[styles.button, payMutation.isPending && styles.buttonDisabled]}
                            >
                                {payMutation.isPending
                                    ? <ActivityIndicator color={palette.textInverse} />
                                    : <Text style={styles.buttonText}>{t("lightning.payButton")}</Text>}
                            </Pressable>
                        </View>
                    )}

                    {progress ? <TxProgress current={progress.step} state={progress.state} /> : null}

                    {/* 결과 */}
                    {outcome && (
                        <View style={styles.card}>
                            {outcome.status === "paid" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                                    <Text style={styles.resultTitle}>{t("lightning.paidTitle")}</Text>
                                </View>
                                <Text style={styles.resultBody}>{t("lightning.paidBody")}</Text>
                                </>
                            )}
                            {outcome.status === "refunded" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="arrow-undo-circle-outline" size={22} color={palette.warn} />
                                    <Text style={styles.resultTitle}>{t("lightning.refundedTitle")}</Text>
                                </View>
                                <Text style={styles.resultBody}>{t("lightning.refundedBody")}</Text>
                                </>
                            )}
                            {outcome.status === "refund_failed" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="alert-circle" size={22} color={palette.error} />
                                    <Text style={styles.resultTitle}>{t("lightning.refundFailedTitle")}</Text>
                                </View>
                                <Text style={styles.resultBody}>{t("lightning.refundFailedBody")}</Text>
                                </>
                            )}
                            <Pressable
                                accessibilityRole="link"
                                onPress={() => void Linking.openURL(`https://solscan.io/tx/${outcome.commitTxId}`)}
                                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}
                            >
                                <Ionicons name="open-outline" size={16} color={BRAND_PURPLE} />
                                <Text style={styles.linkText}>{t("earn.supply.viewExplorer")}</Text>
                            </Pressable>
                        </View>
                    )}

                    {lastError
                        ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorTitle}>{t("lightning.payFailed")} · {t("earn.supply.copyHint")}</Text>
                                <Text style={styles.errorDetail} selectable>{lastError}</Text>
                            </View>
                        )
                        : null}

                    {notice
                        ? (
                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
                                <Text style={styles.infoText}>{notice}</Text>
                            </View>
                        )
                        : null}
                </ScrollView>
            </View>
            <LightningGuideScreen visible={guideOpen} onClose={() => setGuideOpen(false)} />
        </Modal>
    );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }): React.JSX.Element
{
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: t.text },
    labsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: BRAND_PURPLE,
    },
    labsBadgeText: { fontSize: 10, fontWeight: "700", color: "#ffffff", letterSpacing: 0.5 },
    headerSubtitle: { fontSize: 12, color: t.textMuted },
    closeButton: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceMuted,
    },
    scroll: { padding: 20, gap: 16, paddingBottom: 48 },
    experimentBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: t.surfaceMuted,
        borderWidth: 1,
        borderColor: t.border,
    },
    experimentText: { flex: 1, fontSize: 12, lineHeight: 17, color: t.textMuted },
    warnBox: {
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.warn,
        backgroundColor: t.surface,
    },
    warnRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    warnText: { flex: 1, fontSize: 12, lineHeight: 17, color: t.warn },
    refundButton: {
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.borderStrong,
        backgroundColor: t.surfaceMuted,
        minWidth: 100,
        alignItems: "center",
    },
    refundButtonText: { fontSize: 13, fontWeight: "700", color: t.text },
    card: {
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 16,
        backgroundColor: t.surface,
        gap: 10,
    },
    cardTitle: { fontSize: 13, fontWeight: "700", color: t.text },
    input: {
        borderWidth: 1,
        borderColor: t.borderStrong,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: t.text,
        backgroundColor: t.background,
        minHeight: 44,
    },
    embeddedAmount: { fontSize: 12, color: t.textMuted },
    tokenRow: { flexDirection: "row", gap: 8 },
    tokenChip: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
    },
    tokenChipActive: { backgroundColor: t.primary, borderColor: t.primary },
    tokenChipText: { fontSize: 14, fontWeight: "600", color: t.text },
    tokenChipTextActive: { color: t.textInverse },
    button: {
        marginTop: 4,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        backgroundColor: t.primary,
    },
    buttonDisabled: { backgroundColor: t.disabled },
    buttonText: { fontSize: 15, fontWeight: "700", color: t.textInverse },
    initHint: { fontSize: 11, color: t.textDim, textAlign: "center" },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    rowLabel: { fontSize: 13, color: t.textMuted },
    rowValue: { flex: 1, fontSize: 13, fontWeight: "600", color: t.text, textAlign: "right" },
    resultRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    resultTitle: { fontSize: 16, fontWeight: "700", color: t.text },
    resultBody: { fontSize: 13, lineHeight: 19, color: t.textMuted },
    linkRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
    linkText: { fontSize: 13, fontWeight: "600", color: BRAND_PURPLE },
    errorBox: {
        borderWidth: 1,
        borderColor: t.error,
        borderRadius: 12,
        padding: 12,
        gap: 6,
    },
    errorTitle: { fontSize: 12, fontWeight: "700", color: t.error },
    errorDetail: { fontSize: 11, color: t.textMuted },
    infoBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: t.surfaceMuted,
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: t.textMuted },
});
