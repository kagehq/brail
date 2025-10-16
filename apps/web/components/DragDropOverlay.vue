<template>
  <Transition
    enter-active-class="transition-all duration-200"
    leave-active-class="transition-all duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-blue-300/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
    >
      <div class="bg-gradient-to-br from-blue-300/20 to-blue-400/20 border-4 border-dashed border-blue-300/50 rounded-3xl p-16 animate-pulse">
        <div class="text-center">
          <svg class="w-24 h-24 mx-auto mb-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 class="text-3xl font-bold text-white mb-2">Drop your files here</h3>
          <p class="text-blue-200 text-lg">Release to upload</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
}

defineProps<Props>();
</script>

