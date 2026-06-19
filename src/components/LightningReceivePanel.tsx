/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, Pressable, Share, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { SOL, USDC, type TokenInfo } from "@/constants/tokens";
import { useCancellableSign } from "@/hooks/useCancellableSign";
import { useCreateReceive, useWaitAndClaim } from "@/hooks/useLightning";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import type { LightningReceive, LightningReceiveOutcome, LightningReceivePhase } from "@/services/lightning/types";
import { formatRawAmount } from "@/utils/format";
import { isUserRejection } from "@/utils/lendingErrors";

const DEST_TOKENS: TokenInfo[] = [USDC, SOL];

// 받기 정산(claim)에 필요한 최소 SOL 여유분 (lamports). escrow 계정 rent + ATA rent + 수수료 대략치.
// 받기는 "상대 결제 → 내 claim 서명" 순서라, SOL 이 없으면 결제는 됐는데 못 받는 상황이 됨.
// 그래서 인보이스 생성 전에 이 값 미만이면 미리 경고한다. rent 는 escrow 닫힐 때 대부분 회수.
const MIN_SOL_FOR_RECEIVE_CLAIM = 10_000_000n; // 0.01 SOL

// LN 받기 (FROM_BTCLN): dst 토큰·금액 → 인보이스 생성 → QR 표시 + 결제 대기 → 정산(claim).
export function LightningReceivePanel(): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { account } = useWallet();
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();

    const [dstToken, setDstToken] = useState<TokenInfo>(USDC);
    const [amountText, setAmountText] = useState("");
    const [receive, setReceive] = useState<LightningReceive | null>(null);
    const [phase, setPhase] = useState<LightningReceivePhase | null>(null);
    const [outcome, setOutcome] = useState<LightningReceiveOutcome | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const createMutation = useCreateReceive();
    const claimMutation = useWaitAndClaim();
    const sign = useCancellableSign();
    const solBalance = useTokenBalance(SOL, account?.publicKey ?? null);

    // SOL 잔액이 확인됐고 claim 여유분 미만이면 사전 경고 (잔액 로딩 전엔 경고 안 함)
    const lowSol = solBalance.data !== undefined && solBalance.data.amount < MIN_SOL_FOR_RECEIVE_CLAIM;

    const amountSats = /^\d+$/.test(amountText.trim()) && amountText.trim() !== "0"
        ? BigInt(amountText.trim())
        : null;

    const canCreate = isOnline && Boolean(account) && amountSats !== null && !createMutation.isPending && !receive;

    const reset = (): void =>
    {
        setReceive(null);
        setPhase(null);
        setOutcome(null);
        setNotice(null);
    };

    const onCreate = (): void =>
    {
        if (!canCreate || amountSats === null)
        {
            return;
        }
        reset();
        const token = sign.begin();
        createMutation.mutate(
            { dstToken, amountSats },
            {
                onSuccess: (r) =>
                {
                    if (!sign.isCurrent(token)) return;
                    setReceive(r);
                    // 인보이스 표시와 동시에 결제 대기·정산 시작
                    claimMutation.mutate(
                        {
                            receive: r,
                            onPhase: (p) => { if (sign.isCurrent(token)) setPhase(p); },
                        },
                        {
                            onSuccess: (res) =>
                            {
                                if (!sign.isCurrent(token)) return;
                                setPhase(null);
                                setOutcome(res);
                                setReceive(null);
                            },
                            onError: (err) =>
                            {
                                if (!sign.isCurrent(token)) return;
                                setPhase(null);
                                const cancelled = isUserRejection(err.message);
                                const expired = /receive_invoice_expired/.test(err.message);
                                setNotice(expired ? t("receive.expired")
                                    : cancelled ? t("receive.claimCancelled") : err.message);
                                setReceive(null);
                            },
                        },
                    );
                },
                onError: (err) =>
                {
                    if (!sign.isCurrent(token)) return;
                    setNotice(err.message);
                },
            },
        );
    };

    // 멈춘 받기/정산 폐기 탈출구. Seeker Seed Vault 는 거부 버튼이 없어 정산 서명 중 X 로 닫으면
    // 서명이 멈춰 "정산 중" 스피너에 갇힌다. reset() 으로 영구 pending 을 풀고, token 가드가
    // 뒤늦은 settle 을 무시한다. 결제가 이미 도착한 상태였다면 상대는 타임아웃 후 자동 환불됨.
    const cancelReceive = (): void =>
    {
        sign.cancel();
        createMutation.reset();
        claimMutation.reset();
        setReceive(null);
        setPhase(null);
        setNotice(t("receive.cancelled"));
    };

    const onCopy = async (): Promise<void> =>
    {
        if (!receive)
        {
            return;
        }
        await Clipboard.setStringAsync(receive.invoice);
        showToast(t("common.copied"), { variant: "info" });
    };

    const onShare = async (): Promise<void> =>
    {
        if (!receive)
        {
            return;
        }
        await Share.share({ message: receive.invoice }).catch(() => undefined);
    };

    return (
        <View style={styles.wrap}>
            {/* 입력 */}
            {!receive && !outcome && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{t("receive.dstTokenLabel")}</Text>
                    <View style={styles.tokenRow}>
                        {DEST_TOKENS.map((tok) => (
                            <Pressable
                                key={tok.symbol}
                                accessibilityRole="button"
                                accessibilityState={{ selected: dstToken.symbol === tok.symbol }}
                                onPress={() => { setDstToken(tok); reset(); }}
                                style={({ pressed }) => [styles.tokenChip, dstToken.symbol === tok.symbol && styles.tokenChipActive, pressed && { opacity: 0.7 }]}
                            >
                                <Text style={[styles.tokenChipText, dstToken.symbol === tok.symbol && styles.tokenChipTextActive]}>{tok.symbol}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={styles.cardTitle}>{t("receive.amountLabel")}</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amountText}
                        onChangeText={(v) => { setAmountText(v); reset(); }}
                        keyboardType="number-pad"
                        placeholder={t("receive.amountPlaceholder")}
                        placeholderTextColor={palette.textDim}
                        maxLength={12}
                        accessibilityLabel={t("receive.amountLabel")}
                    />
                    <AmountPad onChange={(v) => { setAmountText(v); reset(); }} value={amountText} styles={styles} />
                    {lowSol && (
                        <View style={styles.warnBox}>
                            <Ionicons name="alert-circle-outline" size={16} color={palette.warn} />
                            <Text style={styles.warnText}>{t("receive.lowSolWarn")}</Text>
                        </View>
                    )}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canCreate, busy: createMutation.isPending }}
                        disabled={!canCreate}
                        onPress={onCreate}
                        style={[styles.button, !canCreate && styles.buttonDisabled]}
                    >
                        {createMutation.isPending
                            ? <ActivityIndicator color={palette.textInverse} />
                            : <Text style={styles.buttonText}>{t("receive.createButton")}</Text>}
                    </Pressable>
                </View>
            )}

            {/* 인보이스 QR + 대기/정산 */}
            {receive && (
                <View style={styles.card}>
                    <Text style={styles.invoiceTitle}>{t("receive.invoiceTitle", { sats: receive.amountSats.toString(), token: receive.dstToken.symbol })}</Text>
                    <View style={styles.qrWrap}>
                        <QRCode value={receive.invoice} size={216} backgroundColor="#ffffff" />
                    </View>
                    <Text style={styles.invoiceText} numberOfLines={2} selectable>{receive.invoice}</Text>
                    <View style={styles.actionRow}>
                        <Pressable accessibilityRole="button" onPress={() => { void onCopy(); }} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}>
                            <Ionicons name="copy-outline" size={16} color={palette.text} />
                            <Text style={styles.secondaryText}>{t("receive.copy")}</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => { void onShare(); }} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}>
                            <Ionicons name="share-outline" size={16} color={palette.text} />
                            <Text style={styles.secondaryText}>{t("receive.share")}</Text>
                        </Pressable>
                    </View>
                    <View style={styles.statusRow}>
                        <ActivityIndicator color={palette.text} />
                        <Text style={styles.statusText}>
                            {phase === "claiming" ? t("receive.claiming") : t("receive.awaiting")}
                        </Text>
                    </View>
                    <Text style={styles.expectHint}>
                        {t("receive.expectHint", { amount: formatRawAmount(receive.expectedOutBase, receive.dstToken.decimals), token: receive.dstToken.symbol })}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("receive.cancelWaiting")}
                        onPress={cancelReceive}
                        style={({ pressed }) => [styles.cancelWaitBtn, pressed && { opacity: 0.6 }]}
                    >
                        <Ionicons name="close-circle-outline" size={16} color={palette.text} />
                        <Text style={styles.secondaryText}>{t("receive.cancelWaiting")}</Text>
                    </Pressable>
                </View>
            )}

            {/* 결과 */}
            {outcome && (
                <View style={styles.card}>
                    <View style={styles.resultRow}>
                        <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                        <Text style={styles.resultTitle}>{t("receive.receivedTitle")}</Text>
                    </View>
                    <Text style={styles.resultBody}>
                        {t("receive.receivedBody", { amount: formatRawAmount(outcome.outBase, dstToken.decimals), token: dstToken.symbol })}
                    </Text>
                    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://solscan.io/tx/${outcome.claimTxId}`)} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
                        <Ionicons name="open-outline" size={16} color={BRAND_PURPLE} />
                        <Text style={styles.linkText}>{t("earn.supply.viewExplorer")}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => { reset(); setAmountText(""); }} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.secondaryText}>{t("receive.again")}</Text>
                    </Pressable>
                </View>
            )}

            {notice ? (
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
                    <Text style={styles.infoText}>{notice}</Text>
                </View>
            ) : null}
        </View>
    );
}

// 간단한 sats 숫자 입력 (별도 키패드 없이 TextInput 대신 숫자만 — 여기선 inline 처리)
function AmountPad({ value, onChange, styles }: { value: string; onChange: (v: string) => void; styles: ReturnType<typeof makeStyles> }): React.JSX.Element
{
    const presets = ["1000", "5000", "10000", "50000"];
    return (
        <View style={styles.presetRow}>
            {presets.map((p) => (
                <Pressable key={p} accessibilityRole="button" onPress={() => onChange(p)} style={({ pressed }) => [styles.presetChip, value === p && styles.presetChipActive, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.presetText, value === p && styles.presetTextActive]}>{p}</Text>
                </Pressable>
            ))}
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    wrap: { gap: 16 },
    card: {
        borderWidth: 1, borderColor: t.border, borderRadius: 16,
        padding: 16, backgroundColor: t.surface, gap: 12,
    },
    cardTitle: { fontSize: 13, fontWeight: "700" as const, color: t.text },
    tokenRow: { flexDirection: "row" as const, gap: 8 },
    tokenChip: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.background },
    tokenChipActive: { backgroundColor: t.primary, borderColor: t.primary },
    tokenChipText: { fontSize: 14, fontWeight: "600" as const, color: t.text },
    tokenChipTextActive: { color: t.textInverse },
    amountInput: { borderWidth: 1, borderColor: t.borderStrong, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: "700" as const, color: t.text, backgroundColor: t.background },
    presetRow: { flexDirection: "row" as const, gap: 8, flexWrap: "wrap" as const },
    presetChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceMuted },
    presetChipActive: { borderColor: t.primary },
    presetText: { fontSize: 12, fontWeight: "600" as const, color: t.text },
    presetTextActive: { color: t.primary },
    button: { marginTop: 4, borderRadius: 12, paddingVertical: 14, alignItems: "center" as const, backgroundColor: t.primary },
    buttonDisabled: { backgroundColor: t.disabled },
    buttonText: { fontSize: 15, fontWeight: "700" as const, color: t.textInverse },
    invoiceTitle: { fontSize: 14, fontWeight: "700" as const, color: t.text, textAlign: "center" as const },
    qrWrap: { alignSelf: "center" as const, padding: 12, backgroundColor: "#ffffff", borderRadius: 12 },
    invoiceText: { fontSize: 11, color: t.textMuted, textAlign: "center" as const },
    actionRow: { flexDirection: "row" as const, gap: 8, justifyContent: "center" as const },
    secondaryBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
    cancelWaitBtn: { alignSelf: "center" as const, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, marginTop: 4, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1, borderColor: t.borderStrong, backgroundColor: t.surfaceMuted, minWidth: 140 },
    secondaryText: { fontSize: 14, fontWeight: "600" as const, color: t.text },
    statusRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, marginTop: 4 },
    statusText: { fontSize: 14, fontWeight: "600" as const, color: t.text },
    expectHint: { fontSize: 12, color: t.textMuted, textAlign: "center" as const },
    resultRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    resultTitle: { fontSize: 16, fontWeight: "700" as const, color: t.text },
    resultBody: { fontSize: 13, lineHeight: 19, color: t.textMuted },
    linkRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingVertical: 6 },
    linkText: { fontSize: 13, fontWeight: "600" as const, color: BRAND_PURPLE },
    infoBox: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, padding: 12, borderRadius: 12, backgroundColor: t.surfaceMuted },
    infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: t.textMuted },
    warnBox: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.warn, backgroundColor: t.surface },
    warnText: { flex: 1, fontSize: 12, lineHeight: 17, color: t.warn },
});
