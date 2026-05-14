import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

// 700ms 동안 풀스크린 splash 이미지를 표시한 뒤 fade out.
// Expo의 native splash는 작은 로고 + bgColor로만 표시되므로, AI가 만든 풀스크린 디자인을
// 보존하려면 native splash가 hide된 직후 React 단에서 같은 영역을 덮어야 함.
const HOLD_MS = 700;
const FADE_MS = 220;

// 정적 require — Metro가 번들 시점에 처리.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_LIGHT = require("../../assets/splash.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_DARK = require("../../assets/splash-dark.png");

export function SplashOverlay(): React.JSX.Element | null
{
    const { palette } = useTheme();
    const [visible, setVisible] = useState(true);
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() =>
    {
        // React가 mount되자마자 native splash를 hide — overlay가 이미 그 위를 가리고 있으므로
        // 사용자는 끊김 없이 우리 풀스크린 이미지를 봄.
        SplashScreen.hideAsync().catch(() => undefined);

        const id = setTimeout(() =>
        {
            Animated.timing(opacity, {
                toValue: 0,
                duration: FADE_MS,
                useNativeDriver: true,
            }).start(({ finished }) =>
            {
                if (finished)
                {
                    setVisible(false);
                }
            });
        }, HOLD_MS);

        return () =>
        {
            clearTimeout(id);
        };
    }, [opacity]);

    if (!visible)
    {
        return null;
    }

    const source = palette.mode === "dark" ? SPLASH_DARK : SPLASH_LIGHT;
    const bg = palette.mode === "dark" ? "#0E0E10" : "#9945FF";

    return (
        <Animated.View
            pointerEvents="none"
            style={[styles.fill, { opacity, backgroundColor: bg }]}
        >
            <Image source={source} style={styles.image} resizeMode="cover" />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    fill: {
        ...StyleSheet.absoluteFillObject,
        // splash overlay는 모든 화면 위 — Modal 같은 일반 컨텐츠가 999 미만이라 충분
        zIndex: 999,
        elevation: 999,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
});
