<template>
  <nav class="flex items-center gap-2 text-sm mb-3">
    <NuxtLink
      v-for="(crumb, index) in crumbs"
      :key="index"
      :to="crumb.to"
      class="flex items-center gap-2"
    >
      <span
        v-if="index < crumbs.length - 1"
        class="text-gray-500 hover:text-white transition-colors"
      >
        {{ crumb.label }}
      </span>
      <span
        v-else
        class="text-white font-semibold"
      >
        {{ crumb.label }}
      </span>
      
      <svg
        v-if="index < crumbs.length - 1"
        class="w-4 h-4 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
interface Crumb {
  label: string;
  to: string;
}

interface Props {
  crumbs: Crumb[];
}

defineProps<Props>();
</script>

