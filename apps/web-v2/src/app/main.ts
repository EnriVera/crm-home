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
    // Boot the auth store BEFORE the router is installed. By the time the
    // router's auth guard runs, `isBooted` is already true and the guard
    // can make the right redirect decision (B-010).
    await bootAuth();

    const app = createApp(App);

    app.use(createPinia());
    app.use(VueQueryPlugin, { queryClient });
    app.use(i18n);
    // The router is provided to the tree via <RouterProvider :router="router" />
    // in App.vue — not as a Vue plugin. Calling app.use(router) here fails
    // the typecheck because the TanStack Router core is not a Vue plugin.

    app.mount("#app");
}

void bootstrap();
