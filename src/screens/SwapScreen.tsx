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
import type { ThemePalette } from "@/constants/theme";
import { CBBTC, MIN_SOL_GAS_RESERVE_SOL, SOL, type TokenInfo } from "@/constants/tokens";
import { useSwap } from "@/hooks/useSwap";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/hooks/useWallet";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
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
    const [inputToken, setInputToken] = useState<TokenInfo>(SOL);
    const [outputToken, setOutputToken] = useState<TokenInfo>(CBBTC);
    const [amount, setAmount] = useState("");
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
    const { isOnline } = useNetworkStatus();
    // 가스비용 SOL 잔액 검증. 가스 reserve는 ATA 생성/priority fee를 합산한 보수적 floor.
    const solBalance = useTokenBalance(SOL, account?.publicKey ?? null);

    // 재진입 가드 (React state 업데이트는 비동기라 같은 frame에 두 번 onPress 가능).
    const inFlightRef = useRef(false);

    const onFlip = useCallback((): void =>
    {
        setInputToken(outputToken);
        setOutputToken(inputToken);
        setAmount("");
    }, [inputToken, outputToken]);

    const insufficientGas = useMemo((): boolean =>
    {
        if (!solBalance.data) return false; // 잔액 로딩 전엔 막지 않음
        const solUi = solBalance.data.uiAmount;
        const amountNum = Number(amount);
        if (inputToken.isNative)
        {
            // SOL 입력: 입력량 + 가스 reserve 가 잔액 이하여야 함.
            if (!Number.isFinite(amountNum)) return false;
            return amountNum + MIN_SOL_GAS_RESERVE_SOL > solUi;
        }
        return solUi < MIN_SOL_GAS_RESERVE_SOL;
    }, [solBalance.data, amount, inputToken.isNative]);

    const canSwap = useMemo(() =>
    {
        if (!isOnline) return false;
        if (!account) return false;
        if (!quoteQuery.data) return false;
        if (amount.trim() === "") return false;
        if (swap.isPending) return false;
        if (insufficientGas) return false;
        return true;
    }, [isOnline, account, quoteQuery.data, amount, swap.isPending, insufficientGas]);

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
        setModalStatus({ kind: "pending" });
        swap.mutate(
            { quote: quoteQuery.data, inputToken, outputToken },
            {
                onSuccess: (data) =>
                {
                    inFlightRef.current = false;
                    setModalStatus({ kind: "success", signature: data.signature });
                },
                onError: (err) =>
                {
                    inFlightRef.current = false;
                    const friendly = toFriendlySwapError(err);
                    setModalStatus({
                        kind: "error",
                        message: t(friendly.key, friendly.params ?? {}),
                    });
                },
            },
        );
    }, [quoteQuery.data, swap, t, inputToken, outputToken]);

    useEffect(() =>
    {
        if (!account && modalOpen && !swap.isPending)
        {
            setModalOpen(false);
            setModalStatus({ kind: "idle" });
        }
    }, [account, modalOpen, swap.isPending]);

    return (
        <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.title")}</Text>

            <View style={styles.inputCard}>
                <View style={styles.headerRow}>
                    <Text style={styles.tokenSymbol}>{inputToken.symbol}</Text>
                    <Text style={styles.tokenName}>{inputToken.name}</Text>
                </View>
                <TextInput
                    style={styles.amountInput}
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
                <View style={styles.headerRow}>
                    <Text style={styles.tokenSymbol}>{outputToken.symbol}</Text>
                    <Text style={styles.tokenName}>{outputToken.name}</Text>
                </View>
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
            />
        </ScrollView>
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
    title: {
        fontSize: 24,
        fontWeight: "700" as const,
        color: t.text,
        marginBottom: 8,
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
    tokenSymbol: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: t.text,
    },
    tokenName: {
        fontSize: 12,
        color: t.textMuted,
    },
    amountInput: {
        fontSize: 28,
        fontWeight: "600" as const,
        color: t.text,
        paddingVertical: 4,
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
