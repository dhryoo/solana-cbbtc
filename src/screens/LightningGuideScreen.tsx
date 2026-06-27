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

interface LightningGuideScreenProps
{
    visible: boolean;
    onClose: () => void;
}

// Lightning 결제 흐름 인포그래픽 (AI 생성, prompt: assets/infographics/PROMPT-lightning-pay.md).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const INFOGRAPHIC_LIGHTNING: ImageSourcePropType | undefined = require("../../assets/lightning-pay.png");

const GITHUB_URL = "https://github.com/dhryoo/solana-cbbtc";
const ATOMIQ_URL = "https://atomiq.exchange";

export function LightningGuideScreen({ visible, onClose }: LightningGuideScreenProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle} maxFontSizeMultiplier={1.4}>{t("lightningGuide.title")}</Text>
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
                    <Section icon="flash-outline" title={t("lightningGuide.intro.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.intro.body")}</Body>
                    </Section>

                    <Section icon="swap-horizontal-outline" title={t("lightningGuide.how.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.how.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.how.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.how.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.how.b3")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.how.b4")}</Bullet>
                        <Infographic source={INFOGRAPHIC_LIGHTNING} caption={t("lightningGuide.infographic")} styles={styles} palette={palette} />
                    </Section>

                    <Section icon="arrow-down-circle-outline" title={t("lightningGuide.receive.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.receive.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.receive.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.receive.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.receive.b3")}</Bullet>
                    </Section>

                    <Section icon="logo-bitcoin" title={t("lightningGuide.cbbtc.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.cbbtc.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.cbbtc.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.cbbtc.b2")}</Bullet>
                    </Section>

                    <Section icon="qr-code-outline" title={t("lightningGuide.qr.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.qr.body")}</Body>
                    </Section>

                    <Section icon="shield-checkmark-outline" title={t("lightningGuide.refund.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.refund.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.refund.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.refund.b2")}</Bullet>
                    </Section>

                    <Section icon="cash-outline" title={t("lightningGuide.fees.title")} styles={styles} palette={palette}>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.fees.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.fees.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.fees.b3")}</Bullet>
                    </Section>

                    <Section icon="flask-outline" title={t("lightningGuide.experimental.title")} styles={styles} palette={palette}>
                        <Body styles={styles}>{t("lightningGuide.experimental.body")}</Body>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.experimental.b1")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.experimental.b2")}</Bullet>
                        <Bullet styles={styles} palette={palette}>{t("lightningGuide.experimental.b3")}</Bullet>
                    </Section>

                    <View style={styles.links}>
                        <LinkRow icon="logo-github" label={t("lightningGuide.links.github")} onPress={() => void Linking.openURL(GITHUB_URL)} styles={styles} palette={palette} />
                        <LinkRow icon="open-outline" label={t("lightningGuide.links.atomiq")} onPress={() => void Linking.openURL(ATOMIQ_URL)} styles={styles} palette={palette} />
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
                <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.4}>{title}</Text>
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
    body: { fontSize: 14, lineHeight: 21, color: t.textMuted, marginBottom: 8 },
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
        paddingHorizontal: 16,
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
