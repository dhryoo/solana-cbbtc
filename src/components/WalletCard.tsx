import { Ionicons } from "@expo/vector-icons";
import type { PublicKey } from "@solana/web3.js";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Text, View } from "react-native";

import { AddressDisplay } from "@/components/AddressDisplay";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

interface WalletCardProps
{
    publicKey: PublicKey;
}

// 연결된 지갑 정보 카드: 라벨 + 풀 pubkey (long-press 복사 가능) + Solscan 링크 버튼.
// AddressDisplay를 그대로 활용해 카드 형태로 감쌈.
export function WalletCard({ publicKey }: WalletCardProps): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const address = publicKey.toBase58();

    const openSolscan = useCallback((): void =>
    {
        void Linking.openURL(`https://solscan.io/account/${address}`).catch(() => undefined);
    }, [address]);

    return (
        <View style={styles.card}>
            <Text style={styles.label}>{t("wallet_card.connectedTitle")}</Text>
            <AddressDisplay address={address} style="full" />
            <Pressable
                accessibilityRole="link"
                accessibilityLabel={t("wallet_card.viewOnSolscan")}
                onPress={openSolscan}
                style={({ pressed }) =>
                    [styles.solscanButton, pressed && styles.pressed]}
            >
                <Ionicons name="open-outline" size={14} style={styles.solscanIcon} />
                <Text style={styles.solscanText}>{t("wallet_card.viewOnSolscan")}</Text>
            </Pressable>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    card: {
        alignItems: "center" as const,
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
    },
    label: {
        fontSize: 11,
        color: t.textMuted,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
    },
    solscanButton: {
        marginTop: 4,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
    },
    pressed: {
        opacity: 0.7,
    },
    solscanIcon: {
        color: t.text,
    },
    solscanText: {
        fontSize: 12,
        color: t.text,
        fontWeight: "600" as const,
    },
});
