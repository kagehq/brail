<template>
  <div class="flex items-center gap-3">
    <LoadingSpinner :size="size" />
    <span class="text-gray-400 text-sm animate-fade-in">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const messages = [
  'Preparing the magic...',
  'Brewing some code...',
  'Waking up the servers...',
  'Summoning the deployment spirits...',
  'Counting electrons...',
  'Spinning up the hamsters...',
  'Consulting the cloud...',
  'Polishing pixels...',
  'Compressing dreams...',
  'Optimizing awesomeness...',
  'Loading brilliance...',
  'Calibrating excellence...',
  'Fetching the good stuff...',
  'Brewing fresh deploys...',
  'Warming up the CDN...',
  'Charging the flux capacitor...',
  'Reticulating splines...',
  'Herding bits and bytes...',
  'Organizing chaos...',
  'Making it happen...',
  'Almost there...',
  'Just a moment...',
  'Good things take time...',
  'Worth the wait...',
];

const message = computed(() => {
  return messages[Math.floor(Math.random() * messages.length)];
});
</script>

