<template>
  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium" :class="badgeClass">
    <!-- Icon -->
    <component :is="icon" class="w-3.5 h-3.5" :class="iconClass" />
    
    <!-- Text -->
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';

interface Props {
  status: 'active' | 'uploaded' | 'uploading' | 'failed' | 'staged' | 'pending';
}

const props = defineProps<Props>();

const statusConfig = computed(() => {
  const configs = {
    active: {
      label: 'Active',
      badgeClass: 'bg-green-300/10 border border-green-300/20 text-green-300',
      iconClass: 'text-green-300',
      icon: () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
        h('path', {
          'fill-rule': 'evenodd',
          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z',
          'clip-rule': 'evenodd',
        }),
      ]),
    },
    uploaded: {
      label: 'Uploaded',
      badgeClass: 'bg-blue-300/10 border border-blue-300/20 text-blue-300',
      iconClass: 'text-blue-300',
      icon: () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
        h('path', {
          'fill-rule': 'evenodd',
          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z',
          'clip-rule': 'evenodd',
        }),
      ]),
    },
    uploading: {
      label: 'Uploading',
      badgeClass: 'bg-yellow-300/10 border border-yellow-300/20 text-yellow-300',
      iconClass: 'text-yellow-300 animate-spin',
      icon: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        }),
      ]),
    },
    failed: {
      label: 'Failed',
      badgeClass: 'bg-red-500/10 border border-red-500/20 text-red-400',
      iconClass: 'text-red-400',
      icon: () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
        h('path', {
          'fill-rule': 'evenodd',
          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z',
          'clip-rule': 'evenodd',
        }),
      ]),
    },
    staged: {
      label: 'Staged',
      badgeClass: 'bg-purple-300/10 border border-purple-300/20 text-purple-300',
      iconClass: 'text-purple-300',
      icon: () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
        h('path', {
          'fill-rule': 'evenodd',
          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z',
          'clip-rule': 'evenodd',
        }),
      ]),
    },
    pending: {
      label: 'Pending',
      badgeClass: 'bg-gray-500/10 border border-gray-500/20 text-gray-400',
      iconClass: 'text-gray-400',
      icon: () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
        h('path', {
          'fill-rule': 'evenodd',
          d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z',
          'clip-rule': 'evenodd',
        }),
      ]),
    },
  };
  
  return configs[props.status] || configs.pending;
});

const badgeClass = computed(() => statusConfig.value.badgeClass);
const iconClass = computed(() => statusConfig.value.iconClass);
const label = computed(() => statusConfig.value.label);
const icon = computed(() => statusConfig.value.icon);
</script>

