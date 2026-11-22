import { register } from "node:module";

// A separate resolve hook keeps application imports extensionless while
// allowing Node 26 to strip types from the test modules.
register("./ts-resolve.mjs", import.meta.url);
