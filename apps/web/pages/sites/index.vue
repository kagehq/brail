<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Your Sites</h1>
          <p class="text-gray-500 text-sm">Manage and deploy your static sites</p>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/templates"
            class="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/30 rounded-lg hover:text-white hover:border-gray-500/50 transition-all"
          >
            Templates
          </NuxtLink>
          <NuxtLink
            to="/adapter-builder"
            class="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/30 rounded-lg hover:text-white hover:border-gray-500/50 transition-all"
          >
            Build Adapter
          </NuxtLink>
          <NuxtLink
            to="/adapters"
            class="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/30 rounded-lg hover:text-white hover:border-gray-500/50 transition-all"
          >
            Adapter Catalog
          </NuxtLink>
          <NuxtLink
            to="/settings/team"
            class="px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/30 rounded-lg hover:text-white hover:border-gray-500/50 transition-all"
          >
            Team Access
          </NuxtLink>
          <button
            @click="showCreateModal = true"
            class="bg-blue-300 text-sm font-semibold text-black px-5 py-2.5 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 hover:scale-105 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Create Site
          </button>
        </div>
      </div>
      
      <!-- Loading Skeleton -->
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse-slow">
          <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-3"></div>
          <div class="h-4 bg-gray-500/15 rounded w-1/2 mb-4"></div>
          <div class="h-6 bg-gray-500/10 rounded w-16"></div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="sites.length === 0" class="text-center py-20 animate-fade-in">
        <div class="max-w-md mx-auto">
          <!-- Icon -->
          <div class="mb-6 flex justify-center">
            <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-semibold text-white mb-2">No sites yet</h3>
          <p class="text-gray-400 mb-6">Get started by creating your first deployment site</p>
          <button
            @click="showCreateModal = true"
            class="bg-blue-300 text-black text-sm font-medium px-6 py-3 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20"
          >
            Create Your First Site
          </button>
        </div>
      </div>
      
      <!-- Sites Grid -->
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(site, index) in sites"
          :key="site.id"
          :to="`/sites/${site.id}`"
          class="group relative bg-gradient-to-b from-gray-500/10 to-gray-500/5 border border-gray-500/20 p-6 rounded-xl hover:border-gray-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 animate-fade-in"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- Glow effect on hover -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-300/0 to-blue-300/0 group-hover:from-blue-300/5 group-hover:to-transparent rounded-xl transition-all duration-300"></div>
          
          <div class="relative">
            <!-- Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <h3 class="text-xl font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors truncate">
                  {{ site.name }}
                </h3>
                <p class="text-xs text-gray-500 font-mono truncate">{{ site.id }}</p>
              </div>
              
              <!-- Arrow icon -->
              <div class="text-gray-500 group-hover:text-blue-300 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            
            <!-- Status and Meta -->
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div v-if="site.activeDeployId" class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-300/10 border border-green-300/20 text-green-300 rounded-lg font-medium">
                  <span class="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                  Active
                </div>
                <div v-else class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-500/10 border border-gray-500/20 text-gray-400 rounded-lg">
                  <span class="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                  No deploys
                </div>
              </div>
              
              <!-- Last Updated -->
              <div class="flex items-center gap-1.5 text-xs text-gray-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Updated {{ formatRelativeTime(site.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
    
    <!-- Create Site Modal -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showCreateModal = false"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-150"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="showCreateModal" class="bg-black border border-gray-500/30 p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <h3 class="text-2xl font-bold mb-2 text-white">Create New Site</h3>
            <p class="text-gray-400 text-sm mb-6">Deploy your static site in seconds</p>
            
            <form @submit.prevent="handleCreate">
              <div class="mb-6">
                <label class="block text-sm font-semibold text-gray-300 mb-2">
                  Site Name
                </label>
                <input
                  v-model="newSiteName"
                  type="text"
                  required
                  autofocus
                  class="w-full px-4 py-3 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600"
                  placeholder="my-awesome-site"
                />
              </div>
              
              <div class="flex gap-3">
                <button
                  type="submit"
                  :disabled="creating"
                  class="flex-1 bg-blue-300 text-sm font-semibold text-black py-3 px-4 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ creating ? 'Creating...' : 'Create Site' }}
                </button>
                <button
                  type="button"
                  @click="showCreateModal = false"
                  class="flex-1 bg-gray-500/10 text-sm font-semibold text-gray-300 hover:text-white border border-gray-500/20 py-3 px-4 rounded-lg hover:bg-gray-500/20 hover:border-gray-500/30 transition-all"
                >
                  Cancel
                </button>
              </div>
              
              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 translate-y-2"
              >
                <div v-if="createError" class="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-start gap-2">
                  <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  <span>{{ createError }}</span>
                </div>
              </Transition>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Site } from '@br/shared';

const api = useApi();
const router = useRouter();

const user = ref<any>(null);
const sites = ref<Site[]>([]);
const loading = ref(true);
const showCreateModal = ref(false);
const newSiteName = ref('');
const creating = ref(false);
const createError = ref('');

let isLoading = false;

onMounted(async () => {
  // Prevent multiple simultaneous loads
  if (isLoading) return;
  isLoading = true;
  
  try {
    // Check if user is authenticated
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      await router.push('/login');
      return;
    }
    
    user.value = await response.json();
    
    // Load sites
    try {
      sites.value = await api.listSites();
    } catch (siteError: any) {
      console.error('Failed to load sites:', siteError);
      // If sites load fails due to auth, redirect to login
      if (siteError.message?.includes('Unauthorized') || siteError.message?.includes('401')) {
        await router.push('/login');
      }
    }
  } catch (error) {
    console.error('Failed to authenticate:', error);
    await router.push('/login');
  } finally {
    loading.value = false;
    isLoading = false;
  }
});

const handleCreate = async () => {
  const toast = useToast();
  creating.value = true;
  createError.value = '';
  
  try {
    const site = await api.createSite({ name: newSiteName.value });
    toast.success('Site Created', `Site "${newSiteName.value}" has been created successfully.`);
    showCreateModal.value = false;
    newSiteName.value = '';
    
    // Navigate to the site page
    await router.push(`/sites/${site.id}`);
  } catch (err: any) {
    createError.value = err.message || 'Failed to create site';
    toast.apiError(err);
  } finally {
    creating.value = false;
  }
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
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};
</script>
