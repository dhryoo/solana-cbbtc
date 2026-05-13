// 다른 모든 import보다 먼저 평가되어야 하는 polyfill 모음.
// index.ts에서 가장 처음 `import "./polyfills"`로 호출.
// 한 파일로 격리한 이유: ESM/Metro에서 동일 파일 안의 import가 호이스트되어
// `global.Buffer = Buffer` 라인이 web3.js의 transitive import 뒤에 실행되는 문제를 회피.

import "react-native-get-random-values";
import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined")
{
    global.Buffer = Buffer;
}
