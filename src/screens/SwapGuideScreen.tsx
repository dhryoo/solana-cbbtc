/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
    type ImageSourcePropType,
} from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";

interface SwapGuideScreenProps
{
    visible: boolean;
    onClose: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const INFOGRAPHIC_SWAP_ROUTE: ImageSourcePropType | undefined = require("../../assets/swap-route.png");

const GITHUB_URL = "https://github.com/dhryoo/solana-cbbtc";
const JUPITER_URL = "https://jup.ag";

export function SwapGuideScreen({ visible, onClose }: SwapGuideScreenProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t("swapGuide.title")}</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        onPress={onClose}
                        style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
                    >
                        <Ionicons name="close" size={22} color={palette.text} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.scroll}>
                    <Section icon="information-circle-outline" title={t("swapGuide.intro.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("swapGuide.intro.body")}</Body>
                    </Section>

                    <Section icon="git-network-outline" title={t("swapGuide.how.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("swapGuide.how.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.how.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.how.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.how.b3")}</Bullet>
                        <Infographic source={INFOGRAPHIC_SWAP_ROUTE} caption={t("swapGuide.infographic")} styles={styles} palette={palette} />
                    </Section>

                    <Section icon="options-outline" title={t("swapGuide.slippage.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("swapGuide.slippage.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.slippage.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.slippage.b2")}</Bullet>
                    </Section>

                    <Section icon="shield-checkmark-outline" title={t("swapGuide.safe.title")} styles={styles} palette={palette}>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.safe.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.safe.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.safe.b3")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("swapGuide.safe.b4")}</Bullet>
                    </Section>

                    <View style={styles.links}>
                        <LinkRow icon="logo-github" label={t("swapGuide.links.github")} onPress={() => void Linking.openURL(GITHUB_URL)} styles={styles} palette={palette} />
                        <LinkRow icon="open-outline" label={t("swapGuide.links.jupiter")} onPress={() => void Linking.openURL(JUPITER_URL)} styles={styles} palette={palette} />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

interface SectionProps
{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
    children: React.ReactNode;
}

function Section({ icon, title, styles, palette, children }: SectionProps): React.JSX.Element
{
    return (
        <View style={styles.section}>
            <View style={styles.sectionHead}>
                <Ionicons name={icon} size={20} color={palette.primary} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function Body({ styles, children }: { styles: ReturnType<typeof makeStyles>; children: React.ReactNode }): React.JSX.Element
{
    return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ styles, palette, children }: { styles: ReturnType<typeof makeStyles>; palette: ThemePalette; children: React.ReactNode }): React.JSX.Element
{
    return (
        <View style={styles.bulletRow}>
            <Ionicons name="checkmark" size={16} color={palette.success} style={styles.bulletIcon} />
            <Text style={styles.bulletText}>{children}</Text>
        </View>
    );
}

interface InfographicProps
{
    source: ImageSourcePropType | undefined;
    caption: string;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
}

function Infographic({ source, caption, styles, palette }: InfographicProps): React.JSX.Element
{
    return (
        <View style={styles.infographic}>
            {source
                ? <Image source={source} style={styles.infographicImg} resizeMode="contain" accessibilityLabel={caption} />
                : (
                    <View style={styles.infographicPlaceholder}>
                        <Ionicons name="image-outline" size={28} color={palette.textDim} />
                        <Text style={styles.infographicCaption}>{caption}</Text>
                    </View>
                )}
        </View>
    );
}

function LinkRow({ icon, label, onPress, styles, palette }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; styles: ReturnType<typeof makeStyles>; palette: ThemePalette }): React.JSX.Element
{
    return (
        <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
            <Ionicons name={icon} size={18} color={palette.primary} />
            <Text style={styles.linkText}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textDim} />
        </Pressable>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: t.text },
    closeButton: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceMuted,
    },
    closePressed: { opacity: 0.7 },
    scroll: { paddingHorizontal: 20, paddingVertical: 24 },
    section: { marginBottom: 26 },
    sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: t.text },
    body: { fontSize: 14, lineHeight: 21, color: t.textMuted },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
    bulletIcon: { marginTop: 3 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: t.textMuted },
    infographic: { marginTop: 14 },
    infographicImg: { width: "100%", height: 210, borderRadius: 12 },
    infographicPlaceholder: {
        height: 160,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        borderStyle: "dashed",
        backgroundColor: t.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    infographicCaption: { fontSize: 12, color: t.textDim, textAlign: "center", paddingHorizontal: 16 },
    links: { gap: 4, marginTop: 4 },
    linkRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 12, paddingHorizontal: 4,
        borderTopWidth: 1, borderTopColor: t.border,
    },
    linkText: { flex: 1, fontSize: 14, fontWeight: "600", color: t.text },
});
