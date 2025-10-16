<template>
  <div class="bg-black border border-gray-500/25 rounded-lg shadow-lg overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-500/25 p-4 flex items-center justify-between">
      <div class="">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold text-white">Deployment Logs</h3>
          <span
            v-if="connected"
            class="flex items-center gap-2 text-xs text-green-300"
          >
            <span class="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
        <div class="text-gray-500 text-xs">Logs: {{ deployId }}</div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Filter Dropdown -->
        <div class="relative">
          <button
            @click="showLevelDropdown = !showLevelDropdown"
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/25 rounded-lg text-sm text-white hover:bg-gray-500/15 transition"
          >
            <span>{{ levelFilterLabel }}</span>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div
            v-if="showLevelDropdown"
            @click.stop
            class="absolute right-0 mt-2 w-48 bg-black border border-gray-500/25 rounded-lg shadow-lg z-50 py-1"
          >
            <button
              v-for="option in levelOptions"
              :key="option.value"
              @click="selectLevel(option.value)"
              class="w-full text-left px-4 py-2 text-sm hover:bg-gray-500/15 transition"
              :class="levelFilter === option.value ? 'text-blue-300 bg-gray-500/15' : 'text-gray-400'"
            >
              <div class="flex items-center justify-between">
                <span>{{ option.label }}</span>
                <svg 
                  v-if="levelFilter === option.value" 
                  class="w-4 h-4 text-blue-300" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </button>
          </div>
          
          <!-- Backdrop to close dropdown -->
          <div
            v-if="showLevelDropdown"
            class="fixed inset-0 z-40"
            @click="showLevelDropdown = false"
          ></div>
        </div>
        
        <!-- Auto-scroll toggle -->
        <button
          @click="autoScroll = !autoScroll"
          class="px-3 py-2 text-xs rounded-lg border"
          :class="autoScroll 
            ? 'bg-blue-300/10 border border-blue-300/25 rounded-lg text-blue-300' 
            : 'bg-gray-500/10 border border-gray-500/25 rounded-lg text-gray-400'"
        >
          {{ autoScroll ? 'Auto-scroll' : 'Paused' }}
        </button>
        
        <!-- Clear button -->
        <button
          @click="clearLogs"
          class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-400 hover:text-white rounded-lg text-xs"
        >
          Clear
        </button>
        <button
          @click="$emit('close')"
          class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-400 hover:text-white rounded-lg text-xs"
        >
          Close
        </button>
      </div>
    </div>
    
    <!-- Logs container -->
    <div
      ref="logsContainer"
      class="bg-black overflow-y-auto font-mono text-xs leading-relaxed"
      style="height: 500px; max-height: 500px"
    >
     <!-- Search -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search logs..."
        class="px-3 py-2.5 bg-gray-500/10 w-full border border-t-0 border-x-0 border-gray-500/25 text-sm text-white placeholder-gray-500"
      />
      <div v-if="filteredLogs.length === 0" class="text-gray-500 text-center px-4 py-8">
        <div v-if="loading">Loading logs...</div>
        <div v-else-if="searchQuery || levelFilter !== 'all'">
          No logs match your filters
        </div>
        <div v-else>No logs yet</div>
      </div>
      
      <div class="px-4 py-2">
        <div
          v-for="(log, index) in filteredLogs"
          :key="log.id || index"
          class="py-1 hover:bg-gray-900/50 transition"
        >
          <div class="flex items-start gap-3">
            <span class="text-gray-600 shrink-0">
              {{ formatTime(log.timestamp) }}
            </span>
            
            <span
              class="shrink-0 font-medium uppercase"
              :class="getLevelClass(log.level)"
            >
              {{ getLevelLabel(log.level) }}
            </span>
            
            <span class="text-gray-300 break-all">
              {{ log.message }}
            </span>
          </div>
          
          <div v-if="log.metadata" class="ml-24 mt-1 text-gray-500 text-xs">
            {{ formatMetadata(log.metadata) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { io, Socket } from 'socket.io-client';

const props = defineProps<{
  deployId: string;
  autoConnect?: boolean;
}>();

defineEmits<{
  close: [];
}>();

const config = useRuntimeConfig();
const api = useApi();

// State
const logs = ref<any[]>([]);
const loading = ref(true);
const connected = ref(false);
const autoScroll = ref(true);
const levelFilter = ref('all');
const searchQuery = ref('');
const logsContainer = ref<HTMLElement | null>(null);
const showLevelDropdown = ref(false);

let socket: Socket | null = null;

// Level filter options
const levelOptions = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warnings' },
  { value: 'error', label: 'Errors' },
  { value: 'debug', label: 'Debug' },
];

// Computed
const levelFilterLabel = computed(() => {
  const option = levelOptions.find(opt => opt.value === levelFilter.value);
  return option?.label || 'All Levels';
});

const filteredLogs = computed(() => {
  let filtered = logs.value;
  
  // Filter by level
  if (levelFilter.value !== 'all') {
    filtered = filtered.filter(log => log.level === levelFilter.value);
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(query) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query))
    );
  }
  
  return filtered;
});

// Methods
const selectLevel = (value: string) => {
  levelFilter.value = value;
  showLevelDropdown.value = false;
};

const loadLogs = async () => {
  loading.value = true;
  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/deploys/${props.deployId}/logs?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
        },
      }
    );
    
    if (response.ok) {
      logs.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to load logs:', error);
  } finally {
    loading.value = false;
  }
};

const connectWebSocket = () => {
  if (socket) return;
  
  const apiUrl = config.public.apiUrl.replace(/^http/, 'ws');
  socket = io(`${apiUrl}/logs`, {
    auth: { token: api.getToken() },
    transports: ['websocket'],
  });
  
  socket.on('connect', () => {
    connected.value = true;
    socket?.emit('subscribe-deploy', props.deployId);
  });
  
  socket.on('log', (log: any) => {
    logs.value.push(log);
    
    if (autoScroll.value) {
      scrollToBottom();
    }
  });
  
  socket.on('status', (status: any) => {
    logs.value.push({
      id: `status-${Date.now()}`,
      level: status.status === 'success' ? 'info' : status.status === 'failed' ? 'error' : 'warn',
      message: `Status: ${status.status}${status.message ? ' - ' + status.message : ''}`,
      timestamp: new Date(),
    });
    
    if (autoScroll.value) {
      scrollToBottom();
    }
  });
  
  socket.on('disconnect', () => {
    connected.value = false;
  });
};

const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected.value = false;
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
  }
};

const clearLogs = () => {
  logs.value = [];
};

const formatTime = (timestamp: Date | string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

const getLevelClass = (level: string) => {
  const classes: Record<string, string> = {
    info: 'text-blue-300',
    warn: 'text-yellow-300',
    error: 'text-red-500',
    debug: 'text-gray-500',
  };
  return classes[level] || 'text-gray-400';
};

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    info: 'INFO ',
    warn: 'WARN ',
    error: 'ERROR',
    debug: 'DEBUG',
  };
  return labels[level] || level.toUpperCase();
};

const formatMetadata = (metadata: any) => {
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      return metadata;
    }
  }
  return JSON.stringify(metadata, null, 2);
};

// Lifecycle
onMounted(async () => {
  await loadLogs();
  
  if (props.autoConnect !== false) {
    connectWebSocket();
  }
  
  scrollToBottom();
});

onBeforeUnmount(() => {
  disconnectWebSocket();
});

// Watch for auto-scroll changes
watch(autoScroll, (value) => {
  if (value) {
    scrollToBottom();
  }
});

defineExpose({
  loadLogs,
  connectWebSocket,
  disconnectWebSocket,
});
</script>

