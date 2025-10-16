<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    @click.self="onCancel"
  >
    <div class="bg-black border border-gray-500/25 rounded-lg shadow-lg max-w-md w-full">
      <!-- Header -->
      <div class="p-4 py-3 border-b border-gray-500/25">
        <h3 class="text-lg font-semibold text-white">
          {{ title }}
        </h3>
      </div>

      <!-- Body -->
      <div class="p-6">
        <p class="text-gray-300">{{ message }}</p>
        <p v-if="description" class="text-sm text-gray-500 mt-2">{{ description }}</p>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-500/25 flex justify-end gap-3">
        <button
          @click="onCancel"
          class="px-4 py-2 bg-gray-500/10 text-sm font-medium border border-gray-500/25 text-gray-400 hover:text-white rounded-lg transition"
        >
          {{ cancelText }}
        </button>
        <button
          @click="onConfirm"
          class="px-4 py-2 font-medium text-sm rounded-lg transition"
          :class="confirmClass"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  title: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'primary',
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const confirmClass = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'bg-red-500 text-white hover:bg-red-600';
    case 'warning':
      return 'bg-yellow-300 text-black hover:bg-yellow-400';
    case 'primary':
    default:
      return 'bg-blue-300 text-black hover:bg-blue-400';
  }
});

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};
</script>

