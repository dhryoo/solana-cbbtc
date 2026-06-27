import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

interface InfoDotProps
{
    expanded: boolean;
    onPress: () => void;
    accessibilityLabel: string;
}

// 라벨 옆에 붙는 작은 ⓘ 토글. 펼침 상태는 부모(예: Row)가 소유하고
// 설명 캡션도 부모가 행 아래에 렌더한다 — 여기선 토글 버튼만 책임진다.
export function InfoDot({ expanded, onPress, accessibilityLabel }: InfoDotProps): React.JSX.Element
{
    const { palette } = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded }}
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => [{ marginLeft: 5, padding: 1 }, pressed ? { opacity: 0.5 } : null]}
        >
            <Ionicons
                name={expanded ? "information-circle" : "information-circle-outline"}
                size={15}
                color={palette.textMuted}
            />
        </Pressable>
    );
}
