import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Keyboard,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { BorrowConsentModal } from "@/components/BorrowConsentModal";
import { TxProgress } from "@/components/TxProgress";
import { LendingGuideScreen } from "@/screens/LendingGuideScreen";
import { MIN_CBBTC_SUPPLY_BASE } from "@/constants/lending";
import { CBBTC, USDC } from "@/constants/tokens";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useKaminoMarket } from "@/hooks/useKaminoMarket";
import { useKaminoPosition } from "@/hooks/useKaminoPosition";
import { useBorrowLending } from "@/hooks/useBorrowLending";
import { useRepayLending } from "@/hooks/useRepayLending";
import { useSupplyLending } from "@/hooks/useSupplyLending";
import { useWithdrawLending } from "@/hooks/useWithdrawLending";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useToast } from "@/providers/ToastProvider";
import { loadBorrowConsent, saveBorrowConsent } from "@/utils/borrowConsent";
import { isAuthFailure, isInsufficientFunds, isOracleStaleError, isUserRejection, isWalletTimeout } from "@/utils/lendingErrors";
import { baseToDecimalString, formatTokenAmount, parseTokenAmount } from "@/utils/format";
import type { RiskZone } from "@/utils/lendingMath";
import type { ProgressState, TxStep } from "@/utils/txProgress";

function formatPct(x: number): string
{
    const pct = x * 100;
    if (pct > 0 && pct < 0.01)
    {
        return "<0.01%";
    }
    return `${pct.toFixed(2)}%`;
}

function formatUsd(x: number): string
{
    return `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EarnScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const queryClient = useQueryClient();
    const [refreshing, setRefreshing] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [mode, setMode] = useState<LendingMode>("supply");
    const [guideOpen, setGuideOpen] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // 키보드 높이만큼 하단 여백을 줘서 스크롤 여유 확보 (입력란을 키보드 위로 올릴 수 있게).
    useEffect(() =>
    {
        const show = Keyboard.addListener("keyboardDidShow", (e) =>
        {
            setKeyboardHeight(e.endCoordinates.height);
            // 여백이 적용된 다음 프레임에 입력란을 키보드 위로 스크롤.
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
        });
        const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
        return () =>
        {
            show.remove();
            hide.remove();
        };
    }, []);

    const owner = account?.publicKey ?? null;
    const market = useKaminoMarket();
    const position = useKaminoPosition(owner);

    const onRefresh = useCallback(async (): Promise<void> =>
    {
        setRefreshing(true);
        try
        {
            await queryClient.invalidateQueries({ queryKey: ["kamino"] });
        }
        finally
        {
            setRefreshing(false);
        }
    }, [queryClient]);

    return (
        <>
        <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scroll, { paddingBottom: 48 + keyboardHeight }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={(
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={BRAND_PURPLE}
                    colors={[BRAND_PURPLE]}
                    progressBackgroundColor={palette.surface}
                />
            )}
        >
            <View style={styles.header}>
                <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("earn.title")}</Text>
                <Text style={styles.subtitle}>{t("earn.subtitle")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("lendingGuide.title")}
                    onPress={() => setGuideOpen(true)}
                    style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.6 }]}
                >
                    <Ionicons name="help-circle-outline" size={26} color={palette.textMuted} />
                </Pressable>
            </View>

            {/* 마켓 정보 */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("earn.market.heading")}</Text>
                {market.isLoading
                    ? <ActivityIndicator color={palette.text} />
                    : market.isError
                        ? <Text style={styles.error}>{t("earn.loadError")}</Text>
                        : market.data
                            ? (
                                <View style={styles.rows}>
                                    <Row label={t("earn.market.supplyApy")} value={formatPct(market.data.cbbtcSupplyApr)} styles={styles} />
                                    <Row label={t("earn.market.borrowApr")} value={formatPct(market.data.usdcBorrowApr)} styles={styles} />
                                    <Row label={t("earn.market.utilization")} value={formatPct(market.data.cbbtcUtilization)} styles={styles} />
                                    <Row label={t("earn.market.price")} value={formatUsd(market.data.cbbtcPriceUsd)} styles={styles} />
                                </View>
                            )
                            : null}
            </View>

            {/* 내 포지션 */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("earn.position.heading")}</Text>
                {!owner
                    ? <Text style={styles.muted}>{t("earn.position.connectWallet")}</Text>
                    : position.isLoading
                        ? <ActivityIndicator color={palette.text} />
                        : position.isError
                            ? <Text style={styles.error}>{t("earn.loadError")}</Text>
                            : position.data && position.data.hasPosition
                                ? <PositionDetail data={position.data} styles={styles} palette={palette} t={t} />
                                : <Text style={styles.muted}>{t("earn.position.none")}</Text>}
            </View>

            {/* 공급/인출 (세그먼트 토글로 전환) */}
            {owner
                ? (
                    <>
                        <ActionToggle mode={mode} onChange={setMode} styles={styles} t={t} />
                        {(() =>
                        {
                            const onFocusInput = (): void => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120); };
                            const hasSupplied = (position.data?.suppliedUsd ?? 0) > 0;
                            const hasDebt = (position.data?.borrowedUsd ?? 0) > 0;
                            const empty = (msg: string): React.JSX.Element => (
                                <View style={styles.card}><Text style={styles.muted}>{msg}</Text></View>
                            );
                            if (mode === "supply")
                            {
                                return (
                                    <SupplyForm
                                        owner={owner}
                                        styles={styles}
                                        palette={palette}
                                        t={t}
                                        cbbtcPriceUsd={market.data?.cbbtcPriceUsd}
                                        currentSuppliedUsd={position.data?.suppliedUsd}
                                        onFocusInput={onFocusInput}
                                    />
                                );
                            }
                            if (mode === "withdraw")
                            {
                                return hasSupplied
                                    ? (
                                        <WithdrawForm
                                            suppliedUsd={position.data?.suppliedUsd ?? 0}
                                            cbbtcPriceUsd={market.data?.cbbtcPriceUsd}
                                            styles={styles}
                                            palette={palette}
                                            t={t}
                                            onFocusInput={onFocusInput}
                                        />
                                    )
                                    : empty(t("earn.withdraw.noPosition"));
                            }
                            if (mode === "borrow")
                            {
                                return hasSupplied
                                    ? <BorrowForm maxBorrowableUsd={position.data?.maxBorrowableUsd ?? 0} styles={styles} palette={palette} t={t} onFocusInput={onFocusInput} />
                                    : empty(t("earn.borrow.noCollateral"));
                            }
                            return hasDebt
                                ? (
                                    <RepayForm
                                        owner={owner}
                                        borrowedUsd={position.data?.borrowedUsd ?? 0}
                                        styles={styles}
                                        palette={palette}
                                        t={t}
                                        onFocusInput={onFocusInput}
                                    />
                                )
                                : empty(t("earn.repay.noDebt"));
                        })()}
                    </>
                )
                : null}

            <Text style={styles.disclaimer}>{t("earn.disclaimer")}</Text>
        </ScrollView>
        <LendingGuideScreen visible={guideOpen} onClose={() => setGuideOpen(false)} />
        </>
    );
}

type LendingMode = "supply" | "withdraw" | "borrow" | "repay";

interface ActionToggleProps
{
    mode: LendingMode;
    onChange: (m: LendingMode) => void;
    styles: ReturnType<typeof makeStyles>;
    t: ReturnType<typeof useTranslation>["t"];
}

function ActionToggle({ mode, onChange, styles, t }: ActionToggleProps): React.JSX.Element
{
    return (
        <View style={styles.toggle}>
            {(["supply", "withdraw", "borrow", "repay"] as const).map((m) => (
                <Pressable
                    key={m}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: mode === m }}
                    onPress={() => onChange(m)}
                    style={[styles.toggleItem, mode === m && styles.toggleItemActive]}
                >
                    <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                        {t(`earn.actions.${m}`)}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

interface SupplyFormProps
{
    owner: PublicKey;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
    cbbtcPriceUsd: number | undefined;
    currentSuppliedUsd: number | undefined;
    onFocusInput: () => void;
}

interface SupplyResultView
{
    amountBase: bigint;
    signature: string;
}

function SupplyForm({ owner, styles, palette, t, cbbtcPriceUsd, currentSuppliedUsd, onFocusInput }: SupplyFormProps): React.JSX.Element
{
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();
    const supply = useSupplyLending();
    const balance = useTokenBalance(CBBTC, owner);
    const [amount, setAmount] = useState("");
    const [lastError, setLastError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [result, setResult] = useState<SupplyResultView | null>(null);

    const availableBase = balance.data?.amount ?? 0n;
    const amountBase = parseTokenAmount(amount, CBBTC.decimals);
    const exceedsBalance = amountBase !== null && amountBase > availableBase;
    const belowMin = amountBase !== null && amountBase > 0n && amountBase < MIN_CBBTC_SUPPLY_BASE;
    const minLabel = baseToDecimalString(MIN_CBBTC_SUPPLY_BASE, CBBTC.decimals);
    const canSubmit = isOnline
        && !supply.isPending
        && amountBase !== null
        && amountBase >= MIN_CBBTC_SUPPLY_BASE
        && !exceedsBalance;

    const onSubmit = (): void =>
    {
        if (!canSubmit || amountBase === null)
        {
            return;
        }
        const submitted = amountBase;
        setLastError(null);
        setNotice(null);
        setResult(null);
        setProgress({ step: "preparing", state: "running" });
        supply.mutate(
            {
                amountBase,
                onStep: (step) => setProgress({ step, state: "running" }),
            },
            {
                onSuccess: (res) =>
                {
                    // stepper 는 감추고 결과 카드로 전환.
                    setProgress(null);
                    setResult({ amountBase: submitted, signature: res.signature });
                    setAmount("");
                },
                onError: (err) =>
                {
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    const cancelled = isUserRejection(err.message);
                    const noticeMsg = isOracleStaleError(err.message)
                        ? t("earn.oracleStaleHint")
                        : isInsufficientFunds(err.message) ? t("earn.insufficientHint")
                            : isAuthFailure(err.message) ? t("earn.authFailedHint")
                                : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    setNotice(noticeMsg);
                    setLastError(noticeMsg || cancelled ? null : err.message);
                    showToast(cancelled ? t("errors.userCancelled") : t("earn.supply.errorPrefix"), { variant: cancelled ? "info" : "error", durationMs: 5000 });
                },
            },
        );
    };

    const dismissResult = (): void =>
    {
        setResult(null);
        setProgress(null);
    };

    // 성공 후: 입력 폼/stepper 대신 결과 카드 표시.
    if (result)
    {
        const deltaUsd = cbbtcPriceUsd !== undefined
            ? (Number(result.amountBase) / 10 ** CBBTC.decimals) * cbbtcPriceUsd
            : null;
        const deltaText = `+${baseToDecimalString(result.amountBase, CBBTC.decimals)} cbBTC${deltaUsd !== null ? `  (≈ ${formatUsd(deltaUsd)})` : ""}`;
        return (
            <LendingResultCard
                title={t("earn.supply.completed")}
                deltaText={deltaText}
                subline={currentSuppliedUsd !== undefined ? `${t("earn.supply.newSupplied")} ${formatUsd(currentSuppliedUsd)}` : undefined}
                signature={result.signature}
                onDone={dismissResult}
                styles={styles}
                palette={palette}
                t={t}
            />
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.supplyHeaderRow}>
                <Text style={styles.cardTitle}>{t("earn.supply.heading")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="MAX"
                    onPress={() => setAmount(baseToDecimalString(availableBase, CBBTC.decimals))}
                    disabled={availableBase <= 0n || supply.isPending}
                    style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.6 }]}
                >
                    <Text style={styles.maxBtnText}>MAX</Text>
                </Pressable>
            </View>
            <Text style={styles.balanceLine}>
                {t("earn.supply.available", { amount: formatTokenAmount(balance.data?.uiAmount ?? 0, CBBTC.decimals) })}
                {"  ·  "}
                {t("earn.supply.minimum", { amount: minLabel })}
            </Text>
            <TextInput
                style={[styles.input, (exceedsBalance || belowMin) && styles.inputError]}
                value={amount}
                onChangeText={setAmount}
                onFocus={onFocusInput}
                keyboardType="decimal-pad"
                placeholder={t("earn.supply.placeholder")}
                placeholderTextColor={palette.textDim}
                editable={!supply.isPending}
                maxLength={20}
                accessibilityLabel={t("earn.supply.heading")}
            />
            {exceedsBalance
                ? <Text style={styles.exceedHint}>{t("earn.supply.exceeds")}</Text>
                : belowMin
                    ? <Text style={styles.exceedHint}>{t("earn.supply.belowMin", { amount: minLabel })}</Text>
                    : null}
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: supply.isPending }}
                disabled={!canSubmit}
                onPress={() => onSubmit()}
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
                {supply.isPending
                    ? <ActivityIndicator color={palette.textInverse} />
                    : <Text style={styles.buttonText}>{t("earn.supply.button")}</Text>}
            </Pressable>

            {progress ? <TxProgress current={progress.step} state={progress.state} /> : null}

            {notice
                ? (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
                        <Text style={styles.infoText}>{notice}</Text>
                    </View>
                )
                : lastError
                    ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>{t("earn.supply.errorPrefix")} · {t("earn.supply.copyHint")}</Text>
                            <Text style={styles.errorDetail} selectable>{lastError}</Text>
                        </View>
                    )
                    : null}
        </View>
    );
}

interface LendingResultCardProps
{
    title: string;       // 예: "공급 완료"
    deltaText: string;   // 예: "+0.00001 cbBTC  (≈ $0.77)"
    subline?: string;    // 부가 설명 (선택)
    signature: string;
    onDone: () => void;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
}

// 공용 결과 카드 (공급/인출/차입/상환). 완료 스텝퍼(flat) + 구분선 + 결과 + 세로 분리 액션.
function LendingResultCard(
    { title, deltaText, subline, signature, onDone, styles, palette, t }: LendingResultCardProps,
): React.JSX.Element
{
    return (
        <View style={styles.card}>
            <TxProgress current="done" state="success" flat />
            <View style={styles.resultDivider} />
            <View style={styles.successHead}>
                <Ionicons name="checkmark-circle" size={24} color={palette.success} />
                <Text style={styles.successTitle}>{title}</Text>
            </View>
            <Text style={styles.successDelta}>{deltaText}</Text>
            {subline ? <Text style={styles.resultSubline}>{subline}</Text> : null}

            <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(`https://solscan.io/tx/${signature}`)}
                style={({ pressed }) => [styles.explorerBtn, pressed && { opacity: 0.6 }]}
            >
                <Ionicons name="open-outline" size={16} color={palette.primary} />
                <Text style={styles.explorerBtnText}>{t("earn.supply.viewExplorer")}</Text>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                onPress={onDone}
                style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            >
                <Text style={styles.buttonText}>{t("earn.supply.confirm")}</Text>
            </Pressable>
        </View>
    );
}

interface WithdrawFormProps
{
    suppliedUsd: number;
    cbbtcPriceUsd: number | undefined;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
    onFocusInput: () => void;
}

function WithdrawForm({ suppliedUsd, cbbtcPriceUsd, styles, palette, t, onFocusInput }: WithdrawFormProps): React.JSX.Element
{
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();
    const withdraw = useWithdrawLending();
    const [amount, setAmount] = useState("");
    const [withdrawAll, setWithdrawAll] = useState(false);
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [result, setResult] = useState<SupplyResultView | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const suppliedCbbtc = cbbtcPriceUsd && cbbtcPriceUsd > 0 ? suppliedUsd / cbbtcPriceUsd : 0;
    const suppliedBase = BigInt(Math.round(suppliedCbbtc * 10 ** CBBTC.decimals));
    const amountBase = parseTokenAmount(amount, CBBTC.decimals);
    const exceeds = !withdrawAll && amountBase !== null && amountBase > suppliedBase;
    const canSubmit = isOnline
        && !withdraw.isPending
        && (withdrawAll || (amountBase !== null && amountBase > 0n && !exceeds));

    const onMax = (): void =>
    {
        setWithdrawAll(true);
        setAmount(baseToDecimalString(suppliedBase, CBBTC.decimals));
    };

    const onSubmit = (allowOracleStale = false): void =>
    {
        if (!canSubmit)
        {
            return;
        }
        const submitted = withdrawAll ? suppliedBase : (amountBase ?? 0n);
        setLastError(null);
        setNotice(null);
        setResult(null);
        setProgress({ step: "preparing", state: "running" });
        withdraw.mutate(
            {
                liquidityBase: amountBase ?? 0n,
                withdrawAll,
                allowOracleStale,
                onStep: (step) => setProgress({ step, state: "running" }),
            },
            {
                onSuccess: (res) =>
                {
                    setProgress(null);
                    setResult({ amountBase: submitted, signature: res.signature });
                    setAmount("");
                    setWithdrawAll(false);
                },
                onError: (err) =>
                {
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    const cancelled = isUserRejection(err.message);
                    const noticeMsg = isOracleStaleError(err.message)
                        ? t("earn.oracleStaleHint")
                        : isInsufficientFunds(err.message) ? t("earn.insufficientHint")
                            : isAuthFailure(err.message) ? t("earn.authFailedHint")
                                : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    setNotice(noticeMsg);
                    setLastError(noticeMsg || cancelled ? null : err.message);
                    showToast(cancelled ? t("errors.userCancelled") : t("earn.withdraw.errorPrefix"), { variant: cancelled ? "info" : "error", durationMs: 5000 });
                },
            },
        );
    };

    if (result)
    {
        const deltaUsd = cbbtcPriceUsd !== undefined
            ? (Number(result.amountBase) / 10 ** CBBTC.decimals) * cbbtcPriceUsd
            : null;
        const deltaText = `-${baseToDecimalString(result.amountBase, CBBTC.decimals)} cbBTC${deltaUsd !== null ? `  (≈ ${formatUsd(deltaUsd)})` : ""}`;
        return (
            <LendingResultCard
                title={t("earn.withdraw.completed")}
                deltaText={deltaText}
                signature={result.signature}
                onDone={() => { setResult(null); setProgress(null); }}
                styles={styles}
                palette={palette}
                t={t}
            />
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.supplyHeaderRow}>
                <Text style={styles.cardTitle}>{t("earn.withdraw.heading")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="MAX"
                    onPress={onMax}
                    disabled={suppliedBase <= 0n || withdraw.isPending}
                    style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.6 }]}
                >
                    <Text style={styles.maxBtnText}>MAX</Text>
                </Pressable>
            </View>
            <Text style={styles.balanceLine}>
                {t("earn.withdraw.supplied", { amount: formatTokenAmount(suppliedCbbtc, CBBTC.decimals) })}
            </Text>
            <TextInput
                style={[styles.input, exceeds && styles.inputError]}
                value={amount}
                onChangeText={(v) => { setWithdrawAll(false); setAmount(v); }}
                onFocus={onFocusInput}
                keyboardType="decimal-pad"
                placeholder={t("earn.withdraw.placeholder")}
                placeholderTextColor={palette.textDim}
                editable={!withdraw.isPending}
                maxLength={20}
                accessibilityLabel={t("earn.withdraw.heading")}
            />
            {exceeds
                ? <Text style={styles.exceedHint}>{t("earn.supply.exceeds")}</Text>
                : null}
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: withdraw.isPending }}
                disabled={!canSubmit}
                onPress={() => onSubmit()}
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
                {withdraw.isPending
                    ? <ActivityIndicator color={palette.textInverse} />
                    : <Text style={styles.buttonText}>{t("earn.withdraw.button")}</Text>}
            </Pressable>

            {progress ? <TxProgress current={progress.step} state={progress.state} /> : null}

            {notice
                ? (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
                        <Text style={styles.infoText}>{notice}</Text>
                    </View>
                )
                : lastError
                    ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>{t("earn.withdraw.errorPrefix")} · {t("earn.supply.copyHint")}</Text>
                            <Text style={styles.errorDetail} selectable>{lastError}</Text>
                        </View>
                    )
                    : null}

        </View>
    );
}

interface BorrowFormProps
{
    maxBorrowableUsd: number;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
    onFocusInput: () => void;
}

function BorrowForm({ maxBorrowableUsd, styles, palette, t, onFocusInput }: BorrowFormProps): React.JSX.Element
{
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();
    const borrow = useBorrowLending();
    const [amount, setAmount] = useState("");
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [result, setResult] = useState<SupplyResultView | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [consentOpen, setConsentOpen] = useState(false);

    useEffect(() =>
    {
        void loadBorrowConsent().then(setConsentGiven).catch(() => undefined);
    }, []);

    // 차입 가능 최대치(USDC ≈ allowedBorrowValue 잔여). base 로 환산해 초과 검증.
    const maxBorrowableBase = BigInt(Math.floor(maxBorrowableUsd * 10 ** USDC.decimals));
    // 안전 MAX = 한도의 80%. 끝까지(=100%, health~1.0) 차입 시 즉시 청산 위험이라 여유를 둠.
    const safeMaxBase = (maxBorrowableBase * 80n) / 100n;
    const amountBase = parseTokenAmount(amount, USDC.decimals);
    const exceedsMax = amountBase !== null && amountBase > maxBorrowableBase;
    const canSubmit = isOnline && !borrow.isPending && amountBase !== null && amountBase > 0n && !exceedsMax;

    const runBorrow = (allowOracleStale = false): void =>
    {
        if (amountBase === null)
        {
            return;
        }
        const submitted = amountBase;
        setLastError(null);
        setNotice(null);
        setResult(null);
        setProgress({ step: "preparing", state: "running" });
        borrow.mutate(
            {
                usdcAmountBase: amountBase,
                allowOracleStale,
                onStep: (step) => setProgress({ step, state: "running" }),
            },
            {
                onSuccess: (res) =>
                {
                    setProgress(null);
                    setResult({ amountBase: submitted, signature: res.signature });
                    setAmount("");
                },
                onError: (err) =>
                {
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    const cancelled = isUserRejection(err.message);
                    // 오라클 지연·SOL 부족은 안내 박스로, 취소는 raw 숨김. 그 외만 raw 표시.
                    const noticeMsg = isOracleStaleError(err.message)
                        ? t("earn.oracleStaleHint")
                        : isInsufficientFunds(err.message) ? t("earn.insufficientHint")
                            : isAuthFailure(err.message) ? t("earn.authFailedHint")
                                : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    setNotice(noticeMsg);
                    setLastError(noticeMsg || cancelled ? null : err.message);
                    showToast(cancelled ? t("errors.userCancelled") : t("earn.borrow.errorPrefix"), { variant: cancelled ? "info" : "error", durationMs: 5000 });
                },
            },
        );
    };

    const onSubmit = (): void =>
    {
        if (!canSubmit)
        {
            return;
        }
        if (consentGiven)
        {
            runBorrow();
        }
        else
        {
            setConsentOpen(true);
        }
    };

    const onConsentConfirm = (): void =>
    {
        setConsentOpen(false);
        void saveBorrowConsent();
        setConsentGiven(true);
        runBorrow();
    };

    if (result)
    {
        return (
            <LendingResultCard
                title={t("earn.borrow.completed")}
                deltaText={`+${baseToDecimalString(result.amountBase, USDC.decimals)} USDC`}
                subline={t("earn.borrow.checkHealth")}
                signature={result.signature}
                onDone={() => { setResult(null); setProgress(null); }}
                styles={styles}
                palette={palette}
                t={t}
            />
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.supplyHeaderRow}>
                <Text style={styles.cardTitle}>{t("earn.borrow.heading")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("earn.borrow.safeMax")}
                    onPress={() => setAmount(baseToDecimalString(safeMaxBase, USDC.decimals))}
                    disabled={safeMaxBase <= 0n || borrow.isPending}
                    style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.6 }]}
                >
                    <Text style={styles.maxBtnText}>{t("earn.borrow.safeMax")}</Text>
                </Pressable>
            </View>
            <Text style={styles.balanceLine}>
                {t("earn.borrow.maxBorrowable", { amount: maxBorrowableUsd.toLocaleString("en-US", { maximumFractionDigits: 6 }) })}
            </Text>
            <Text style={styles.balanceLine}>{t("earn.borrow.hint")}</Text>
            <TextInput
                style={[styles.input, exceedsMax && styles.inputError]}
                value={amount}
                onChangeText={setAmount}
                onFocus={onFocusInput}
                keyboardType="decimal-pad"
                placeholder={t("earn.borrow.placeholder")}
                placeholderTextColor={palette.textDim}
                editable={!borrow.isPending}
                maxLength={20}
                accessibilityLabel={t("earn.borrow.heading")}
            />
            {exceedsMax
                ? <Text style={styles.exceedHint}>{t("earn.borrow.exceedsMax")}</Text>
                : null}
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: borrow.isPending }}
                disabled={!canSubmit}
                onPress={() => onSubmit()}
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
                {borrow.isPending
                    ? <ActivityIndicator color={palette.textInverse} />
                    : <Text style={styles.buttonText}>{t("earn.borrow.button")}</Text>}
            </Pressable>

            {progress ? <TxProgress current={progress.step} state={progress.state} /> : null}

            {notice
                ? (
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
                        <Text style={styles.infoText}>{notice}</Text>
                    </View>
                )
                : lastError
                    ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>{t("earn.borrow.errorPrefix")} · {t("earn.supply.copyHint")}</Text>
                            <Text style={styles.errorDetail} selectable>{lastError}</Text>
                        </View>
                    )
                    : null}

            <BorrowConsentModal visible={consentOpen} onConfirm={onConsentConfirm} onCancel={() => setConsentOpen(false)} />
        </View>
    );
}

interface RepayFormProps
{
    owner: PublicKey | null;
    borrowedUsd: number;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
    onFocusInput: () => void;
}

function RepayForm({ owner, borrowedUsd, styles, palette, t, onFocusInput }: RepayFormProps): React.JSX.Element
{
    const { isOnline } = useNetworkStatus();
    const { showToast } = useToast();
    const repay = useRepayLending();
    const walletUsdc = useTokenBalance(USDC, owner);
    const [amount, setAmount] = useState("");
    const [repayAll, setRepayAll] = useState(false);
    const [progress, setProgress] = useState<{ step: TxStep; state: ProgressState } | null>(null);
    const [result, setResult] = useState<SupplyResultView | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // USDC ≈ $1 이므로 borrowedUsd 를 USDC 부채로 근사.
    const debtBase = BigInt(Math.ceil(borrowedUsd * 10 ** USDC.decimals));
    const amountBase = parseTokenAmount(amount, USDC.decimals);
    const exceeds = !repayAll && amountBase !== null && amountBase > debtBase;
    const canSubmit = isOnline
        && !repay.isPending
        && (repayAll || (amountBase !== null && amountBase > 0n && !exceeds));

    const onMax = (): void =>
    {
        setRepayAll(true);
        setAmount(baseToDecimalString(debtBase, USDC.decimals));
    };

    const onSubmit = (allowOracleStale = false): void =>
    {
        if (!canSubmit)
        {
            return;
        }
        const submitted = repayAll ? debtBase : (amountBase ?? 0n);
        setLastError(null);
        setNotice(null);
        setResult(null);
        setProgress({ step: "preparing", state: "running" });
        repay.mutate(
            {
                usdcAmountBase: amountBase ?? 0n,
                repayAll,
                allowOracleStale,
                onStep: (step) => setProgress({ step, state: "running" }),
            },
            {
                onSuccess: (res) =>
                {
                    setProgress(null);
                    setResult({ amountBase: submitted, signature: res.signature });
                    setAmount("");
                    setRepayAll(false);
                },
                onError: (err) =>
                {
                    setProgress((prev) => (prev ? { ...prev, state: "error" } : null));
                    // 오라클 지연·SOL 부족 → 안내 박스(notice). 취소 → raw 숨김. dust(6092) → 안내+raw. 그 외 raw.
                    const cancelled = isUserRejection(err.message);
                    const noticeMsg = isOracleStaleError(err.message)
                        ? t("earn.oracleStaleHint")
                        : isInsufficientFunds(err.message) ? t("earn.insufficientHint")
                            : isAuthFailure(err.message) ? t("earn.authFailedHint")
                                : isWalletTimeout(err.message) ? t("earn.walletTimeoutHint") : null;
                    setNotice(noticeMsg);
                    const isDust = /6092|remaining too small/i.test(err.message);
                    setLastError(noticeMsg || cancelled ? null : (isDust ? `${t("earn.repay.dustHint")}\n\n${err.message}` : err.message));
                    showToast(cancelled ? t("errors.userCancelled") : t("earn.repay.errorPrefix"), { variant: cancelled ? "info" : "error", durationMs: 5000 });
                },
            },
        );
    };

    if (result)
    {
        return (
            <LendingResultCard
                title={t("earn.repay.completed")}
                deltaText={`-${baseToDecimalString(result.amountBase, USDC.decimals)} USDC`}
                signature={result.signature}
                onDone={() => { setResult(null); setProgress(null); }}
                styles={styles}
                palette={palette}
                t={t}
            />
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.supplyHeaderRow}>
                <Text style={styles.cardTitle}>{t("earn.repay.heading")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="MAX"
                    onPress={onMax}
                    disabled={debtBase <= 0n || repay.isPending}
                    style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.6 }]}
                >
                    <Text style={styles.maxBtnText}>MAX</Text>
                </Pressable>
            </View>
            <Text style={styles.balanceLine}>
                {t("earn.repay.debt", { amount: borrowedUsd.toLocaleString("en-US", { maximumFractionDigits: 6 }) })}
            </Text>
            <Text style={styles.balanceLine}>
                {t("earn.repay.walletBalance", {
                    amount: formatTokenAmount(walletUsdc.data?.uiAmount ?? 0, USDC.decimals),
                })}
            </Text>
            <TextInput
                style={[styles.input, exceeds && styles.inputError]}
                value={amount}
                onChangeText={(v) => { setRepayAll(false); setAmount(v); }}
                onFocus={onFocusInput}
                keyboardType="decimal-pad"
                placeholder={t("earn.repay.placeholder")}
                placeholderTextColor={palette.textDim}
                editable={!repay.isPending}
                maxLength={20}
                accessibilityLabel={t("earn.repay.heading")}
            />
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit, busy: repay.isPending }}
                disabled={!canSubmit}
                onPress={() => onSubmit()}
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
                {repay.isPending
                    ? <ActivityIndicator color={palette.textInverse} />
                    : <Text style={styles.buttonText}>{t("earn.repay.button")}</Text>}
            </Pressable>

            {progress ? <TxProgress current={progress.step} state={progress.state} /> : null}

            {lastError
                ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTitle}>{t("earn.repay.errorPrefix")} · {t("earn.supply.copyHint")}</Text>
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

        </View>
    );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }): React.JSX.Element
{
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

interface PositionDetailProps
{
    data: NonNullable<ReturnType<typeof useKaminoPosition>["data"]>;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    t: ReturnType<typeof useTranslation>["t"];
}

function PositionDetail({ data, styles, palette, t }: PositionDetailProps): React.JSX.Element
{
    const zoneColor = riskColor(data.riskZone, palette);
    return (
        <View style={styles.rows}>
            <Row label={t("earn.position.supplied")} value={formatUsd(data.suppliedUsd)} styles={styles} />
            <Row label={t("earn.position.borrowed")} value={formatUsd(data.borrowedUsd)} styles={styles} />
            <Row label={t("earn.position.net")} value={formatUsd(data.netValueUsd)} styles={styles} />
            <View style={styles.row}>
                <Text style={styles.rowLabel}>{t("earn.position.health")}</Text>
                <Text style={[styles.rowValue, { color: zoneColor }]}>
                    {data.healthFactor === null ? "—" : data.healthFactor.toFixed(2)}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.rowLabel}>{t("earn.position.liqPrice")}</Text>
                <Text style={[styles.rowValue, { color: zoneColor }]}>
                    {data.cbbtcLiquidationPriceUsd === null ? "—" : formatUsd(data.cbbtcLiquidationPriceUsd)}
                </Text>
            </View>
        </View>
    );
}

function riskColor(zone: RiskZone, palette: ThemePalette): string
{
    switch (zone)
    {
        case "safe":
            return palette.success;
        case "caution":
        case "danger":
            return palette.warn;
        default:
            return palette.textMuted;
    }
}

const makeStyles = (t: ThemePalette) => ({
    scroll: {
        flexGrow: 1,
        backgroundColor: t.background,
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 48,
    },
    header: {
        alignItems: "center" as const,
        marginBottom: 24,
    },
    helpBtn: {
        position: "absolute" as const,
        right: 0,
        top: 0,
        padding: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: "700" as const,
        color: t.text,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        color: t.textMuted,
        textAlign: "center" as const,
    },
    card: {
        backgroundColor: t.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        padding: 18,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: "700" as const,
        color: t.textMuted,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
        marginBottom: 12,
    },
    rows: {
        gap: 10,
    },
    row: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
    },
    rowLabel: {
        fontSize: 14,
        color: t.textMuted,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: t.text,
    },
    toggle: {
        flexDirection: "row" as const,
        backgroundColor: t.surfaceMuted,
        borderRadius: 12,
        padding: 4,
        marginBottom: 10,
        gap: 4,
    },
    toggleItem: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 9,
        alignItems: "center" as const,
    },
    toggleItemActive: {
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: t.textMuted,
    },
    toggleTextActive: {
        color: t.text,
        fontWeight: "700" as const,
    },
    supplyHeaderRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
    },
    maxBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: t.borderStrong,
    },
    maxBtnText: {
        fontSize: 12,
        fontWeight: "700" as const,
        color: t.text,
    },
    balanceLine: {
        fontSize: 12,
        color: t.textMuted,
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: t.text,
        backgroundColor: t.surfaceMuted,
        marginBottom: 12,
    },
    inputError: {
        borderColor: t.warn,
    },
    exceedHint: {
        fontSize: 12,
        color: t.warn,
        marginTop: -6,
        marginBottom: 10,
    },
    button: {
        backgroundColor: t.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonText: {
        color: t.textInverse,
        fontSize: 15,
        fontWeight: "700" as const,
    },
    successHead: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        marginBottom: 10,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: "800" as const,
        color: t.text,
    },
    successDelta: {
        fontSize: 22,
        fontWeight: "800" as const,
        color: t.success,
        marginBottom: 4,
    },
    resultDivider: {
        height: 1,
        backgroundColor: t.border,
        marginVertical: 14,
    },
    resultSubline: {
        fontSize: 13,
        color: t.textMuted,
        marginBottom: 4,
    },
    explorerBtn: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        marginTop: 16,
        marginBottom: 8,
    },
    explorerBtnText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: t.primary,
    },
    muted: {
        fontSize: 14,
        color: t.textDim,
    },
    error: {
        fontSize: 14,
        color: t.warn,
    },
    errorBox: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: t.warn,
        backgroundColor: t.surfaceMuted,
    },
    infoBox: {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        gap: 8,
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surfaceMuted,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
        color: t.textMuted,
    },
    errorTitle: {
        fontSize: 11,
        fontWeight: "700" as const,
        color: t.warn,
        marginBottom: 6,
    },
    errorDetail: {
        fontSize: 11,
        color: t.text,
        fontFamily: "monospace" as const,
    },
    disclaimer: {
        marginTop: 8,
        fontSize: 11,
        color: t.textDim,
        textAlign: "center" as const,
        lineHeight: 16,
    },
});
