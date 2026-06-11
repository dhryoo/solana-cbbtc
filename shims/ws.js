// Node 전용 'ws' 패키지의 RN 대체 shim.
//
// @atomiqlabs/messenger-nostr 가 `window.WebSocket ?? require("ws")` 로 fallback 하는데,
// RN 은 window.WebSocket 이 항상 존재하므로 이 모듈은 런타임에 사용되지 않는 dead path 다.
// 다만 Metro 가 require("ws") 를 정적으로 번들하려다 Node 'stream' 의존으로 실패하므로,
// RN 내장 WebSocket 을 export 하는 이 shim 으로 redirect 한다 (metro.config.js 참조).

module.exports = global.WebSocket;
module.exports.WebSocket = global.WebSocket;
