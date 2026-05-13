// IMPORTANT: polyfills must be imported before any other module
// that transitively depends on Buffer / crypto.
import "./polyfills";

import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
