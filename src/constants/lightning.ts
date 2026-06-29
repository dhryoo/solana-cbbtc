// 라이트닝 실험 기능의 거래당 소액 상한 (sats).
// WHY: 전용 탭으로 승격하면서 "experimental / small amounts only" 라벨을 코드로 강제해
//      주장과 실제를 일치시킨다(법률 검토: prominent 한 기능의 'small amounts' 주장은 enforce 해야
//      UDAP/표시광고 갭이 닫힘). 송금(resolveDestination)·받기(LightningReceivePanel) 양쪽에 적용.
//      값 변경 시 카피(lightningGuide.experimental.b1, lightning.maxSatsHint, errAmountTooLargeExperimental)도 함께 갱신.
export const LN_EXPERIMENTAL_MAX_SATS = 100_000n;
