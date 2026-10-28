<script setup lang="ts">
import type { Component } from 'vue'
import { computed, markRaw, onMounted } from 'vue'
import AuthLayout from '~/layouts/auth.vue'
import DefaultLayout from '~/layouts/default.vue'
import LegalLayout from '~/layouts/legal.vue'
import { useThemeStore } from '~/stores/theme'
import { Toaster } from '~/shared/vendor/toast'

const route = useRoute()
const theme = useThemeStore()

const layouts: Record<string, Component> = {
  default: markRaw(DefaultLayout),
  auth: markRaw(AuthLayout),
  legal: markRaw(LegalLayout),
}

const layout = computed<Component>(() => {
  const name = typeof route.meta.layout === 'string' ? route.meta.layout : 'default'
  return layouts[name] ?? DefaultLayout
})

onMounted(() => theme.init())
</script>

<template>
  <div>
    <Toaster />
    <!-- With `pages: false` there is no pages module, so each layout renders the
         matched view itself through RouterView (PRD-v4 §12.3). -->
    <component :is="layout" />
  </div>
</template>
