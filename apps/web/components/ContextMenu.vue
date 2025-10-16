<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-100"
      leave-active-class="transition-opacity duration-75"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50"
        @click="close"
        @contextmenu.prevent="close"
      >
        <div
          :style="menuStyle"
          class="absolute bg-black border border-gray-500/30 rounded-lg shadow-2xl py-1 min-w-[200px] animate-fade-in"
          @click.stop
        >
          <button
            v-for="(item, index) in items"
            :key="index"
            @click="handleItemClick(item)"
            :disabled="item.disabled"
            :class="[
              'w-full text-left px-4 py-2.5 text-sm transition-all flex items-center gap-3',
              item.danger 
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' 
                : 'text-gray-300 hover:bg-gray-500/15 hover:text-white',
              item.disabled && 'opacity-50 cursor-not-allowed'
            ]"
          >
            <component v-if="item.icon" :is="item.icon" class="w-4 h-4" />
            <span class="flex-1">{{ item.label }}</span>
            <span v-if="item.shortcut" class="text-xs text-gray-600">{{ item.shortcut }}</span>
          </button>
          
          <div v-if="items.some(i => i.divider)" class="my-1 border-t border-gray-500/20"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { h } from 'vue';

interface MenuItem {
  label: string;
  icon?: any;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
  divider?: boolean;
}

interface Props {
  show: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const menuStyle = computed(() => {
  // Ensure menu doesn't go off-screen
  const maxX = window.innerWidth - 220; // menu width + padding
  const maxY = window.innerHeight - (props.items.length * 40 + 20); // approximate height
  
  return {
    left: `${Math.min(props.x, maxX)}px`,
    top: `${Math.min(props.y, maxY)}px`,
  };
});

const handleItemClick = (item: MenuItem) => {
  if (!item.disabled) {
    item.action();
    close();
  }
};

const close = () => {
  emit('close');
};

// Close on Escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.show) {
      close();
    }
  };
  window.addEventListener('keydown', handleEscape);
  onUnmounted(() => {
    window.removeEventListener('keydown', handleEscape);
  });
});
</script>

