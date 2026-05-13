import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useWallet } from "@/hooks/useWallet";
import { shortenAddress } from "@/utils/format";

export function WalletButton(): React.JSX.Element
{
    const { status, account, error, connect, disconnect } = useWallet();

    const isBusy = status === "connecting" || status === "disconnecting" || status === "restoring";

    if (status === "restoring")
    {
        return (
            <View style={styles.row}>
                <ActivityIndicator />
                <Text style={styles.muted}>지갑 상태 확인 중…</Text>
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
                    accessibilityLabel="지갑 연결 해제"
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
                        {status === "disconnecting" ? "해제 중…" : "연결 해제"}
                    </Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="지갑 연결"
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
                    {status === "connecting" ? "연결 중…" : "지갑 연결"}
                </Text>
            </Pressable>
            {status === "error" && error && (
                <Text style={styles.error}>{error.message}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    address: {
        fontSize: 16,
        fontFamily: "Courier",
        color: "#222",
    },
    muted: {
        color: "#666",
        fontSize: 14,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        minWidth: 180,
        alignItems: "center",
    },
    buttonPrimary: {
        backgroundColor: "#111",
    },
    buttonSecondary: {
        backgroundColor: "#eee",
        borderWidth: 1,
        borderColor: "#ccc",
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonPrimaryText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    buttonSecondaryText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
    },
    error: {
        color: "#c33",
        fontSize: 13,
        textAlign: "center",
        maxWidth: 280,
    },
});
