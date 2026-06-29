/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Keyboard,
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

import { LightningReceivePanel } from "@/components/LightningReceivePanel";
import { QRScanModal } from "@/components/QRScanModal";
import { TxProgressModal } from "@/components/TxProgressModal";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { CBBTC, SOL, USDC, type TokenInfo } from "@/constants/tokens";
import {
    useCbbtcLightningPay,
    useCbbtcLightningQuote,
    type CbbtcLightningQuote,
    type CbbtcPayPhase,
} from "@/hooks/useCbbtcLightning";
import { useLightningPay, useLightningQuote, useRefundableSwaps, useRefundAll } from "@/hooks/useLightning";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import { LightningGuideScreen } from "@/screens/LightningGuideScreen";
import { hapticSuccess } from "@/services/HapticsService";
import { LightningQuoteError } from "@/services/lightning/LightningService";
import { isLightningAmountError } from "@/services/lightning/types";
import type { LightningPayOutcome, LightningPayPhase, LightningQuote } from "@/services/lightning/types";
import { formatRawAmount } from "@/utils/format";
import { isSolGasLow } from "@/utils/gasCheck";
import { isAuthFailure, isUserRejection, isWalletTimeout } from "@/utils/lendingErrors";
import { parseLightningInput } from "@/utils/lightningInvoice";
import type { ProgressState, TxStep } from "@/utils/txProgress";

// Phase 3 실험 기능 — Lightning 인보이스 결제 (Labs 토글 ON 일 때만 진입 가능).
// 흐름: 입력(BOLT11/lightning address) → 견적(자금 이동 없음) → 결제(MWA 서명 → LP 가 LN 지급).
// 실패 시 cooperative refund 로 자금 회수 (Solana 서명만).

const SOURCE_TOKENS: TokenInfo[] = [USDC, SOL, CBBTC];

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
    // 보내기도 SOL 을 가스로 쓴다(Jupiter swap + Atomiq commit 서명). 받기처럼 사전 안내.
    const solBalance = useTokenBalance(SOL, account?.publicKey ?? null);
    const solGasLow = isSolGasLow(solBalance.data?.amount);
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();

    const [destination, setDestination] = useState("");
    const [amountSatsText, setAmountSatsText] = useState("");
    const [srcToken, setSrcToken] = useState<TokenInfo>(USDC);
    const [quote, setQuote] = useState<LightningQuote | null>(null);
    const [cbbtcQuote, setCbbtcQuote] = useState<CbbtcLightningQuote | null>(null);
    const [cbbtcStatus, setCbbtcStatus] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [outcome, setOutcome] = useState<LightningPayOutcome | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [guideOpen, setGuideOpen] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [mode, setMode] = useState<"send" | "receive">("send");

    const isCbbtc = srcToken.symbol === CBBTC.symbol;

    const quoteMutation = useLightningQuote();
    const payMutation = useLightningPay();
    const cbbtcQuoteMutation = useCbbtcLightningQuote();
    const cbbtcPayMutation = useCbbtcLightningPay();
    const refundable = useRefundableSwaps(visible);
    const refundAllMutation = useRefundAll();

    // cbBTC 결제 단계 → 상태 라벨
    const cbbtcPhaseLabel = useCallback((phase: CbbtcPayPhase): string =>
    {
        switch (phase)
        {
            case "swapping": return t("lightning.cbbtcSwapping");
            case "confirming": return t("lightning.cbbtcConfirming");
            case "signing": return t("lightning.cbbtcPaySigning");
            case "paying": return t("lightning.cbbtcPaying");
            case "refunding": return t("lightning.refundingNotice");
        }
    }, [t]);

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
        && !cbbtcQuoteMutation.isPending
        && (amountEmbedded || amountSats !== null);

    const resetResult = useCallback((): void =>
    {
        setQuote(null);
        setCbbtcQuote(null);
        setCbbtcStatus(null);
        setOutcome(null);
        setProgress(null);
        setNotice(null);
        setLastError(null);
    }, []);

    // preimage(=지불 증명) 복사 — 결제 완료(CLAIMED) 후 결과카드에서만 노출됨
    const onCopyPreimage = useCallback(async (secret: string | null): Promise<void> =>
    {
        if (!secret)
        {
            return;
        }
        await Clipboard.setStringAsync(secret);
        void hapticSuccess();
        showToast(t("common.copied"), { variant: "success", durationMs: 1500 });
    }, [showToast, t]);

    const onScanned = useCallback((value: string): void =>
    {
        setScanOpen(false);
        setDestination(value);
        resetResult();
    }, [resetResult]);

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
                case "quote_expired": return t("lightning.quoteExpired");
            }
        }
        if (isLightningAmountError(err))
        {
            return err.tooLow
                ? t("lightning.errAmountTooLow", { min: err.minSats?.toString() ?? "?" })
                : t("lightning.errAmountTooHigh", { max: err.maxSats?.toString() ?? "?" });
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
        if (isCbbtc)
        {
            // cbBTC: Atomiq(USDC) 견적 + Jupiter cbBTC→USDC ExactOut 견적
            cbbtcQuoteMutation.mutate(
                { rawInput: destination, amountSats },
                {
                    onSuccess: (q) => setCbbtcQuote(q),
                    onError: (err) => setLastError(quoteErrorMessage(err)),
                },
            );
            return;
        }
        quoteMutation.mutate(
            { rawInput: destination, amountSats, srcToken },
            {
                onSuccess: (q) => setQuote(q),
                onError: (err) => setLastError(quoteErrorMessage(err)),
            },
        );
    };

    // 결제 시도마다 토큰 증가. MWA 가 지갑 dismiss(X) 시 응답을 안 주고 멈추는 경우가 있어
    // (서명 promise 가 영원히 pending), '취소'로 그 시도를 폐기하고 settle 콜백을 무시한다.
    const payTokenRef = useRef(0);
    // 취소 시 SDK 폴링(LP 결제 대기·확정 대기)을 실제로 중단하기 위한 controller. token 가드는 UI 만
    // 풀고, abort 는 백그라운드 폴링을 멈춘다 (서명 자체는 native MWA 라 abort 불가 — token 가드 담당).
    const payAbortRef = useRef<AbortController | null>(null);

    // cbBTC 결제: Jupiter swap(서명1) → 확정 → Atomiq 결제(서명2). 중간 실패 시 USDC 보유로 graceful.
    const onPayCbbtc = (): void =>
    {
        if (!cbbtcQuote || cbbtcPayMutation.isPending)
        {
            return;
        }
        const token = ++payTokenRef.current;
        payAbortRef.current = new AbortController();
        // swap 단계를 넘어선 뒤(=cbBTC 가 이미 USDC 로 바뀜) 실패하면 USDC 로 재시도 안내
        let swapped = false;
        setNotice(null);
        setLastError(null);
        Keyboard.dismiss();
        setProgress({ step: "signing", state: "running" });
        setCbbtcStatus(cbbtcPhaseLabel("swapping"));
        cbbtcPayMutation.mutate(
            {
                rawInput: destination,
                amountSats,
                swap: cbbtcQuote.swap,
                abortSignal: payAbortRef.current.signal,
                onPhase: (phase) =>
                {
                    if (token !== payTokenRef.current)
                    {
                        return;
                    }
                    if (phase === "confirming" || phase === "signing")
                    {
                        swapped = true;
                    }
                    setCbbtcStatus(cbbtcPhaseLabel(phase));
                    setProgress({ step: phase === "swapping" ? "signing" : "sending", state: "running" });
                },
            },
            {
                onSuccess: (res) =>
                {
                    if (token !== payTokenRef.current)
                    {
                        return;
                    }
                    setProgress(null);
                    setCbbtcStatus(null);
                    setOutcome(res.outcome);
                    setCbbtcQuote(null);
                    if (res.outcome.status === "paid")
                    {
                        setDestination("");
                        setAmountSatsText("");
                    }
                    else
                    {
                        void refundable.refetch();
                    }
                },
                onError: (err) =>
                {
                    if (token !== payTokenRef.current)
                    {
                        return;
                    }
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    setCbbtcStatus(null);
                    void refundable.refetch();
                    const cancelled = isUserRejection(err.message);
                    const timedOut = /swap_confirm_timeout/.test(err.message);
                    // swap 후 실패 → 이미 USDC 보유 → USDC 로 재시도 안내 + 소스 자동 전환
                    const afterSwap = swapped || timedOut;
                    const noticeMsg = afterSwap ? t("lightning.cbbtcRetryWithUsdc")
                        : isAuthFailure(err.message) ? t("earn.authFailedHint")
                            : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    if (afterSwap)
                    {
                        setSrcToken(USDC);
                        setCbbtcQuote(null);
                    }
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

    const onPay = (): void =>
    {
        if (isCbbtc)
        {
            onPayCbbtc();
            return;
        }
        if (!quote || payMutation.isPending)
        {
            return;
        }
        const token = ++payTokenRef.current;
        payAbortRef.current = new AbortController();
        setNotice(null);
        setLastError(null);
        Keyboard.dismiss();
        setProgress({ step: "signing", state: "running" });
        payMutation.mutate(
            {
                quote,
                abortSignal: payAbortRef.current.signal,
                onPhase: (phase) =>
                {
                    if (token !== payTokenRef.current)
                    {
                        return;
                    }
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
                    if (token !== payTokenRef.current)
                    {
                        return; // 사용자가 폐기한 시도의 뒤늦은 성공 — 무시
                    }
                    setProgress(null);
                    setOutcome(res);
                    setQuote(null);
                    if (res.status === "paid")
                    {
                        setDestination("");
                        setAmountSatsText("");
                    }
                    else
                    {
                        // refunded / refund_failed → escrow 상태 변화 → 환불 배너 즉시 갱신(staleTime 대기 안 함)
                        void refundable.refetch();
                    }
                },
                onError: (err) =>
                {
                    if (token !== payTokenRef.current)
                    {
                        return;
                    }
                    // quote 만료(서명 전 차단) → quote 카드를 비워 재견적 유도
                    if (err instanceof LightningQuoteError && err.code === "quote_expired")
                    {
                        setProgress(null);
                        setQuote(null);
                        setNotice(t("lightning.quoteExpired"));
                        showToast(t("lightning.quoteExpired"), { variant: "info", durationMs: 5000 });
                        return;
                    }
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    // 실패 시 commit 된 escrow 가 잠겨 있을 수 있음 → 환불 배너 갱신
                    void refundable.refetch();
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

    // 서명 대기에서 멈춘 시도를 사용자가 직접 폐기 — 진행 중인 promise 의 결과는 토큰으로 무시됨.
    // 서명 전이라 escrow 는 안 생기지만, 혹시 생겼더라도 화면 재진입 시 환불 배너가 잡는다.
    const onCancelPending = (): void =>
    {
        payTokenRef.current += 1;
        payAbortRef.current?.abort();
        // reset() 없으면 MWA 서명에서 멈춘 mutation 이 영원히 pending → 결제 버튼이 계속 잠긴다.
        payMutation.reset();
        cbbtcPayMutation.reset();
        setProgress(null);
        setCbbtcStatus(null);
        setQuote(null);
        setCbbtcQuote(null);
        setNotice(t("lightning.cancelledPendingNotice"));
    };

    // 화면을 닫을 때도 멈춘 진행 상태를 정리 — 다시 열면 깨끗한 입력 폼.
    const handleClose = (): void =>
    {
        payTokenRef.current += 1;
        payAbortRef.current?.abort();
        setProgress(null);
        setCbbtcStatus(null);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <View style={styles.titleRow}>
                            <Ionicons name="flash" size={18} color={BRAND_PURPLE} />
                            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.4}>{t("lightning.title")}</Text>
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
                        onPress={handleClose}
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

                    {/* 보내기 / 받기 토글 */}
                    <View style={styles.modeToggle}>
                        {(["send", "receive"] as const).map((m) => (
                            <Pressable
                                key={m}
                                accessibilityRole="button"
                                accessibilityState={{ selected: mode === m }}
                                onPress={() => setMode(m)}
                                style={[styles.modeTab, mode === m && styles.modeTabActive]}
                            >
                                <Ionicons
                                    name={m === "send" ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
                                    size={16}
                                    color={mode === m ? palette.textInverse : palette.textMuted}
                                />
                                <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                                    {t(m === "send" ? "lightning.modeSend" : "lightning.modeReceive")}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {mode === "receive" && <LightningReceivePanel />}

                    {mode === "send" && (
                    <>
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
                        <View style={styles.destLabelRow}>
                            <Text style={styles.cardTitle}>{t("lightning.destLabel")}</Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("qrScan.scanButton")}
                                onPress={() => setScanOpen(true)}
                                style={({ pressed }) => [styles.scanButton, pressed && { opacity: 0.6 }]}
                            >
                                <Ionicons name="scan-outline" size={16} color={BRAND_PURPLE} />
                                <Text style={styles.scanButtonText}>{t("qrScan.scanButton")}</Text>
                            </Pressable>
                        </View>
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

                        {solGasLow && !notice && (
                            <View
                                style={styles.warnBox}
                                accessible
                                accessibilityRole="alert"
                                accessibilityLabel={t("errors.lowSolGas", { amount: (solBalance.data?.uiAmount ?? 0).toFixed(4) })}
                            >
                                <View style={styles.warnRow}>
                                    <Ionicons name="alert-circle-outline" size={16} color={palette.warn} importantForAccessibility="no" />
                                    <Text style={styles.warnText}>{t("errors.lowSolGas", { amount: (solBalance.data?.uiAmount ?? 0).toFixed(4) })}</Text>
                                </View>
                            </View>
                        )}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !canQuote, busy: quoteMutation.isPending || cbbtcQuoteMutation.isPending }}
                            disabled={!canQuote}
                            onPress={onGetQuote}
                            style={[styles.button, !canQuote && styles.buttonDisabled]}
                        >
                            {(quoteMutation.isPending || cbbtcQuoteMutation.isPending)
                                ? <ActivityIndicator color={palette.textInverse} />
                                : <Text style={styles.buttonText}>{t("lightning.quoteButton")}</Text>}
                        </Pressable>
                        {(quoteMutation.isPending || cbbtcQuoteMutation.isPending) && (
                            <Text style={styles.initHint}>{t("lightning.initHint")}</Text>
                        )}
                    </View>

                    {/* 견적 카드 — USDC/SOL 직결제 */}
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

                    {/* 견적 카드 — cbBTC (Jupiter swap → Atomiq 결제) */}
                    {cbbtcQuote && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{t("lightning.cbbtcQuoteHeading")}</Text>
                            <Text style={styles.cbbtcChainHint}>{t("lightning.cbbtcChainHint")}</Text>
                            <Row label={t("lightning.cbbtcSwapFrom")} value={`~${formatRawAmount(cbbtcQuote.swap.cbbtcInBase, CBBTC.decimals)} ${CBBTC.symbol}`} styles={styles} />
                            <Row label={t("lightning.cbbtcSwapTo")} value={`${formatRawAmount(cbbtcQuote.usdcTargetBase, USDC.decimals)} ${USDC.symbol}`} styles={styles} />
                            <Row label={t("lightning.quoteReceive")} value={`${cbbtcQuote.atomiqPreview.outputSats.toString()} sats`} styles={styles} />
                            <Row label={t("lightning.quoteDest")} value={cbbtcQuote.atomiqPreview.destinationLabel} styles={styles} />
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ disabled: cbbtcPayMutation.isPending, busy: cbbtcPayMutation.isPending }}
                                disabled={cbbtcPayMutation.isPending}
                                onPress={onPay}
                                style={[styles.button, cbbtcPayMutation.isPending && styles.buttonDisabled]}
                            >
                                {cbbtcPayMutation.isPending
                                    ? <ActivityIndicator color={palette.textInverse} />
                                    : <Text style={styles.buttonText}>{t("lightning.cbbtcPayButton")}</Text>}
                            </Pressable>
                        </View>
                    )}

                    <TxProgressModal
                        progress={progress}
                        statusText={cbbtcStatus}
                        title={t("txProgress.processing")}
                        onCancel={onCancelPending}
                        cancelLabel={t("lightning.cancelPending")}
                    />

                    {/* 결과 */}
                    {outcome && (
                        <View style={styles.card}>
                            {outcome.status === "paid" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                                    <Text style={styles.resultTitle} maxFontSizeMultiplier={1.4}>{t("lightning.paidTitle")}</Text>
                                </View>
                                <Text style={styles.resultBody}>{t("lightning.paidBody")}</Text>
                                {outcome.lnSecret && (
                                    <View style={styles.proofBox}>
                                        <View style={styles.proofHead}>
                                            <Ionicons name="key-outline" size={15} color={palette.success} />
                                            <Text style={styles.proofLabel}>{t("lightning.proofTitle")}</Text>
                                        </View>
                                        <Text style={styles.proofHint}>{t("lightning.proofHint")}</Text>
                                        <Text style={styles.proofValue} selectable>{outcome.lnSecret}</Text>
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={t("lightning.proofCopyA11y")}
                                            onPress={() => void onCopyPreimage(outcome.lnSecret)}
                                            style={({ pressed }) => [styles.proofCopyBtn, pressed && styles.proofCopyBtnPressed]}
                                        >
                                            <Ionicons name="copy-outline" size={15} color={BRAND_PURPLE} />
                                            <Text style={styles.proofCopyBtnText}>{t("lightning.proofCopyButton")}</Text>
                                        </Pressable>
                                    </View>
                                )}
                                </>
                            )}
                            {outcome.status === "refunded" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="arrow-undo-circle-outline" size={22} color={palette.warn} />
                                    <Text style={styles.resultTitle} maxFontSizeMultiplier={1.4}>{t("lightning.refundedTitle")}</Text>
                                </View>
                                <Text style={styles.resultBody}>{t("lightning.refundedBody")}</Text>
                                </>
                            )}
                            {outcome.status === "refund_failed" && (
                                <>
                                <View style={styles.resultRow}>
                                    <Ionicons name="alert-circle" size={22} color={palette.error} />
                                    <Text style={styles.resultTitle} maxFontSizeMultiplier={1.4}>{t("lightning.refundFailedTitle")}</Text>
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
                    </>
                    )}
                </ScrollView>
            </View>
            <LightningGuideScreen visible={guideOpen} onClose={() => setGuideOpen(false)} />
            <QRScanModal visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={onScanned} />
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
    cbbtcChainHint: { fontSize: 12, color: t.textMuted, lineHeight: 17, marginBottom: 2 },
    destLabelRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    scanButton: {
        flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
        paddingVertical: 4, paddingHorizontal: 8,
        borderRadius: 999, borderWidth: 1, borderColor: BRAND_PURPLE + "55", backgroundColor: t.surfaceMuted,
    },
    scanButtonText: { fontSize: 12, fontWeight: "700" as const, color: t.text },
    modeToggle: {
        flexDirection: "row" as const, gap: 6, padding: 4,
        borderRadius: 12, backgroundColor: t.surfaceMuted,
    },
    modeTab: {
        flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
        gap: 6, paddingVertical: 10, borderRadius: 9,
    },
    modeTabActive: { backgroundColor: t.primary },
    modeTabText: { fontSize: 14, fontWeight: "700" as const, color: t.textMuted },
    modeTabTextActive: { color: t.textInverse },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    rowLabel: { fontSize: 13, color: t.textMuted },
    rowValue: { flex: 1, fontSize: 13, fontWeight: "600", color: t.text, textAlign: "right" },
    resultRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    resultTitle: { fontSize: 16, fontWeight: "700", color: t.text },
    resultBody: { fontSize: 13, lineHeight: 19, color: t.textMuted },
    proofBox: { marginTop: 2, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceMuted, gap: 6 },
    proofHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    proofLabel: { fontSize: 13, fontWeight: "700", color: t.text },
    proofHint: { fontSize: 11, lineHeight: 16, color: t.textMuted },
    proofValue: { fontSize: 11, fontFamily: "monospace", color: t.text, lineHeight: 16 },
    proofCopyBtn: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        marginTop: 4,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BRAND_PURPLE + "55",
        backgroundColor: t.surface,
    },
    proofCopyBtnPressed: { opacity: 0.6, backgroundColor: t.surfaceMuted },
    proofCopyBtnText: { fontSize: 13, fontWeight: "700", color: BRAND_PURPLE },
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
