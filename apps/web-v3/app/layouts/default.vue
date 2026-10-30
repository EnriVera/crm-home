<script setup lang="ts">
import type { Component } from 'vue'
import {
  PhArrowsLeftRight,
  PhCheckSquare,
  PhClock,
  PhGear,
  PhMoon,
  PhSlidersHorizontal,
  PhSquaresFour,
  PhSun,
  PhTrendDown,
  PhTrendUp,
  PhUser,
  PhUsers,
} from '~/shared/vendor/icons'
import { useThemeStore } from '~/stores/theme'

const route = useRoute()
const theme = useThemeStore()
const { t } = useI18n()

interface NavItem {
  label: string
  to: string
  icon: Component
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// A computed and not a fixed array: the labels are translated and have
// to follow the locale when it changes.
const navGroups = computed<NavGroup[]>(() => [
  {
    label: t('nav.general'),
    items: [
      { label: t('nav.dashboard'), to: '/dashboard', icon: PhSquaresFour },
      { label: t('nav.tasks'), to: '/tasks', icon: PhCheckSquare },
      { label: t('nav.schedules'), to: '/schedules', icon: PhClock },
      { label: t('nav.clients'), to: '/clients', icon: PhUsers },
    ],
  },
  {
    label: t('nav.finance'),
    items: [
      { label: t('nav.incomes'), to: '/incomes', icon: PhTrendUp },
      { label: t('nav.expenses'), to: '/expenses', icon: PhTrendDown },
      { label: t('nav.transfers'), to: '/transfers', icon: PhArrowsLeftRight },
    ],
  },
  {
    label: t('nav.system'),
    items: [
      { label: t('nav.tasksConfig'), to: '/tasks-config', icon: PhSlidersHorizontal },
      { label: t('nav.config'), to: '/config', icon: PhGear },
    ],
  },
])

const navItems = computed(() =>
  navGroups.value.flatMap((group) => group.items),
)

// Exact match keeps a single item active, /tasks must not light up /tasks-config.
function isActive(path: string) {
  return route.path === path
}

const currentSection = computed(
  () => navItems.value.find((item) => item.to === route.path)?.label ?? t('app.name'),
)

function toggleTheme() {
  theme.setTheme(theme.isDark ? 'light' : 'dark')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg text-text md:flex-row">
    <aside class="border-b border-border bg-surface-2 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div class="flex items-center gap-2 px-4 py-4">
        <span
          class="grid size-8 place-items-center rounded-md bg-accent text-sm font-bold text-accent-fg"
          aria-hidden="true"
          >C</span
        >
        <span class="text-sm font-semibold">{{ t('app.name') }}</span>
      </div>
      <nav
        class="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:gap-6 md:overflow-visible md:px-4 md:pb-6"
        aria-label="Navegación principal"
      >
        <div v-for="group in navGroups" :key="group.label" class="shrink-0 md:shrink">
          <h2
            class="hidden px-2 pb-1 text-xs font-medium uppercase tracking-wide text-text-2 md:block"
          >
            {{ group.label }}
          </h2>
          <ul class="flex gap-1 md:flex-col">
            <li v-for="item in group.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm text-text-2 transition-colors hover:bg-surface hover:text-text"
                :class="
                  isActive(item.to)
                    ? 'border-accent bg-surface font-medium text-accent'
                    : 'border-transparent'
                "
                :aria-current="isActive(item.to) ? 'page' : undefined"
              >
                <component
                  :is="item.icon"
                  :size="18"
                  :weight="isActive(item.to) ? 'fill' : 'regular'"
                />
                <span class="whitespace-nowrap">{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6"
      >
        <p class="truncate text-sm text-text-2">
          <span class="font-medium text-text">{{ t('app.name') }}</span>
          <span aria-hidden="true"> / </span>
          {{ currentSection }}
        </p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="grid size-9 place-items-center rounded-md border border-border text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            :aria-label="theme.isDark ? 'Usar tema claro' : 'Usar tema oscuro'"
            @click="toggleTheme"
          >
            <component :is="theme.isDark ? PhSun : PhMoon" :size="18" weight="regular" />
          </button>
          <span
            class="grid size-9 place-items-center rounded-full bg-accent text-accent-fg"
            title="Sesión sin iniciar"
          >
            <PhUser :size="16" weight="regular" aria-hidden="true" />
          </span>
        </div>
      </header>

      <main class="flex-1 px-4 py-6 md:px-8 md:py-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
