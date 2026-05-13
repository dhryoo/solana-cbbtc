// Polyfills MUST be imported before any module that uses crypto/Buffer.
// web3.js depends on these in the React Native runtime.
import "react-native-get-random-values";
import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined")
{
    global.Buffer = Buffer;
}

import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
