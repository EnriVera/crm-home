import { defineConfig, RenderRoute } from "@octanejs/vite-plugin";

/**
 * Tabla de rutas del meta-framework Octane (verificación D6: el router del
 * ecosistema reemplaza a @tanstack/react-router, incompatible con el runtime
 * de Octane). `__root.tsrx` actúa como layout raíz de todas las rutas.
 */
export default defineConfig({
  router: {
    routes: [
      new RenderRoute({
        path: "/",
        entry: ["IndexRoute", "/src/routes/index.tsrx"],
        layout: "/src/routes/__root.tsrx",
      }),
    ],
  },
});
