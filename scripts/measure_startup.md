# 콜드 스타트 시간 측정

본 문서는 Solana cbBTC release APK의 cold start 측정 방법을 정리합니다.
ProGuard / 자산 최적화 / SplashOverlay 설정의 효과를 정량적으로 추적할 수 있습니다.

---

## 1. 측정 항목

| 항목                    | 의미                                   | 도구                        |
| ----------------------- | -------------------------------------- | --------------------------- |
| **Total cold start**    | 사용자 탭 → 첫 인터랙티브 화면         | `adb shell am start -W`     |
| **App init time**       | OS process start → JS bundle 평가 시작 | logcat `ReactNativeJS` 필터 |
| **JS bundle eval**      | bundle 로드 → React mount              | console.time 수동           |
| **First contentful**    | React mount → SplashOverlay 표시       | console.time 수동           |
| **Time to interactive** | SplashOverlay fade out → AppShell 렌더 | console.time 수동           |

---

## 2. adb로 cold start 자동 측정 (가장 간단)

폰을 `adb devices`에서 보이는 상태로 두고:

```bash
# 1) 앱이 완전히 종료된 상태로 만들기 (force-stop)
adb shell am force-stop com.seekerbtcfi.app

# 2) 시간 측정 + 시작 (반복해서 평균 5~10회)
for i in {1..5}; do
    adb shell am force-stop com.seekerbtcfi.app
    sleep 1
    adb shell am start -W -n com.seekerbtcfi.app/.MainActivity 2>&1 | grep -E "TotalTime|WaitTime"
done
```

출력 예시:

```
TotalTime: 1234        # OS 관점의 전체 시작 시간 (ms)
WaitTime: 1290         # ActivityManager 응답 대기 시간
```

- **TotalTime**: 가장 자주 참조하는 지표. 1초 미만이 이상적, 2초까지 acceptable.
- **WaitTime**: TotalTime + IPC 오버헤드.

---

## 3. logcat으로 JS init 측정

```bash
adb logcat -c                # 기존 로그 클리어
adb logcat *:S ReactNativeJS:V > startup.log &
adb shell am start -n com.seekerbtcfi.app/.MainActivity
sleep 5
kill %1
cat startup.log | grep -E "Running|render|mount"
```

JS 코드에서 명시적 마커를 찍어두면 더 정확:

```typescript
// App.tsx 모듈 최상위 (preventAutoHideAsync 직후)
console.log("[ts]", Date.now(), "module-eval-start");

// AppShell 첫 render
console.log("[ts]", Date.now(), "appshell-first-render");
```

logcat에서 두 타임스탬프 차이로 JS init 시간 계산.

---

## 4. 디바이스 별 비교 (대표 시나리오)

| 측정 회차 | 조건                           | TotalTime 목표 |
| --------- | ------------------------------ | -------------- |
| Baseline  | ProGuard off, 원본 자산 (10MB) | (현재)         |
| After D.1 | 자산 최적화만 (5MB)            | -10~15%        |
| After D.2 | + ProGuard on                  | -20~30%        |
| After all | + cold cache cleared           | 안정 후 -30%+  |

---

## 5. 측정 결과 기록 위치

새 측정 결과는 `plan.md`의 M5 노트 또는 `STORE/notes/startup-perf.md`에 추가.

각 측정은:

- 날짜
- 디바이스 (Seeker)
- versionCode
- 측정 명령
- 5회 평균 TotalTime
- 환경 변수 (gradle.properties 같은)
