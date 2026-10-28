import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // The scaffold has no session yet: the orpc auth feature fills this in, so
  // every guarded route redirects to /login (PRD-v4 §12.4).
  const session = ref<null>(null)
  const hasSession = computed(() => session.value !== null)

  return { session, hasSession }
})
