<template>
  <div ref="containerRef" class="relative overflow-y-auto" :style="{ height: containerHeight }">
    <!-- Spacer for scroll positioning -->
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <!-- Only render visible items -->
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item)"
        :style="{ 
          position: 'absolute', 
          top: `${getItemPosition(item)}px`,
          left: 0,
          right: 0,
        }"
      >
        <slot name="item" :item="item.data" :index="item.index"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
interface Props {
  items: T[]
  itemHeight: number
  containerHeight?: string
  overscan?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  containerHeight: '600px',
  overscan: 5,
  keyField: 'id',
})

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

// Total height of all items
const totalHeight = computed(() => props.items.length * props.itemHeight)

// Calculate which items should be visible based on scroll position
const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight)
  const visibleCount = Math.ceil((containerRef.value?.clientHeight || 600) / props.itemHeight)
  
  return {
    start: Math.max(0, start - props.overscan),
    end: Math.min(props.items.length, start + visibleCount + props.overscan),
  }
})

// Items to actually render
const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end).map((item, idx) => ({
    data: item,
    index: start + idx,
  }))
})

// Get position for an item
const getItemPosition = (item: { index: number }) => {
  return item.index * props.itemHeight
}

// Get unique key for an item
const getItemKey = (item: { data: any, index: number }) => {
  if (props.keyField && typeof item.data === 'object' && item.data[props.keyField]) {
    return item.data[props.keyField]
  }
  return item.index
}

// Handle scroll events
const handleScroll = () => {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll)
  }
})
</script>

