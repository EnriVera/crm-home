import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'user_theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemePreference>('system')
  const prefersDark = ref(false)

  const isDark = computed(
    () => theme.value === 'dark' || (theme.value === 'system' && prefersDark.value),
  )

  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function setTheme(next: ThemePreference) {
    theme.value = next
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme()
  }

  function init() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      theme.value = stored
    }
    prefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme()
  }

  return { theme, isDark, applyTheme, setTheme, init }
})
