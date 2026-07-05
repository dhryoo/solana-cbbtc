// Expo config plugin: android:allowBackup="false" 강제.
//
// 자기수탁(self-custody) 앱이라 온디바이스 데이터가 Android Auto Backup 으로 Google Drive 에
// 업로드되면 안 된다. AsyncStorage 에는 MWA 지갑 auth token(wallet:authToken)과 진행 중
// Lightning HTLC swap 상태(환불/클레임 시크릿 포함)가 들어 있어, 다른 기기로 복원되면
// stale 한 swap DB 로 자금 위험이 생길 수 있다.
//
// expo prebuild 는 매니페스트를 재생성하면서 allowBackup 기본값(true)으로 되돌리므로,
// 매니페스트를 직접 수정하지 않고 이 플러그인으로 매 prebuild 마다 false 로 고정한다.

function withSecureBackup(config)
{
    // @expo/config-plugins lazy-require to keep this plugin file plain JS.
    const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");
    return withAndroidManifest(config, (cfg) =>
    {
        const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
        application.$["android:allowBackup"] = "false";
        return cfg;
    });
}

module.exports = withSecureBackup;
