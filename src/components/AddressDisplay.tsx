import * as Clipboard from "expo-clipboard";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useToast } from "@/providers/ToastProvider";
import { hapticLight } from "@/services/HapticsService";
/* eslint-disable react-native/no-unused-styles */

interface AddressDisplayProps
{
    address: string;
    style?: "full" | "short";
    onCopied?: () => void;
}

// long-press → 클립보드 복사. 짧은 toast 형태로 "Copied!" 라벨이 잠깐 보임.
// expo-clipboard는 보안 친화적 — UI가 응답하기 전 OS clipboard만 변경.
export function AddressDisplay({
    address,
    style = "full",
    onCopied,
}: AddressDisplayProps): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { showToast } = useToast();

    const onLongPress = useCallback(async (): Promise<void> =>
    {
        try
        {
            await Clipboard.setStringAsync(address);
            void hapticLight();
            showToast(t("common.copied"), { variant: "success" });
            onCopied?.();
        }
        catch
        {
            // clipboard 권한 거부 등 — 조용히 무시
        }
    }, [address, onCopied, showToast, t]);

    const text = style === "short" ? shortenForDisplay(address) : address;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.copyAddress")}
            accessibilityHint={t("common.copyAddressHint")}
            onLongPress={() => { void onLongPress(); }}
            delayLongPress={400}
        >
            <Text style={[styles.address, style === "short" && styles.shortAddress]} selectable>
                {text}
            </Text>
        </Pressable>
    );
}

function shortenForDisplay(addr: string): string
{
    if (addr.length <= 12)
    {
        return addr;
    }
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

const makeStyles = (t: ThemePalette) => ({
    address: {
        fontFamily: "Courier",
        fontSize: 13,
        color: t.text,
        textAlign: "center" as const,
        maxWidth: 320,
    },
    shortAddress: {
        fontSize: 14,
    },
});
