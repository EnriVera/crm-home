import { defineConfig } from "vite";
import { octane } from "octane/compiler/vite";

export default defineConfig({
  plugins: [octane({ ssr: true })],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    ssr: true,
    minify: false,
  },
  ssr: {
    noExternal: ["@octanejs/email", "octane"],
  },
});
