import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@/shared/vendor/tanstack";
import { i18n } from "@/shared/vendor/i18n";
import App from "./App.vue";
import { bootAuth } from "./boot";
import "./styles.css";

const queryClient = new QueryClient({
        defaultOptions: {
                queries: {
                        retry: 1,
                        refetchOnWindowFocus: false,
                        staleTime: 30_000,
                },
        },
});

async function bootstrap() {
        const app = createApp(App);

        // Pinia MUST be installed before any code calls useStore(). The auth
        // boot calls useAuthStore() to read/write the session, so the install
        // order is: createApp -> pinia -> other plugins -> bootAuth -> mount.
        app.use(createPinia());
        app.use(VueQueryPlugin, { queryClient });
        app.use(i18n);

        // Boot the auth store BEFORE the app mounts. The router is provided
        // to the tree via <RouterProvider :router="router" /> in App.vue
        // (not as a Vue plugin — TanStack Router is not one), so it only
        // becomes active after mount. By the time the router resolves any
        // route, `isBooted` is already true and the auth guard can make the
        // right redirect decision (B-010).
        await bootAuth();

        app.mount("#app");
}

void bootstrap();
