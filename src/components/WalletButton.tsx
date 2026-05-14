import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useWallet } from "@/hooks/useWallet";
import { shortenAddress } from "@/utils/format";

export function WalletButton(): React.JSX.Element
{
    const { t } = useTranslation();
    const { status, account, error, connect, disconnect } = useWallet();
    const styles = useThemedStyles(makeStyles);

    const isBusy = status === "connecting" || status === "disconnecting" || status === "restoring";

    if (status === "restoring")
    {
        return (
            <View style={styles.row}>
                <ActivityIndicator />
                <Text style={styles.muted}>{t("wallet.restoring")}</Text>
            </View>
        );
    }

    if (account)
    {
        return (
            <View style={styles.container}>
                <Text style={styles.address}>{shortenAddress(account.publicKey)}</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("wallet.disconnect")}
                    onPress={() => { void disconnect(); }}
                    disabled={isBusy}
                    style={({ pressed }) =>
                        [
                            styles.button,
                            styles.buttonSecondary,
                            pressed && styles.buttonPressed,
                            isBusy && styles.buttonDisabled,
                        ]}
                >
                    <Text style={styles.buttonSecondaryText}>
                        {status === "disconnecting" ? t("wallet.disconnecting") : t("wallet.disconnect")}
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("wallet.connect")}
                onPress={() => { void connect(); }}
                disabled={isBusy}
                style={({ pressed }) =>
                    [
                        styles.button,
                        styles.buttonPrimary,
                        pressed && styles.buttonPressed,
                        isBusy && styles.buttonDisabled,
                    ]}
            >
                <Text style={styles.buttonPrimaryText}>
                    {status === "connecting" ? t("wallet.connecting") : t("wallet.connect")}
                </Text>
            </Pressable>
            {status === "error" && error && (
                <Text style={styles.error}>{error.message}</Text>
            )}
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    container: {
        alignItems: "center" as const,
        gap: 12,
    },
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
    },
    address: {
        fontSize: 16,
        fontFamily: "Courier",
        color: t.text,
    },
    muted: {
        color: t.textMuted,
        fontSize: 14,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        minWidth: 180,
        alignItems: "center" as const,
    },
    buttonPrimary: {
        backgroundColor: t.primary,
    },
    buttonSecondary: {
        backgroundColor: t.surfaceMuted,
        borderWidth: 1,
        borderColor: t.borderStrong,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonPrimaryText: {
        color: t.textInverse,
        fontSize: 16,
        fontWeight: "600" as const,
    },
    buttonSecondaryText: {
        color: t.text,
        fontSize: 14,
        fontWeight: "500" as const,
    },
    error: {
        color: t.error,
        fontSize: 13,
        textAlign: "center" as const,
        maxWidth: 280,
    },
});
