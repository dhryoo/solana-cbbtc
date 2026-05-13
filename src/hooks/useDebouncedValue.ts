import { useEffect, useState } from "react";

// 빠르게 바뀌는 값을 일정 시간 안정될 때까지 기다린 뒤 반환.
// 사용 예: 입력 필드에서 typing 멈춘 후 300ms 뒤에만 API 호출.
export function useDebouncedValue<T>(value: T, delayMs: number): T
{
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() =>
    {
        const id = setTimeout(() =>
        {
            setDebounced(value);
        }, delayMs);
        return () =>
        {
            clearTimeout(id);
        };
    }, [value, delayMs]);

    return debounced;
}
