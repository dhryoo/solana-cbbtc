import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { QuoteDisplay } from "@/components/QuoteDisplay";
import { SwapConfirmModal } from "@/components/SwapConfirmModal";
import { TokenPickerModal } from "@/components/TokenPickerModal";
import { LightningScreen } from "@/screens/LightningScreen";
import { SwapGuideScreen } from "@/screens/SwapGuideScreen";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useLabs } from "@/providers/LabsProvider";
import { deriveSwapPair, MIN_SOL_GAS_RESERVE_SOL, OUTPUT_ATA_RENT_SOL, SOL, SWAP_COUNTER_TOKENS, type TokenInfo } from "@/constants/tokens";
import { useCancellableSign } from "@/hooks/useCancellableSign";
import { useSwap } from "@/hooks/useSwap";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { baseToDecimalString, formatTokenAmount, parseTokenAmount } from "@/utils/format";
import { toFriendlySwapError } from "@/utils/swapError";

const DEFAULT_SLIPPAGE_BPS = 50;
const AMOUNT_MAX_LENGTH = 24;

type ModalStatus =
    | { kind: "idle" }
    | { kind: "pending" }
    | { kind: "success"; signature: string }
    | { kind: "error"; message: string };

export function SwapScreen(): React.JSX.Element
{
    const { t } = useTranslation();
    const { account } = useWallet();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    // cbBTC 를 고정축으로 두고 반대편 카운터 토큰(SOL/SKR/USDC)만 선택 (A 방식).
    // 방향(cbBTC 매수/매도)은 cbbtcIsOutput 으로 표현하고, input/output 은 거기서 파생.
    const [counterToken, setCounterToken] = useState<TokenInfo>(SOL);
    const [cbbtcIsOutput, setCbbtcIsOutput] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);
    const { input: inputToken, output: outputToken } = deriveSwapPair(counterToken, cbbtcIsOutput);
    const [amount, setAmount] = useState("");
    const [guideOpen, setGuideOpen] = useState(false);
    const { lightningEnabled } = useLabs();
    const [lightningOpen, setLightningOpen] = useState(false);
    const [slippageBps, setSlippageBps] = useState<number>(DEFAULT_SLIPPAGE_BPS);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalStatus, setModalStatus] = useState<ModalStatus>({ kind: "idle" });

    const quoteQuery = useSwapQuote({
        input: inputToken,
        output: outputToken,
        uiAmount: amount,
        slippageBps,
    });
    const swap = useSwap();
    const sign = useCancellableSign();
    const { isOnline } = useNetworkStatus();
    // 가스비용 SOL 잔액 검증. 가스 reserve는 ATA 생성/priority fee를 합산한 보수적 floor.
    const solBalance = useTokenBalance(SOL, account?.publicKey ?? null);
    // 입력 토큰 잔액 (보유량/MAX 표시용). SOL 입력이면 solBalance 와 동일 쿼리(캐시 공유).
    const inputBalance = useTokenBalance(inputToken, account?.publicKey ?? null);
    // 출력 토큰 잔액 — ATA 존재 여부 추정용. 잔액 0(보통 ATA 미생성)이면 swap 이 ATA rent 를 더 쓴다.
    const outputBalance = useTokenBalance(outputToken, account?.publicKey ?? null);

    // 출력 토큰 ATA 가 없을 가능성(비-native + 잔액 0)이면 가스 reserve 에 ATA rent 를 더한다.
    // → "사전검사는 통과했는데 on-chain 에서 rent 부족으로 실패"(특히 USDC/SKR 로 cbBTC 매수)를 예방.
    const outputAtaLikelyMissing = !outputToken.isNative && (outputBalance.data?.amount ?? 0n) === 0n;
    const requiredGasReserveSol = MIN_SOL_GAS_RESERVE_SOL + (outputAtaLikelyMissing ? OUTPUT_ATA_RENT_SOL : 0);

    // 입력 가능액(base). SOL 입력이면 가스 reserve 를 남겨야 하므로 차감.
    const gasReserveBase = BigInt(Math.round(requiredGasReserveSol * 10 ** SOL.decimals));
    const availableBase = useMemo((): bigint =>
    {
        const bal = inputBalance.data?.amount ?? 0n;
        if (inputToken.isNative)
        {
            return bal > gasReserveBase ? bal - gasReserveBase : 0n;
        }
        return bal;
    }, [inputBalance.data, inputToken.isNative, gasReserveBase]);
    const availableUi = Number(availableBase) / 10 ** inputToken.decimals;
    const minLabel = baseToDecimalString(1n, inputToken.decimals);
    // 비-SOL 입력의 잔액 초과는 여기서 검증 (SOL 은 insufficientGas 가 담당).
    const amountBaseInput = parseTokenAmount(amount, inputToken.decimals);
    const exceedsInput = !inputToken.isNative
        && inputBalance.data !== undefined
        && amountBaseInput !== null
        && amountBaseInput > availableBase;

    // 재진입 가드 (React state 업데이트는 비동기라 같은 frame에 두 번 onPress 가능).
    const inFlightRef = useRef(false);

    const onFlip = useCallback((): void =>
    {
        setCbbtcIsOutput((v) => !v);
        setAmount("");
    }, []);

    // 카운터 토큰 변경 — 입력 토큰이 바뀌어 소수/잔액이 달라지므로 금액 초기화.
    const onSelectCounter = useCallback((tok: TokenInfo): void =>
    {
        setCounterToken(tok);
        setPickerOpen(false);
        setAmount("");
    }, []);

    const insufficientGas = useMemo((): boolean =>
    {
        if (!solBalance.data) return false; // 잔액 로딩 전엔 막지 않음
        const solUi = solBalance.data.uiAmount;
        const amountNum = Number(amount);
        if (inputToken.isNative)
        {
            // SOL 입력: 입력량 + 가스 reserve 가 잔액 이하여야 함.
            if (!Number.isFinite(amountNum)) return false;
            return amountNum + requiredGasReserveSol > solUi;
        }
        return solUi < requiredGasReserveSol;
    }, [solBalance.data, amount, inputToken.isNative, requiredGasReserveSol]);

    const canSwap = useMemo(() =>
    {
        if (!isOnline) return false;
        if (!account) return false;
        if (!quoteQuery.data) return false;
        if (amount.trim() === "") return false;
        if (swap.isPending) return false;
        if (insufficientGas) return false;
        if (exceedsInput) return false;
        return true;
    }, [isOnline, account, quoteQuery.data, amount, swap.isPending, insufficientGas, exceedsInput]);

    const openConfirm = useCallback((): void =>
    {
        if (!canSwap) return;
        setModalStatus({ kind: "idle" });
        setModalOpen(true);
    }, [canSwap]);

    const closeModal = useCallback((): void =>
    {
        if (swap.isPending) return;
        setModalOpen(false);
        if (modalStatus.kind === "success")
        {
            setAmount("");
        }
        setModalStatus({ kind: "idle" });
    }, [swap.isPending, modalStatus]);

    const confirmSwap = useCallback((): void =>
    {
        // 동일 frame 내 중복 호출 방지. setState로 stage 전환이 일어나기 전에
        // 두 번째 onPress가 들어와도 두 번 mutate 되지 않게 막는다.
        if (inFlightRef.current) return;
        if (!quoteQuery.data) return;
        inFlightRef.current = true;
        const token = sign.begin();
        setModalStatus({ kind: "pending" });
        swap.mutate(
            { quote: quoteQuery.data, inputToken, outputToken },
            {
                onSuccess: (data) =>
                {
                    if (!sign.isCurrent(token)) return;
                    inFlightRef.current = false;
                    setModalStatus({ kind: "success", signature: data.signature });
                },
                onError: (err) =>
                {
                    if (!sign.isCurrent(token)) return;
                    inFlightRef.current = false;
                    const friendly = toFriendlySwapError(err);
                    setModalStatus({
                        kind: "error",
                        message: t(friendly.key, friendly.params ?? {}),
                    });
                },
            },
        );
    }, [quoteQuery.data, swap, sign, t, inputToken, outputToken]);

    // 멈춘 서명 폐기 탈출구. closeModal 은 swap.isPending 동안 닫기를 막으므로(중복 제출 방지)
    // 여기서 isPending 가드를 우회해 강제로 닫는다. swap.reset() 으로 영구 pending 을 풀어
    // 제출 버튼 잠김을 해제하고, token 가드가 뒤늦은 settle 을 무시한다.
    const cancelSwap = useCallback((): void =>
    {
        sign.cancel();
        inFlightRef.current = false;
        swap.reset();
        setModalOpen(false);
        setModalStatus({ kind: "idle" });
    }, [sign, swap]);

    useEffect(() =>
    {
        if (!account && modalOpen && !swap.isPending)
        {
            setModalOpen(false);
            setModalStatus({ kind: "idle" });
        }
    }, [account, modalOpen, swap.isPending]);

    return (
        <>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.title")}</Text>
                <Text style={styles.subtitle}>{t("swap.subtitle")}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("swapGuide.title")}
                    onPress={() => setGuideOpen(true)}
                    style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.6 }]}
                >
                    <Ionicons name="help-circle-outline" size={26} color={palette.textMuted} />
                </Pressable>
                {lightningEnabled && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("lightning.title")}
                        onPress={() => setLightningOpen(true)}
                        style={({ pressed }) => [styles.lightningChip, pressed && { opacity: 0.7 }]}
                    >
                        <Ionicons name="flash" size={13} color={BRAND_PURPLE} />
                        <Text style={styles.lightningChipText}>{t("lightning.chipLabel")}</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.inputCard}>
                <SwapTokenHeader token={inputToken} selectable={cbbtcIsOutput} onPress={() => setPickerOpen(true)} />
                {account
                    ? (
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceText}>
                                {t("swap.available", { amount: formatTokenAmount(availableUi, inputToken.decimals), symbol: inputToken.symbol })}
                                {"  ·  "}
                                {t("swap.minimum", { amount: minLabel })}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t("common.max")}
                                onPress={() => setAmount(baseToDecimalString(availableBase, inputToken.decimals))}
                                disabled={availableBase <= 0n}
                                style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.6 }]}
                            >
                                <Text style={styles.maxBtnText}>{t("common.max")}</Text>
                            </Pressable>
                        </View>
                    )
                    : null}
                <TextInput
                    style={[styles.amountInput, exceedsInput && styles.amountInputError]}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor={palette.textDim}
                    value={amount}
                    onChangeText={setAmount}
                    autoCorrect={false}
                    maxLength={AMOUNT_MAX_LENGTH}
                    maxFontSizeMultiplier={1.4}
                    accessibilityLabel={t("swap.amountAccessibility")}
                />
                {exceedsInput
                    ? <Text style={styles.exceedHint}>{t("swap.exceeds")}</Text>
                    : null}
            </View>

            <View style={styles.flipRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("swap.flipAccessibility")}
                    onPress={onFlip}
                    style={({ pressed }) =>
                        [styles.flipButton, pressed && styles.flipPressed]}
                >
                    <Text style={styles.flipText}>↕</Text>
                </Pressable>
            </View>

            <View style={styles.outputCard}>
                <SwapTokenHeader token={outputToken} selectable={!cbbtcIsOutput} onPress={() => setPickerOpen(true)} />
                {/* 견적이 도착했으면 아래 QuoteDisplay가 수치를 표시하므로 힌트는 숨김 */}
                {!quoteQuery.data && (
                    <Text style={styles.placeholderHint}>{t("swap.outputHint")}</Text>
                )}
            </View>

            <QuoteDisplay
                outputToken={outputToken}
                quote={quoteQuery.data}
                isLoading={quoteQuery.isLoading}
                isFetching={quoteQuery.isFetching}
                error={quoteQuery.error}
                dataUpdatedAt={quoteQuery.dataUpdatedAt}
                onRetry={() => { void quoteQuery.refetch(); }}
                slippageBps={slippageBps}
                onSlippageChange={setSlippageBps}
                inputIsEmpty={amount.trim() === ""}
            />

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("swap.swapButton")}
                accessibilityState={{ disabled: !canSwap, busy: swap.isPending }}
                disabled={!canSwap}
                onPress={openConfirm}
                style={({ pressed }) =>
                    [
                        styles.swapButton,
                        canSwap ? styles.swapButtonEnabled : styles.swapButtonDisabled,
                        pressed && canSwap && styles.swapButtonPressed,
                    ]}
            >
                <Text
                    style={[
                        styles.swapButtonText,
                        canSwap && styles.swapButtonTextEnabled,
                    ]}
                >
                    {!isOnline
                        ? t("offline.swapBlocked")
                        : !account
                            ? t("swap.btnConnectFirst")
                            : amount.trim() === ""
                                ? t("swap.btnAmountFirst")
                                : !quoteQuery.data
                                    ? t("swap.btnQuoteLoading")
                                    : insufficientGas
                                        ? t("swap.btnInsufficientGas")
                                        : t("swap.swapButton")}
                </Text>
            </Pressable>

            <SwapConfirmModal
                visible={modalOpen}
                inputToken={inputToken}
                outputToken={outputToken}
                quote={quoteQuery.data}
                status={modalStatus}
                onConfirm={confirmSwap}
                onClose={closeModal}
                onCancelPending={cancelSwap}
            />

            <TokenPickerModal
                visible={pickerOpen}
                tokens={SWAP_COUNTER_TOKENS}
                selectedMint={counterToken.mint}
                onSelect={onSelectCounter}
                onClose={() => setPickerOpen(false)}
            />
        </ScrollView>
        <SwapGuideScreen visible={guideOpen} onClose={() => setGuideOpen(false)} />
        {lightningEnabled && (
            <LightningScreen visible={lightningOpen} onClose={() => setLightningOpen(false)} />
        )}
        </>
    );
}

// 토큰 행 헤더. 카운터 토큰 쪽(selectable)은 chevron + Pressable 로 선택기를 열고,
// cbBTC 쪽(고정축)은 일반 텍스트로 표시.
function SwapTokenHeader({ token, selectable, onPress }: {
    token: TokenInfo;
    selectable: boolean;
    onPress: () => void;
}): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    if (!selectable)
    {
        return (
            <View style={styles.headerRow}>
                <Text style={styles.tokenSymbol} maxFontSizeMultiplier={1.4}>{token.symbol}</Text>
                <Text style={styles.tokenName} maxFontSizeMultiplier={1.4}>{token.name}</Text>
            </View>
        );
    }
    return (
        <Pressable
            accessibilityRole="button"
            // 현재 선택된 토큰을 라벨에 포함 — 스크린리더가 "토큰 선택" 만 읽고 현재 값을 못 알리는 문제 방지
            accessibilityLabel={`${t("swap.selectToken")}, ${token.symbol}`}
            onPress={onPress}
            style={({ pressed }) => [styles.headerRowSelectable, pressed && { opacity: 0.6 }]}
        >
            <Text style={styles.tokenSymbol} maxFontSizeMultiplier={1.4}>{token.symbol}</Text>
            <Text style={styles.tokenName} maxFontSizeMultiplier={1.4}>{token.name}</Text>
            <Ionicons name="chevron-down" size={16} color={palette.textMuted} style={styles.tokenChevron} />
        </Pressable>
    );
}

const makeStyles = (t: ThemePalette) => ({
    scroll: {
        flexGrow: 1,
        backgroundColor: t.background,
        paddingHorizontal: 20,
        paddingTop: 72,
        paddingBottom: 48,
        gap: 12,
    },
    header: {
        alignItems: "center" as const,
        marginBottom: 20,
    },
    helpBtn: {
        position: "absolute" as const,
        right: 0,
        top: 0,
        padding: 4,
    },
    // Labs(실험) 토글 ON 일 때만 보이는 Lightning 진입 칩
    lightningChip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BRAND_PURPLE + "55",
        backgroundColor: t.surfaceMuted,
    },
    lightningChipText: {
        fontSize: 12,
        fontWeight: "700" as const,
        color: t.text,
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
    inputCard: {
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        backgroundColor: t.background,
    },
    outputCard: {
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        backgroundColor: t.surface,
    },
    headerRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        gap: 8,
    },
    // 카운터 토큰 선택 행 — 탭 가능함을 chevron 으로 알린다.
    headerRowSelectable: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        alignSelf: "flex-start" as const,
        gap: 8,
    },
    tokenChevron: {
        marginLeft: 2,
    },
    tokenSymbol: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: t.text,
    },
    tokenName: {
        fontSize: 12,
        color: t.textMuted,
    },
    balanceRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
    },
    balanceText: {
        flex: 1,
        fontSize: 12,
        color: t.textMuted,
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
    amountInput: {
        fontSize: 28,
        fontWeight: "600" as const,
        color: t.text,
        paddingVertical: 4,
    },
    amountInputError: {
        color: t.warn,
    },
    exceedHint: {
        fontSize: 12,
        color: t.warn,
    },
    placeholderHint: {
        fontSize: 12,
        color: t.textDim,
    },
    flipRow: {
        alignItems: "center" as const,
    },
    flipButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: t.primary,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    flipPressed: {
        opacity: 0.7,
    },
    flipText: {
        color: t.textInverse,
        fontSize: 18,
        fontWeight: "700" as const,
    },
    swapButton: {
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: "center" as const,
    },
    swapButtonEnabled: {
        backgroundColor: t.primary,
    },
    swapButtonDisabled: {
        backgroundColor: t.disabled,
    },
    swapButtonPressed: {
        opacity: 0.85,
    },
    swapButtonText: {
        color: t.textMuted,
        fontSize: 15,
        fontWeight: "600" as const,
    },
    swapButtonTextEnabled: {
        color: t.textInverse,
    },
});
