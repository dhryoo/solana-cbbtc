// Expo config plugin: inject seeker-btcfi release signing config into android/app/build.gradle.
// 자격증명은 ~/.gradle/gradle.properties의 SEEKER_BTCFI_RELEASE_* 키로 주입.
// 미설정 시 debug 키로 fallback + 빌드 중 경고 출력.
//
// 이 플러그인이 없으면 `expo prebuild`가 build.gradle을 재생성할 때 release signing이 사라지고
// debug 키로 빌드되어 dApp Store 심사에서 거부됨.

const RELEASE_SIGNING_CONFIG = `        // dApp Store 제출용 release keystore. (withReleaseSigning plugin이 주입)
        release {
            def releaseStoreFile = findProperty('SEEKER_BTCFI_RELEASE_STORE_FILE')?.toString()?.trim()
            def releaseStorePassword = findProperty('SEEKER_BTCFI_RELEASE_STORE_PASSWORD')?.toString()?.trim()
            def releaseKeyAlias = findProperty('SEEKER_BTCFI_RELEASE_KEY_ALIAS')?.toString()?.trim()
            def releaseKeyPassword = findProperty('SEEKER_BTCFI_RELEASE_KEY_PASSWORD')?.toString()?.trim()
            if (releaseStoreFile && releaseStorePassword && releaseKeyAlias && releaseKeyPassword) {
                storeFile file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            } else {
                println "⚠️  seeker-btcfi: release keystore not configured. Using debug signing — DO NOT submit this APK."
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

function injectReleaseSigningConfig(buildGradle)
{
    // Already injected?
    if (buildGradle.includes("SEEKER_BTCFI_RELEASE_STORE_FILE"))
    {
        return buildGradle;
    }

    // signingConfigs 블록의 debug 직후, 닫는 } 직전에 release 추가.
    // 정규식: 'signingConfigs {' ... 'debug { ... }' ... '}'
    // 'debug { ... }' 블록 끝(닫는 }) 다음 줄에 release 블록 삽입.
    const debugBlockPattern = /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*)(\n)/;
    const replaced = buildGradle.replace(
        debugBlockPattern,
        `$1\n${RELEASE_SIGNING_CONFIG}\n$2`,
    );

    if (replaced === buildGradle)
    {
        throw new Error("withReleaseSigning: could not locate signingConfigs.debug block in build.gradle");
    }
    return replaced;
}

function switchReleaseBuildTypeToReleaseSigning(buildGradle)
{
    // `buildTypes { ... release { ... signingConfig signingConfigs.debug }` 안의
    // signingConfigs.debug를 signingConfigs.release로 교체.
    // 주의: 첫 번째 'release {' 패턴은 signingConfigs.release 블록(우리가 방금 주입한 것)일 수 있으므로
    // 반드시 'buildTypes { ... release {' 컨텍스트로 anchor 필요.
    const pattern = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/;
    return buildGradle.replace(pattern, "$1signingConfigs.release");
}

function withReleaseSigning(config)
{
    // @expo/config-plugins lazy-require to keep this plugin file plain JS.
    const { withAppBuildGradle } = require("@expo/config-plugins");
    return withAppBuildGradle(config, (cfg) =>
    {
        let contents = cfg.modResults.contents;
        contents = injectReleaseSigningConfig(contents);
        contents = switchReleaseBuildTypeToReleaseSigning(contents);
        cfg.modResults.contents = contents;
        return cfg;
    });
}

module.exports = withReleaseSigning;
