<template>
  <div class="flex items-center gap-3">
    <!-- Search Input -->
    <div class="relative flex-1">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchValue"
        type="text"
        :placeholder="searchPlaceholder"
        class="w-full pl-10 pr-4 py-2 bg-gray-500/10 border border-gray-500/25 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600"
      />
    </div>
    
    <!-- Filter Dropdown -->
    <div v-if="filterOptions.length > 0" class="relative">
      <button
        @click="showFilterDropdown = !showFilterDropdown"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/10 border border-gray-500/25 rounded-lg text-sm text-white hover:bg-gray-500/15 transition-all"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>{{ currentFilterLabel }}</span>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        v-if="showFilterDropdown"
        @click.stop
        class="absolute right-0 mt-2 w-56 bg-black border border-gray-500/25 rounded-lg shadow-xl z-50 py-1"
      >
        <button
          v-for="option in filterOptions"
          :key="option.value"
          @click="selectFilter(option.value)"
          class="w-full text-left px-4 py-2 text-sm hover:bg-gray-500/15 transition-all"
          :class="filterValue === option.value ? 'text-blue-300 bg-gray-500/10' : 'text-gray-400'"
        >
          <div class="flex items-center justify-between">
            <span>{{ option.label }}</span>
            <svg
              v-if="filterValue === option.value"
              class="w-4 h-4 text-blue-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>
      </div>

      <!-- Backdrop -->
      <div
        v-if="showFilterDropdown"
        class="fixed inset-0 z-40"
        @click="showFilterDropdown = false"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FilterOption {
  label: string;
  value: string;
}

interface Props {
  modelValue: string;
  filterValue: string;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Search...',
  filterOptions: () => [],
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:filterValue': [value: string];
}>();

const searchValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const showFilterDropdown = ref(false);

const currentFilterLabel = computed(() => {
  const option = props.filterOptions.find(opt => opt.value === props.filterValue);
  return option?.label || 'All';
});

const selectFilter = (value: string) => {
  emit('update:filterValue', value);
  showFilterDropdown.value = false;
};
</script>

