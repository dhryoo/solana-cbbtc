// 앱 내 "About this app" 화면에 표시되는 long-form 설명.
// dApp Store 메타데이터(STORE/metadata/description.{ko,en}.md)의 long_description 본문과
// 의도적으로 동일한 콘텐츠 — 사용자가 스토어에서 본 내용을 앱에서도 동일하게 확인 가능.
// 변경 시 양쪽 모두 업데이트 필요.

export const ABOUT_KO = `# Solana cbBTC

Solana Seeker 사용자를 위한 BTCfi 모바일 앱입니다.

cbBTC는 Coinbase가 발행한 비트코인 1:1 페그 토큰으로, Solana 메인넷에서 시총 $340M+ 규모의 가장 안정적인 wrapped Bitcoin입니다. 본 앱은 cbBTC를 Solana 모바일 환경에서 안전하게 다룰 수 있는 가장 간결한 경로를 제공합니다.

## 🔑 핵심 기능

- **Mobile Wallet Adapter** — Seeker의 Seed Vault와 직접 연동, hardware 수준의 키 보안
- **실시간 잔액 표시** — cbBTC, SOL, SKR을 한 화면에서. 아래로 당겨 즉시 새로고침
- **Jupiter Swap 통합** — Solana 최대 aggregator의 최적 라우트로 SOL ↔ cbBTC 거래
- **슬리피지 제어** — 0.1% / 0.5% / 1% 중 선택, 시장 상황에 맞게 조정
- **Versioned transaction** — Jupiter v6의 최신 트랜잭션 포맷 완전 호환
- **Swap 완료 알림** — 백그라운드에서도 결과 확인, Solscan 링크로 즉시 확인

## 💰 cbBTC 렌딩 (Earn) — Phase 2

- **공급 / 인출** — cbBTC를 Kamino의 audited 스마트컨트랙트에 공급하고 언제든 전액·일부 회수
- **담보 대출** — cbBTC를 담보로 USDC 차입, 상환하면 담보 회수 (첫 차입 시 위험 동의)
- **위험 표시** — health(건전성)·청산가를 항상 표시, 안전/주의/위험 색상으로 강조
- **비수탁(self-custody)** — 앱은 자금·키를 보관하지 않음. 모든 거래는 Seed Vault로 직접 서명
- **진행 상황 시각화** — 준비 → 검증 → 서명 → 전송 → 완료 단계 표시 + Solana Explorer 확인
- **안내 화면** — 작동 방식·투명성·위험을 인포그래픽으로 쉽게 설명

## ⚡ Bitcoin Lightning (실험적) — 전용 탭

하단 **Bitcoin Lightning 탭**의 실험 기능입니다 (소액 권장):

- **LN 인보이스 결제** — Bitcoin 의 결제망(Lightning Network) 인보이스를 USDC·SOL 로 바로 지불
- **Atomic swap (HTLC)** — Atomiq 의 감사받은 escrow 컨트랙트 사용. 서명은 전부 Solana 쪽에서만 (Seed Vault)
- **실패해도 안전** — LN 지급이 안 되면 자금은 환불. LP 는 지급 증명 없이 자금을 가져갈 수 없음
- **앱 수수료 0** — LP 수수료(~0.5%)만 견적에 표시
- lightning address (user@domain) 지원 — 금액(sats)만 입력하면 됨

실험 기능 특성상 소액 사용을 권장합니다.

## 🛡️ 보안 우선

- 개인키는 Seeker **Seed Vault 하드웨어를 떠나지 않습니다**
- 모든 트랜잭션은 사용자가 직접 승인
- **백엔드 서버 없음** — Solana RPC와 Jupiter API에만 직접 호출
- 분석 도구·트래커 없음
- **앱 잠금** (지문/PIN) 옵션으로 추가 보호 가능

## 🎯 Seeker 사용자 우대

- **Seeker Genesis Token** 보유자에게 "Seeker Verified" 인증 배지 표시
- Seed Vault 사용 시 "🔒 Hardware secured" 표시
- Verified 사용자에게 더 낮은 기본 슬리피지(0.3%) 자동 적용
- Solana Mobile 생태계 정체성 부여

## ✨ 사용자 경험

- 한국어 / English / Tiếng Việt / 简体中文 다국어 지원, 즉시 전환
- 라이트 / 다크 모드 자동 추적 또는 수동 선택
- 부드러운 splash + fade 전환으로 빠른 첫인상
- 최소한의 권한만 요청 (인터넷, 알림)

## 📱 지원 토큰

- **cbBTC** (Coinbase Wrapped BTC)
- **SOL** (Solana 네이티브 토큰)
- **USDC** (렌딩 차입 자산)
- **SKR** (Solana Mobile 보상 토큰)

향후 추가 BTC 페그 토큰으로 확장 예정.

## 🔮 로드맵

- ✅ **Phase 1**: cbBTC ↔ SOL swap (Jupiter) — **완료**
- ✅ **Phase 2**: cbBTC 기반 lending (Kamino) — 공급·인출·차입·상환 **완료**
- **Phase 2.5**: 멀티 프로토콜 비교 (marginfi/Solend 추가) — Kamino 와 금리 비교
- ⚡ **Phase 3**: Bitcoin Lightning 결제 — **전용 탭으로 출시** (실험적). USDC·SOL·cbBTC 로 LN 인보이스 결제·수신, Atomiq atomic swap(HTLC), 서명은 Solana 쪽만
- **Phase 4**: 다양한 wrapped BTC 비교/통합 swap (cbBTC · tBTC · BTC.b 등)

## 📊 기술 스택

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 오픈소스

본 앱은 **MIT 라이선스**로 공개됩니다. 모든 보안·트랜잭션 로직을 직접 검증할 수 있습니다.

---

## 🔧 문제 해결

### 앱이 "인증 중..." 에서 멈춰 있어요
0.1.0 초기 버전에 알려진 잠금 해제 버그입니다. **0.1.1 이상 버전에서는 수정**되었습니다. 현재 stuck 상태라면:

1. Android 설정 → 앱 → **Solana cbBTC** → 저장공간 → **데이터 지우기**
2. 앱을 다시 열어 지갑 재연결
3. (선택) 설정에서 앱 잠금 다시 켜기 — 새 버전은 해당 race를 우회합니다

### 지갑이 연결되지 않아요
- MWA 호환 지갑이 설치되어 있는지 확인 (Phantom, Solflare, Backpack, Seeker Seed Vault)
- 인터넷 연결 확인 — 상단에 오프라인 배너가 떠 있지 않은지
- 지갑 앱을 한 번 열어 잠금 해제한 후 재시도

### 잔액이 표시되지 않거나 견적이 안 와요
- 상단에 "인터넷 연결 없음" 배너가 있다면 네트워크 확인
- 자산 화면에서 **아래로 당겨 새로고침**
- Jupiter API rate limit (429) 일 수 있음 — 잠시 후 재시도하면 자동 백오프

### Swap이 실패해요
- **"가스비용 SOL이 부족합니다"** → SOL 잔액 0.002 SOL 이상 확인
- **"슬리피지 초과"** → 슬리피지를 0.5% → 1% 로 올리고 재시도
- **"블록해시 만료"** → 즉시 재시도 (자동으로 새 견적이 발급됨)
- **"사용자 취소"** → 지갑에서 한 번 더 승인

### 그 외 문제
- 설정 → 정보 → **문의 / 제보** 로 이메일 보내거나
- GitHub Issues 에 등록: https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ 안내

Solana cbBTC는 사용자가 직접 트랜잭션을 승인하는 self-custody 지갑 도구입니다. 트랜잭션 비용은 Solana 네트워크 표준 수수료가 적용되며, Jupiter swap에는 라우트별 가격 영향이 발생합니다. 트랜잭션 실행 전 모달에서 정확한 수령량과 슬리피지를 확인해 주세요.

mainnet 실거래에 사용되는 앱입니다. 사용자 자신의 자금에 대한 모든 책임은 사용자에게 있으며, 본 앱 개발자는 잘못된 입력·시장 변동·네트워크 장애 등으로 인한 손실에 책임지지 않습니다.`;

export const ABOUT_EN = `# Solana cbBTC

The mobile BTCfi app for Solana Seeker users.

cbBTC is Coinbase's 1:1 Bitcoin-pegged token — currently the largest wrapped Bitcoin on Solana mainnet with $340M+ market cap. This app gives you the most direct, hardware-secured path to hold and swap cbBTC from your Seeker.

## 🔑 Core features

- **Mobile Wallet Adapter** — direct integration with Seeker's Seed Vault for hardware-level key security
- **Live balances** — cbBTC, SOL, and SKR on one screen, pull-to-refresh
- **Jupiter Swap integration** — best routes from Solana's largest aggregator for SOL ↔ cbBTC
- **Slippage control** — pick 0.1% / 0.5% / 1% per trade
- **Versioned transaction** — full compatibility with Jupiter v6's latest tx format
- **Swap completion notifications** — get results even when the app is backgrounded, with Solscan link to verify

## 💰 cbBTC lending (Earn) — Phase 2

- **Supply / withdraw** — supply cbBTC to Kamino's audited smart contracts and take it back anytime (all or part)
- **Borrow against collateral** — borrow USDC against cbBTC, repay to free your collateral (risk consent on first borrow)
- **Risk display** — health and liquidation price always shown, color-coded safe / caution / danger
- **Self-custody** — the app never holds your funds or keys; every transaction is signed with your Seed Vault
- **Progress visualization** — prepare → simulate → sign → send → done steps + Solana Explorer verification
- **Guide screen** — how it works, transparency, and risk explained with infographics

## ⚡ Bitcoin Lightning (experimental) — its own tab

An experimental feature in the **Bitcoin Lightning tab** (small amounts recommended):

- **Pay LN invoices** — settle Lightning Network invoices (Bitcoin's payment rail) directly with USDC · SOL
- **Atomic swaps (HTLC)** — via Atomiq's audited escrow contracts. Every signature stays on the Solana side (Seed Vault)
- **Safe on failure** — if the LN payment doesn't complete, your funds are refunded. The LP can't claim funds without payment proof
- **Zero app fee** — only the LP fee (~0.5%), shown in the quote
- Lightning address (user@domain) support — just enter the amount in sats

As an experiment, small amounts are recommended.

## 🛡️ Security first

- Private keys **never leave the Seeker Seed Vault** hardware
- Every transaction is approved directly by you
- **No backend servers** — calls only Solana RPC and Jupiter API
- No analytics, no trackers
- Optional **app lock** (fingerprint / PIN) for extra protection

## 🎯 Seeker-aware

- **"Seeker Verified" badge** for Genesis Token holders, cryptographically checked on-chain
- "🔒 Hardware secured" indicator when connected via Seed Vault
- Verified users get a tighter default slippage (0.3%) automatically
- Built specifically for the Solana Mobile ecosystem

## ✨ User experience

- Korean / English / Vietnamese / Simplified Chinese, instant switch
- Light / Dark mode with system tracking or manual choice
- Smooth splash + fade transition for fast launches
- Minimal permissions — only internet and (optional) notifications

## 📱 Supported tokens

- **cbBTC** (Coinbase Wrapped BTC)
- **SOL** (native Solana token)
- **USDC** (lending borrow asset)
- **SKR** (Solana Mobile rewards token)

Future expansion: additional BTC-pegged tokens.

## 🔮 Roadmap

- ✅ **Phase 1**: cbBTC ↔ SOL swap (Jupiter) — **done**
- ✅ **Phase 2**: cbBTC-backed lending (Kamino) — supply · withdraw · borrow · repay **done**
- **Phase 2.5**: Multi-protocol comparison (add marginfi / Solend alongside Kamino for rate comparison)
- ⚡ **Phase 3**: Bitcoin Lightning payments — **shipped as a dedicated tab** (experimental). Pay and receive LN invoices with USDC · SOL · cbBTC via Atomiq atomic swaps (HTLC), signing only on Solana
- **Phase 4**: Cross-asset wrapped BTC comparison and routing (cbBTC · tBTC · BTC.b ...)

## 📊 Tech stack

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 Open source

Released under the **MIT license**. All security and transaction logic is open for review.

---

## 🔧 Troubleshooting

### The app gets stuck on "Authenticating…"
A known App Lock unlock bug in v0.1.0. **Fixed in v0.1.1+**. If you're currently stuck:

1. Android Settings → Apps → **Solana cbBTC** → Storage → **Clear data**
2. Reopen the app and reconnect your wallet
3. (Optional) Re-enable App Lock in Settings — the new version sidesteps the race

### My wallet won't connect
- Make sure an MWA-compatible wallet is installed (Phantom, Solflare, Backpack, Seeker Seed Vault)
- Check your internet connection — no offline banner at the top
- Open your wallet app once to unlock it, then retry

### Balances or quotes won't load
- If the "No internet connection" banner is showing, check your network
- Pull down to refresh on the Assets screen
- May be a Jupiter API rate limit (429) — retry after a moment, the app backs off automatically

### My swap fails
- **"Insufficient SOL for fees"** → keep at least 0.002 SOL for gas
- **"Slippage exceeded"** → bump slippage from 0.5% to 1% and retry
- **"Blockhash expired"** → retry immediately (a fresh quote is fetched automatically)
- **"User cancelled"** → approve once more in the wallet

### Anything else
- Settings → About → **Feedback** to email us, or
- File a GitHub issue: https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ Disclaimer

Solana cbBTC is a self-custody wallet tool — you sign every transaction yourself. Standard Solana network fees apply, and Jupiter swaps incur route-dependent price impact. Confirm the expected receive amount and slippage in the confirmation modal before signing.

This app executes real mainnet transactions. You bear sole responsibility for your funds. The developers are not liable for losses arising from incorrect inputs, market volatility, network outages, or any other cause.`;

export const ABOUT_VI = `# Solana cbBTC

Ứng dụng BTCfi di động dành cho người dùng Solana Seeker.

cbBTC là token neo giá Bitcoin theo tỷ lệ 1:1 do Coinbase phát hành — hiện là wrapped Bitcoin lớn nhất trên Solana mainnet với vốn hóa hơn $340M. Ứng dụng này mang đến cho bạn con đường trực tiếp nhất, được bảo vệ ở cấp phần cứng, để nắm giữ và swap cbBTC ngay trên Seeker của bạn.

## 🔑 Tính năng cốt lõi

- **Mobile Wallet Adapter** — tích hợp trực tiếp với Seed Vault của Seeker để bảo mật khóa ở cấp phần cứng
- **Số dư trực tiếp** — cbBTC, SOL và SKR trên một màn hình, kéo xuống để làm mới
- **Tích hợp Jupiter Swap** — tuyến đường tối ưu từ aggregator lớn nhất Solana cho SOL ↔ cbBTC
- **Kiểm soát slippage** — chọn 0.1% / 0.5% / 1% cho mỗi giao dịch
- **Versioned transaction** — tương thích hoàn toàn với định dạng tx mới nhất của Jupiter v6
- **Thông báo hoàn tất Swap** — nhận kết quả ngay cả khi ứng dụng chạy nền, kèm liên kết Solscan để xác minh

## 💰 Cho vay cbBTC (Earn) — Phase 2

- **Cung cấp / Rút** — cung cấp cbBTC vào các smart contract đã được audit của Kamino và lấy lại bất cứ lúc nào (toàn bộ hoặc một phần)
- **Vay có tài sản thế chấp** — vay USDC bằng cbBTC làm tài sản thế chấp, trả nợ để giải phóng tài sản thế chấp của bạn (đồng ý rủi ro khi vay lần đầu)
- **Hiển thị rủi ro** — Health và giá thanh lý luôn được hiển thị, phân màu an toàn / thận trọng / nguy hiểm
- **Tự quản lý (self-custody)** — ứng dụng không bao giờ giữ tiền hay khóa của bạn; mọi giao dịch đều được ký bằng Seed Vault của bạn
- **Trực quan hóa tiến trình** — các bước chuẩn bị → mô phỏng → ký → gửi → hoàn tất + xác minh trên Solana Explorer
- **Màn hình hướng dẫn** — cách hoạt động, tính minh bạch và rủi ro được giải thích bằng infographic

## ⚡ Bitcoin Lightning (thử nghiệm) — tab riêng

Một tính năng thử nghiệm trong **tab Bitcoin Lightning** (khuyến nghị dùng số lượng nhỏ):

- **Thanh toán invoice LN** — thanh toán invoice Lightning Network (kênh thanh toán của Bitcoin) trực tiếp bằng USDC · SOL
- **Atomic swap (HTLC)** — thông qua các hợp đồng escrow đã được audit của Atomiq. Mọi chữ ký đều nằm ở phía Solana (Seed Vault)
- **An toàn khi thất bại** — nếu thanh toán LN không hoàn tất, tiền của bạn sẽ được hoàn tiền. LP không thể nhận tiền nếu không có bằng chứng thanh toán
- **Phí ứng dụng bằng 0** — chỉ có phí LP (~0.5%), được hiển thị trong báo giá
- Hỗ trợ Lightning address (user@domain) — chỉ cần nhập số lượng theo sats

Vì là tính năng thử nghiệm, khuyến nghị sử dụng số lượng nhỏ.

## 🛡️ Bảo mật là ưu tiên hàng đầu

- Khóa riêng tư **không bao giờ rời khỏi phần cứng Seed Vault của Seeker**
- Mọi giao dịch đều do chính bạn phê duyệt trực tiếp
- **Không có máy chủ backend** — chỉ gọi trực tiếp đến Solana RPC và Jupiter API
- Không có công cụ phân tích, không có tracker
- Tùy chọn **khóa ứng dụng** (sinh trắc học / PIN) để bảo vệ thêm

## 🎯 Tối ưu cho Seeker

- **Huy hiệu "Seeker Verified"** cho người nắm giữ Genesis Token, được xác thực bằng mật mã on-chain
- Chỉ báo "🔒 Hardware secured" khi kết nối qua Seed Vault
- Người dùng đã được xác minh tự động nhận mức slippage mặc định chặt hơn (0.3%)
- Được xây dựng riêng cho hệ sinh thái Solana Mobile

## ✨ Trải nghiệm người dùng

- Tiếng Hàn / Tiếng Anh / Tiếng Việt / Tiếng Trung giản thể, chuyển đổi tức thì
- Chế độ Sáng / Tối theo hệ thống hoặc lựa chọn thủ công
- Chuyển cảnh splash + fade mượt mà để khởi động nhanh
- Quyền tối thiểu — chỉ internet và (tùy chọn) thông báo

## 📱 Token được hỗ trợ

- **cbBTC** (Coinbase Wrapped BTC)
- **SOL** (token gốc của Solana)
- **USDC** (tài sản vay trong cho vay)
- **SKR** (token thưởng của Solana Mobile)

Mở rộng trong tương lai: thêm các token neo giá BTC khác.

## 🔮 Lộ trình

- ✅ **Phase 1**: swap cbBTC ↔ SOL (Jupiter) — **hoàn thành**
- ✅ **Phase 2**: cho vay dựa trên cbBTC (Kamino) — cung cấp · rút · vay · trả nợ **hoàn thành**
- **Phase 2.5**: So sánh đa giao thức (thêm marginfi / Solend bên cạnh Kamino để so sánh lãi suất)
- ⚡ **Phase 3**: Thanh toán Bitcoin Lightning — **đã ra mắt dưới dạng tab riêng** (thử nghiệm). Thanh toán và nhận invoice LN bằng USDC · SOL · cbBTC qua atomic swap của Atomiq (HTLC), chỉ ký ở phía Solana
- **Phase 4**: So sánh và định tuyến wrapped BTC đa tài sản (cbBTC · tBTC · BTC.b ...)

## 📊 Stack công nghệ

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 Mã nguồn mở

Được phát hành theo **giấy phép MIT**. Toàn bộ logic bảo mật và giao dịch đều mở để bạn kiểm tra.

---

## 🔧 Khắc phục sự cố

### Ứng dụng bị kẹt ở "Authenticating…"

Đây là lỗi mở khóa App Lock đã biết ở v0.1.0. **Đã sửa từ v0.1.1 trở lên**. Nếu bạn đang bị kẹt:

1. Cài đặt Android → Ứng dụng → **Solana cbBTC** → Bộ nhớ → **Xóa dữ liệu**
2. Mở lại ứng dụng và kết nối lại ví của bạn
3. (Tùy chọn) Bật lại Khóa ứng dụng trong Cài đặt — phiên bản mới đã tránh được tình trạng race này

### Ví của tôi không kết nối được

- Đảm bảo đã cài đặt một ví tương thích MWA (Phantom, Solflare, Backpack, Seeker Seed Vault)
- Kiểm tra kết nối internet — không có banner ngoại tuyến ở phía trên
- Mở ví một lần để mở khóa, rồi thử lại

### Số dư hoặc báo giá không tải được

- Nếu banner "Không có kết nối internet" đang hiển thị, hãy kiểm tra mạng của bạn
- Kéo xuống để làm mới ở màn hình Tài sản
- Có thể là giới hạn tốc độ của Jupiter API (429) — thử lại sau một lát, ứng dụng sẽ tự động giãn thời gian

### Swap của tôi thất bại

- **"Không đủ SOL để trả phí"** → giữ ít nhất 0.002 SOL cho gas
- **"Vượt quá slippage"** → tăng slippage từ 0.5% lên 1% rồi thử lại
- **"Blockhash đã hết hạn"** → thử lại ngay (báo giá mới sẽ được lấy tự động)
- **"Người dùng đã hủy"** → phê duyệt thêm một lần nữa trong ví

### Vấn đề khác

- Cài đặt → Thông tin → **Phản hồi** để gửi email cho chúng tôi, hoặc
- Tạo một issue trên GitHub: https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ Miễn trừ trách nhiệm

Solana cbBTC là một công cụ ví tự quản lý (self-custody) — bạn tự ký mọi giao dịch. Phí mạng Solana tiêu chuẩn được áp dụng, và các swap qua Jupiter chịu tác động giá tùy theo tuyến đường. Hãy xác nhận số lượng dự kiến nhận được và slippage trong modal xác nhận trước khi ký.

Ứng dụng này thực hiện các giao dịch thật trên mainnet. Bạn hoàn toàn chịu trách nhiệm về tiền của mình. Nhà phát triển không chịu trách nhiệm cho các khoản lỗ phát sinh từ nhập liệu sai, biến động thị trường, sự cố mạng, hoặc bất kỳ nguyên nhân nào khác.`;

export const ABOUT_ZH = `# Solana cbBTC

面向 Solana Seeker 用户的 BTCfi 移动应用。

cbBTC 是 Coinbase 发行的比特币 1:1 锚定代币 —— 目前是 Solana 主网上规模最大的 wrapped Bitcoin，市值超过 $340M。本应用为你提供在 Seeker 上持有和兑换 cbBTC 的最短路径，并由硬件级安全保护。

## 🔑 核心功能

- **Mobile Wallet Adapter** — 与 Seeker 的 Seed Vault 直接集成，硬件级密钥安全
- **实时余额** — cbBTC、SOL、SKR 在同一屏显示，下拉刷新
- **Jupiter Swap 集成** — 由 Solana 最大的聚合器为 SOL ↔ cbBTC 提供最优路由
- **滑点控制** — 每笔交易可选 0.1% / 0.5% / 1%
- **Versioned transaction** — 完全兼容 Jupiter v6 的最新交易格式
- **兑换完成通知** — 应用退到后台也能收到结果，并附 Solscan 链接供你核验

## 💰 cbBTC 借贷（赚币）— Phase 2

- **存入 / 提取** — 将 cbBTC 存入 Kamino 经过审计的智能合约，随时全额或部分取回
- **抵押借款** — 以 cbBTC 为抵押品借出 USDC，还款后即可取回抵押品（首次借款需确认风险）
- **风险显示** — 始终展示健康度与清算价格，并以安全 / 注意 / 危险三色标示
- **自托管** — 应用绝不保管你的资金或密钥；每一笔交易都由你的 Seed Vault 签名
- **进度可视化** — 准备 → 模拟 → 签名 → 发送 → 完成，各步骤可见，并可在 Solana Explorer 核验
- **说明页面** — 用信息图讲清运作方式、透明度与风险

## ⚡ Bitcoin Lightning（实验性）— 独立标签页

这是 **Bitcoin Lightning 标签页**中的实验性功能（建议只用小额）：

- **支付 LN 闪电发票** — 直接用 USDC · SOL 结算闪电网络（比特币的支付网络）发票
- **原子交换（HTLC）** — 通过 Atomiq 经过审计的 escrow 合约完成。所有签名都只发生在 Solana 一侧（Seed Vault）
- **失败也安全** — 若 LN 支付未完成，你的资金会被退款。LP（中介方）没有支付证明就无法取走资金
- **应用手续费为 0** — 只有 LP 手续费（约 0.5%），并在报价中列明
- 支持 Lightning Address 闪电地址（user@domain）—— 只需输入金额（聪）

由于仍是实验性功能，建议只用小额。

## 🛡️ 安全优先

- 私钥**绝不离开 Seeker Seed Vault 硬件**
- 每一笔交易都由你亲自批准
- **没有后端服务器** — 只直接调用 Solana RPC 与 Jupiter API
- 没有分析工具，没有追踪器
- 可选的**应用锁**（指纹 / PIN）提供额外保护

## 🎯 为 Seeker 而生

- 为 Genesis Token 持有者显示 **"Seeker Verified" 徽章**，通过链上密码学校验
- 通过 Seed Vault 连接时显示 "🔒 Hardware secured" 标识
- 已验证用户自动获得更严格的默认滑点（0.3%）
- 专为 Solana Mobile 生态系统打造

## ✨ 使用体验

- 韩语 / 英语 / 越南语 / 简体中文，即时切换
- 浅色 / 深色模式，可跟随系统或手动选择
- 流畅的 splash + 淡入过渡，启动更快
- 权限最少 — 只需网络与（可选的）通知

## 📱 支持的代币

- **cbBTC**（Coinbase Wrapped BTC）
- **SOL**（Solana 原生代币）
- **USDC**（借贷中的借款资产）
- **SKR**（Solana Mobile 奖励代币）

未来将扩展支持更多锚定 BTC 的代币。

## 🔮 路线图

- ✅ **Phase 1**：cbBTC ↔ SOL 兑换（Jupiter）— **已完成**
- ✅ **Phase 2**：基于 cbBTC 的借贷（Kamino）— 存入 · 提取 · 借款 · 还款 **已完成**
- **Phase 2.5**：多协议对比（在 Kamino 之外加入 marginfi / Solend，用于利率比较）
- ⚡ **Phase 3**：Bitcoin Lightning 支付 — **已作为独立标签页发布**（实验性）。通过 Atomiq 的原子交换（HTLC），用 USDC · SOL · cbBTC 支付和接收 LN 闪电发票，签名只发生在 Solana 一侧
- **Phase 4**：跨资产 wrapped BTC 对比与路由（cbBTC · tBTC · BTC.b ……）

## 📊 技术栈

React Native · Expo SDK 54 · TypeScript strict · Solana Mobile Wallet Adapter · Jupiter Swap v6 · Kamino Lend · TanStack Query

## 🌐 开源

以 **MIT 许可证**发布。所有安全与交易逻辑都可供你自行审阅。

---

## 🔧 问题排查

### 应用卡在"验证中…"
这是 v0.1.0 中已知的应用锁解锁 bug。**已在 v0.1.1 及以上版本修复**。如果你现在卡住了：

1. Android 设置 → 应用 → **Solana cbBTC** → 存储 → **清除数据**
2. 重新打开应用并重新连接钱包
3. （可选）在设置中重新开启应用锁 — 新版本已绕开该 race

### 我的钱包连不上
- 确认已安装兼容 MWA 的钱包（Phantom、Solflare、Backpack、Seeker Seed Vault）
- 检查网络连接 — 顶部没有离线横幅
- 先打开钱包应用解锁一次，然后重试

### 余额或报价加载不出来
- 如果顶部显示"无网络连接"横幅，请检查你的网络
- 在资产页面下拉刷新
- 可能是 Jupiter API 触发了限流（429）— 稍后重试，应用会自动退避

### 我的兑换失败了
- **"用于手续费的 SOL 不足"** → 至少保留 0.002 SOL 作为 gas
- **"滑点超出"** → 把滑点从 0.5% 调到 1% 后重试
- **"区块哈希已过期"** → 立即重试（应用会自动获取新报价）
- **"用户已取消"** → 在钱包里再批准一次

### 其他问题
- 设置 → 关于 → **反馈**，给我们发邮件；或者
- 在 GitHub 提交 issue：https://github.com/dhryoo/solana-cbbtc/issues

---

## ⚠️ 免责声明

Solana cbBTC 是一个自托管钱包工具 —— 每一笔交易都由你自己签名。交易会按 Solana 网络标准手续费计费，Jupiter 兑换则会产生随路由而变的价格影响。签名前请在确认弹窗中核对预计到账数量与滑点。

本应用执行的是主网上的真实交易。你对自己的资金负全部责任。开发者不对因输入错误、市场波动、网络故障或任何其他原因造成的损失承担责任。`;
