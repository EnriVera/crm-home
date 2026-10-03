<script setup lang="ts">
/**
 * AppShell — the authenticated app layout. Sidebar (left) + topbar + main
 * area. Both the sidebar and any future right-side drawer use
 * `vue-resizable-panels`. For v1 the sidebar is fixed-width; resizable
 * wiring is added in the next change consumer.
 *
 * The composables (`useAuth`, `useTheme`) return objects with refs as
 * properties. Vue 3 auto-unwraps refs at the **top level** of script
 * setup, not when accessed through a property of a returned object.
 * We destructure here so the templates can reference `profile`,
 * `resolved`, etc. as plain values.
 */
import { computed } from "vue";
import { useAuth } from "@/shared/composables/use-auth";
import { useTheme } from "@/shared/composables/use-theme";
import { useUiStore } from "@/stores/ui";
import { Link, useRouter } from "@/shared/vendor/router";
import { Icon } from "@/shared/vendor/icons";
import { useT } from "@/shared/vendor/i18n";

const { profile, signOut: doSignOut } = useAuth();
const { resolved: themeResolved, setPreference: setThemePreference } = useTheme();
const ui = useUiStore();
const router = useRouter();
const t = useT();

const navItems = computed(() => [
  { to: "/dashboard", label: t("nav.dashboard"), icon: "PhSquaresFour" as const },
  { to: "/tasks", label: t("nav.tasks"), icon: "PhCheckSquare" as const },
  { to: "/schedules", label: t("nav.schedules"), icon: "PhTimer" as const },
  { to: "/clients", label: t("nav.clients"), icon: "PhUsersThree" as const },
  { to: "/config", label: t("nav.config"), icon: "PhGearSix" as const },
]);

function toggleTheme() {
  setThemePreference(themeResolved.value === "dark" ? "light" : "dark");
}

async function onSignOut() {
  await doSignOut();
  await router.navigate({ to: "/login" });
}
</script>

<template>
  <div class="flex min-h-full bg-bg text-text">
    <aside
      :class="[
        'flex shrink-0 flex-col border-r border-zinc-200 bg-surface py-6 dark:border-zinc-800',
        ui.sidebarCollapsed ? 'w-16' : 'w-60',
      ]"
    >
      <div class="flex items-center gap-2 px-4">
        <div class="h-7 w-7 shrink-0 rounded-md bg-accent" />
        <span v-if="!ui.sidebarCollapsed" class="font-semibold tracking-tight">CRM-Home</span>
      </div>

      <nav class="mt-8 flex flex-col gap-1 px-2">
        <Link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :active-props="{ class: 'bg-zinc-100 dark:bg-zinc-800 text-accent' }"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-2 hover:bg-zinc-100 hover:text-text dark:hover:bg-zinc-800"
        >
          <Icon :name="item.icon" :size="18" />
          <span v-if="!ui.sidebarCollapsed">{{ item.label }}</span>
        </Link>
      </nav>

      <div class="mt-auto flex flex-col gap-2 px-2">
        <button
          type="button"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-zinc-100 hover:text-text dark:hover:bg-zinc-800"
          @click="toggleTheme"
        >
          <Icon :name="themeResolved === 'dark' ? 'PhSun' : 'PhMoon'" :size="18" />
          <span v-if="!ui.sidebarCollapsed">
            {{ themeResolved === "dark" ? "Light" : "Dark" }}
          </span>
        </button>
        <button
          v-if="profile"
          type="button"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-2 hover:bg-zinc-100 hover:text-text dark:hover:bg-zinc-800"
          @click="onSignOut"
        >
          <Icon name="PhSignOut" :size="18" />
          <span v-if="!ui.sidebarCollapsed">{{ t("auth.signOut") }}</span>
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        v-if="profile"
        class="flex h-14 items-center justify-between border-b border-zinc-200 bg-surface px-6 dark:border-zinc-800"
      >
        <div class="text-sm text-text-2">
          {{ t("auth.signedInAs", { name: profile.name }) }}
        </div>
      </header>
      <main class="min-h-0 flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
