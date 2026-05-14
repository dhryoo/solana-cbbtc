import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

// 앱이 background → active로 돌아올 때 잔액 쿼리를 invalidate해 신선한 데이터로 갱신.
// 견적은 변동성이 커서 자동 refetch가 사용자 의도와 다를 수 있으므로 제외.
export function useAppFocusRefresh(): void
{
    const queryClient = useQueryClient();
    const prevState = useRef<AppStateStatus>(AppState.currentState);

    useEffect(() =>
    {
        const sub = AppState.addEventListener("change", (next) =>
        {
            const wasInactive = prevState.current === "background" || prevState.current === "inactive";
            if (wasInactive && next === "active")
            {
                void queryClient.invalidateQueries({ queryKey: ["balance"] });
            }
            prevState.current = next;
        });
        return () =>
        {
            sub.remove();
        };
    }, [queryClient]);
}
