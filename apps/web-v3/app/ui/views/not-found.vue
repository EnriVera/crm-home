<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold text-text">Página no encontrada</h1>
    <p class="mt-2 text-text-2">La dirección no corresponde a ninguna pantalla.</p>
    <NuxtLink to="/" class="mt-4 inline-block text-sm text-accent hover:underline">
      Volver al inicio
    </NuxtLink>
    <p class="mt-6 text-sm text-text-2">{{ t('scaffold.placeholder') }}</p>
  </section>
</template>
