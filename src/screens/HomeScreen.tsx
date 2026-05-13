import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/hooks/useWallet";

export function HomeScreen(): React.JSX.Element
{
    const { account } = useWallet();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>seeker-btcfi</Text>
                <Text style={styles.subtitle}>Solana Seeker · cbBTC</Text>
            </View>

            <View style={styles.body}>
                {account ? (
                    <View style={styles.accountBlock}>
                        <Text style={styles.label}>연결된 지갑</Text>
                        <Text style={styles.fullAddress} selectable>
                            {account.publicKey.toBase58()}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.placeholder}>
                        지갑을 연결하면 잔액과 swap을 사용할 수 있습니다.
                    </Text>
                )}
            </View>

            <View style={styles.footer}>
                <WalletButton />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 48,
    },
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111",
    },
    subtitle: {
        marginTop: 4,
        fontSize: 14,
        color: "#888",
    },
    body: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    accountBlock: {
        alignItems: "center",
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: "#999",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    fullAddress: {
        fontFamily: "Courier",
        fontSize: 13,
        color: "#222",
        textAlign: "center",
        maxWidth: 320,
    },
    placeholder: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    footer: {
        alignItems: "center",
        marginTop: 16,
    },
});
