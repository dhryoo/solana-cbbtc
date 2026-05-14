import { useMemo } from "react";
import { StyleSheet } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useTheme } from "@/providers/ThemeProvider";

// 사용 패턴:
//   const styles = useThemedStyles((t) => ({ card: { backgroundColor: t.surface, ... }, ... }));
//
// palette가 바뀔 때만 StyleSheet.create를 다시 호출 (memoized).
// 반환 타입은 StyleSheet.create의 결과이므로 일반 StyleSheet과 호환.

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
    factory: (palette: ThemePalette) => T,
): T
{
    const { palette } = useTheme();
    return useMemo(() => StyleSheet.create(factory(palette)), [factory, palette]);
}
