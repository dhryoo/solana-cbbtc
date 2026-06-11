// Metro 설정.
//
// klend-sdk(@kamino-finance) 의 일부 유틸이 Node 전용 모듈(fs 등)을 require 한다
// (예: utils/signer.js 의 parseKeypairFile — 디스크에서 keypair 로드).
// 우리는 keypair 를 디스크에서 읽지 않고 Mobile Wallet Adapter(Seed Vault)로 서명하므로
// 이 코드 경로는 런타임에 호출되지 않는 dead path 다. RN 번들에 Node 빌트인이 없어
// 번들이 실패하므로, 해당 모듈들을 빈 모듈로 stub 한다 (실제 호출 시에만 의미 있게 실패).

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// RN 에 존재하지 않고, 우리 코드 경로에서 실제로 쓰이지 않는 Node 전용 빌트인.
const NODE_BUILTIN_STUBS = new Set(["fs"]);

// Node 전용 패키지 → RN shim 대체.
// 'ws': @atomiqlabs/messenger-nostr 가 window.WebSocket 부재 시에만 fallback 으로 require —
//       RN 은 WebSocket 내장이라 dead path 지만 Metro 정적 번들이 실패하므로 shim 필요.
const MODULE_SHIMS = {
    ws: require.resolve("./shims/ws.js"),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) =>
{
    if (NODE_BUILTIN_STUBS.has(moduleName))
    {
        return { type: "empty" };
    }
    if (MODULE_SHIMS[moduleName])
    {
        return { type: "sourceFile", filePath: MODULE_SHIMS[moduleName] };
    }
    const resolver = defaultResolveRequest ?? context.resolveRequest;
    return resolver(context, moduleName, platform);
};

module.exports = config;
