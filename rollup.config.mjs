import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    {
      file: "dist/index.es.js",
      format: "es",
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "types/",
    }),
    json(),
  ],
  // Mark these as external to avoid bundling them if preferred, 
  // but if the original dist was 1.7MB, they might have been bundled.
  // For now, let's keep them external to see the clean build first.
  external: ["axios", "webrtc-adapter", "crypto-js", "clipboard-copy", "@volcengine/rtc"],
};
