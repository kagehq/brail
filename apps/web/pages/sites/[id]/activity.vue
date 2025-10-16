<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="activity"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-1">Activity Log</h1>
        <p class="text-gray-400 text-sm">Audit trail for {{ site?.name || 'this site' }}</p>
      </div>

      <!-- Filters -->
      <div class="bg-gradient-to-b from-gray-500/10 to-gray-500/5 border border-gray-500/25 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          <button
            v-if="filterAction || filterFrom || filterTo"
            @click="clearFilters"
            class="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        </div>
        
        <div class="grid md:grid-cols-3 gap-4">
          <!-- Action Filter -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-semibold text-gray-300 mb-2">
              <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Action Type
            </label>
            <div class="relative">
              <select
                v-model="filterAction"
                class="w-full bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/25 hover:border-gray-500/40 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all appearance-none cursor-pointer"
              >
                <option value="">All Actions</option>
                <optgroup label="Builds">
                  <option value="build">Build Events</option>
                  <option value="build.success">Build Success</option>
                  <option value="build.failed">Build Failed</option>
                </optgroup>
                <optgroup label="Deployments">
                  <option value="deploy.created">Deploy Created</option>
                  <option value="deploy.finalized">Deploy Finalized</option>
                  <option value="deploy.activated">Deploy Activated</option>
                  <option value="deploy.rollback">Deploy Rollback</option>
                  <option value="deploy.deleted">Deploy Deleted</option>
                </optgroup>
                <optgroup label="Sites">
                  <option value="site.created">Site Created</option>
                  <option value="site.deleted">Site Deleted</option>
                </optgroup>
              </select>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Date From -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-semibold text-gray-300 mb-2">
              <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              From Date
            </label>
            <input
              v-model="filterFrom"
              type="date"
              class="w-full bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/25 hover:border-gray-500/40 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all"
            />
          </div>

          <!-- Date To -->
          <div>
            <label class="flex items-center gap-1.5 text-sm font-semibold text-gray-300 mb-2">
              <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              To Date
            </label>
            <input
              v-model="filterTo"
              type="date"
              class="w-full bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/25 hover:border-gray-500/40 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all"
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3 animate-pulse-slow">
        <div v-for="i in 5" :key="i" class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-5">
          <div class="h-5 bg-gray-500/20 rounded w-1/3 mb-3"></div>
          <div class="h-4 bg-gray-500/15 rounded w-2/3"></div>
        </div>
      </div>

      <!-- Events List -->
      <div v-else-if="events.length > 0" class="space-y-3">
        <div
          v-for="(event, index) in events"
          :key="event.id"
          class="group bg-gradient-to-b from-gray-500/10 to-gray-500/5 border border-gray-500/20 hover:border-gray-500/40 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 animate-fade-in"
          :style="{ animationDelay: `${index * 30}ms` }"
        >
          <!-- Build Log Event -->
          <div v-if="event.type === 'build'" class="flex items-start gap-4">
            <!-- Icon -->
            <div :class="event.status === 'success' ? 'bg-green-300/10 border border-green-300/20' : 'bg-red-500/10 border border-red-500/20'" class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5" :class="event.status === 'success' ? 'text-green-300' : 'text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex-1 min-w-0">
                  <h3 class="text-white font-semibold mb-1 flex items-center gap-2">
                    <span>Build: {{ event.framework }}</span>
                    <span :class="event.status === 'success' ? 'bg-green-300/10 border border-green-300/20 text-green-300' : 'bg-red-500/10 border border-red-500/20 text-red-400'" class="px-2 py-0.5 rounded-md text-xs font-medium">
                      {{ event.status }}
                    </span>
                    <span v-if="event.warnings && event.warnings.length > 0" class="bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 px-2 py-0.5 rounded-md text-xs font-medium">
                      {{ event.warnings.length }} warning{{ event.warnings.length > 1 ? 's' : '' }}
                    </span>
                  </h3>
                  <p class="text-sm text-gray-400">{{ event.command }}</p>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ formatRelativeTime(event.createdAt) }}</span>
                </div>
              </div>
              
              <!-- Build Info -->
              <div class="flex flex-wrap gap-2 items-center mb-3">
                <div v-if="event.duration" class="px-2.5 py-1 bg-gray-500/10 border border-gray-500/20 rounded-lg text-xs">
                  <span class="text-gray-500">Duration:</span>
                  <span class="text-gray-300 ml-1">{{ event.duration }}ms</span>
                </div>
                <div v-if="event.deployId" class="px-2.5 py-1 bg-gray-500/10 border border-gray-500/20 rounded-lg text-xs font-mono">
                  <span class="text-gray-500">Deploy:</span>
                  <span class="text-gray-300 ml-1">{{ event.deployId.slice(0, 8) }}</span>
                </div>
                <button
                  @click="downloadBuildLog(event.id)"
                  class="px-2.5 py-1 bg-blue-300/10 border border-blue-300/20 text-blue-300 hover:bg-blue-300/20 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Log
                </button>
              </div>
              
              <!-- Warnings -->
              <div v-if="event.warnings && event.warnings.length > 0" class="bg-yellow-300/5 border border-yellow-300/20 rounded-lg p-3 mb-3">
                <div class="flex items-center gap-2 mb-2">
                  <svg class="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span class="text-sm font-semibold text-yellow-300">Build Warnings</span>
                </div>
                <ul class="space-y-1.5">
                  <li v-for="(warning, i) in event.warnings" :key="i" class="text-sm">
                    <span :class="warning.level === 'error' ? 'text-red-400' : 'text-yellow-300'">{{ warning.level === 'error' ? '✗' : '⚠' }}</span>
                    <span class="text-gray-300 ml-2">{{ warning.message }}</span>
                    <p v-if="warning.suggestion" class="text-gray-500 ml-5 mt-0.5 text-xs">→ {{ warning.suggestion }}</p>
                  </li>
                </ul>
              </div>
              
              <!-- Expandable Output (if there's stderr) -->
              <details v-if="event.stderr" class="bg-black/40 border border-gray-500/20 rounded-lg">
                <summary class="px-3 py-2 cursor-pointer text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Build Errors
                </summary>
                <pre class="px-3 py-2 text-xs text-red-400 overflow-x-auto">{{ event.stderr }}</pre>
              </details>
            </div>
          </div>

          <!-- Audit Event -->
          <div v-else class="flex items-start gap-4">
            <!-- Icon -->
            <div :class="getActionIconClass(event.action)" class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
              <component :is="getActionIcon(event.action)" class="w-5 h-5" />
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div class="flex-1 min-w-0">
                  <h3 class="text-white font-semibold mb-1 flex items-center gap-2">
                    <span>{{ formatActionTitle(event.action) }}</span>
                    <span :class="getActionBadgeClass(event.action)" class="px-2 py-0.5 rounded-md text-xs font-medium">
                      {{ event.action }}
                    </span>
                  </h3>
                  <p class="text-sm text-gray-400">
                    <span v-if="event.userEmail">by {{ event.userEmail }}</span>
                    <span v-if="event.country" :class="{ 'ml-2': event.userEmail }">{{ event.userEmail ? '•' : '' }} {{ event.country }}</span>
                  </p>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ formatRelativeTime(event.createdAt) }}</span>
                </div>
              </div>
              
              <!-- Meta Info -->
              <div class="flex flex-wrap gap-2 items-center">
                <div v-if="event.deployId" class="flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/10 border border-gray-500/20 rounded-lg text-xs font-mono">
                  <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span class="text-gray-500">Deploy:</span>
                  <span class="text-gray-300">{{ event.deployId.slice(0, 8) }}</span>
                </div>
                
                <div v-if="event.meta && Object.keys(event.meta).length > 0" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="[key, value] in Object.entries(event.meta).slice(0, 4)"
                    :key="key"
                    class="px-2 py-1 bg-blue-300/10 border border-blue-300/20 text-blue-300 rounded-md text-xs font-medium"
                  >
                    {{ formatMetaValue(key, value) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-20">
        <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
          <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-gray-400 mb-2">No activity found</p>
        <p class="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { formatBytes } from '@br/shared';

const route = useRoute();
const api = useApi();
const config = useRuntimeConfig();

const siteId = route.params.id as string;
const user = ref<any>(null);
const site = ref<any>(null);
const events = ref<any[]>([]);
const buildLogs = ref<any[]>([]);
const loading = ref(true);

const filterAction = ref('');
const filterFrom = ref('');
const filterTo = ref('');

const expandedLogs = ref<Set<string>>(new Set());

const breadcrumbItems = computed(() => [
  { label: 'Sites', to: '/sites' },
  { label: site.value?.name || 'Site', to: `/sites/${siteId}` },
  { label: 'Activity', to: `/sites/${siteId}/activity` },
]);

const loadEvents = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filterAction.value) params.append('action', filterAction.value);
    if (filterFrom.value) params.append('from', new Date(filterFrom.value).toISOString());
    if (filterTo.value) params.append('to', new Date(filterTo.value).toISOString());

    // Fetch audit events
    const auditResponse = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/audit?${params}`, {
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
      },
      credentials: 'include',
    });

    let auditEvents: any[] = [];
    if (auditResponse.ok) {
      auditEvents = await auditResponse.json();
    }

    // Fetch build logs
    const buildLogsResponse = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/build-logs?limit=50`, {
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
      },
      credentials: 'include',
    });

    if (buildLogsResponse.ok) {
      buildLogs.value = await buildLogsResponse.json();
    }

    // Combine and sort by date
    let combined = [
      ...auditEvents.map(e => ({ ...e, type: 'audit' })),
      ...buildLogs.value.map(b => ({ ...b, type: 'build', createdAt: b.startedAt }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply build filters
    if (filterAction.value.startsWith('build')) {
      if (filterAction.value === 'build') {
        combined = combined.filter(e => e.type === 'build');
      } else if (filterAction.value === 'build.success') {
        combined = combined.filter(e => e.type === 'build' && e.status === 'success');
      } else if (filterAction.value === 'build.failed') {
        combined = combined.filter(e => e.type === 'build' && e.status === 'failed');
      }
    }

    events.value = combined;
  } catch (error) {
    console.error('Failed to load activity:', error);
  } finally {
    loading.value = false;
  }
};

// Watch filters and reload
watch([filterAction, filterFrom, filterTo], () => {
  loadEvents();
});

const clearFilters = () => {
  filterAction.value = '';
  filterFrom.value = '';
  filterTo.value = '';
};

onMounted(async () => {
  try {
    // Check if user is authenticated
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      useRouter().push('/login');
      return;
    }

    user.value = await response.json();
    site.value = await api.getSite(siteId);
    await loadEvents();
  } catch (error) {
    console.error('Failed to load:', error);
  }
});

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleString();
};

const formatRelativeTime = (date: string | Date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(date);
};

const formatActionTitle = (action: string) => {
  const titles: Record<string, string> = {
    'deploy.created': 'Deployment Created',
    'deploy.finalized': 'Deployment Finalized',
    'deploy.activated': 'Deployment Activated',
    'deploy.rollback': 'Deployment Rolled Back',
    'deploy.deleted': 'Deployment Deleted',
    'site.created': 'Site Created',
    'site.deleted': 'Site Deleted',
  };
  return titles[action] || action;
};

const getActionBadgeClass = (action: string) => {
  if (action.includes('created')) {
    return 'bg-blue-300/10 border border-blue-300/20 text-blue-300';
  } else if (action.includes('activated')) {
    return 'bg-green-300/10 border border-green-300/20 text-green-300';
  } else if (action.includes('deleted')) {
    return 'bg-red-400/10 border border-red-400/20 text-red-400';
  } else if (action.includes('rollback')) {
    return 'bg-yellow-300/10 border border-yellow-300/20 text-yellow-300';
  } else {
    return 'bg-gray-500/10 border border-gray-500/20 text-gray-400';
  }
};

const getActionIconClass = (action: string) => {
  if (action.includes('created')) {
    return 'bg-blue-300/10 border border-blue-300/20 text-blue-300';
  } else if (action.includes('activated')) {
    return 'bg-green-300/10 border border-green-300/20 text-green-300';
  } else if (action.includes('deleted')) {
    return 'bg-red-400/10 border border-red-400/20 text-red-400';
  } else if (action.includes('rollback')) {
    return 'bg-yellow-300/10 border border-yellow-300/20 text-yellow-300';
  } else {
    return 'bg-gray-500/10 border border-gray-500/20 text-gray-400';
  }
};

const getActionIcon = (action: string) => {
  return h('svg', {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    class: 'w-5 h-5'
  }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '2',
      d: action.includes('created') ? 'M12 4v16m8-8H4' :
         action.includes('activated') ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' :
         action.includes('deleted') ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' :
         action.includes('rollback') ? 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' :
         'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    })
  ]);
};

const formatMetaValue = (key: string, value: any): string => {
  // Format fileCount
  if (key === 'fileCount') {
    const count = parseInt(value);
    return `${count} ${count === 1 ? 'file' : 'files'}`;
  }
  
  // Format byteSize
  if (key === 'byteSize') {
    return formatBytes(parseInt(value));
  }
  
  // Format duration (if in milliseconds)
  if (key === 'duration' && typeof value === 'number') {
    if (value < 1000) return `${value}ms`;
    if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
    return `${(value / 60000).toFixed(1)}m`;
  }
  
  // Default: show key: value
  return `${key}: ${value}`;
};

const downloadBuildLog = async (buildLogId: string) => {
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/build-logs/${buildLogId}/download`, {
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
      },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-${buildLogId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error('Failed to download build log:', error);
    useToast().error('Download Failed', error.message);
  }
};
</script>

