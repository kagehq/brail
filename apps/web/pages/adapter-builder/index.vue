<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Adapter Builder</h1>
          <p class="text-gray-500 text-sm">Create custom deployment adapters for any platform. No CLI required.</p>
        </div>
        <NuxtLink
          to="/sites"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/20 rounded-lg hover:text-white hover:border-gray-500/40 transition"
        >
          ← Back to Sites
        </NuxtLink>
      </div>

      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-500/20">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'projects'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition',
              activeTab === 'projects'
                ? 'border-blue-300 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500/40'
            ]"
          >
            My Adapters
          </button>
          <button
            @click="activeTab = 'create'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition',
              activeTab === 'create'
                ? 'border-blue-300 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500/40'
            ]"
          >
            Create New
          </button>
          <button
            @click="activeTab = 'templates'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition',
              activeTab === 'templates'
                ? 'border-blue-300 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500/40'
            ]"
          >
            Templates
          </button>
        </nav>
      </div>

      <!-- My Adapters Tab -->
      <div v-if="activeTab === 'projects'">
        <div v-if="loadingProjects" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
            <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-4"></div>
            <div class="h-4 bg-gray-500/15 rounded w-full mb-4"></div>
            <div class="h-6 bg-gray-500/10 rounded w-16"></div>
          </div>
        </div>

        <div v-else-if="projects.length === 0" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-500/10 border border-gray-500/20 rounded-2xl mb-4">
            <svg class="w-8 h-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">No Adapters Yet</h3>
          <p class="text-gray-400 mb-6">Create your first custom adapter to deploy to any platform.</p>
          <button
            @click="activeTab = 'create'"
            class="bg-blue-300 text-black px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
          >
            Create Adapter
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(project, index) in projects"
            :key="project.id"
            class="group bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl hover:border-gray-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 cursor-pointer animate-fade-in"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="editProject(project.id)"
          >
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">{{ project.displayName }}</h3>
                <span
                  :class="[
                    'px-2 py-1 text-xs font-semibold rounded border',
                    project.status === 'published' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    project.status === 'testing' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  ]"
                >
                  {{ project.status }}
                </span>
              </div>
              <p class="text-gray-400 text-sm mb-4">{{ project.description }}</p>
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">v{{ project.version }}</span>
                <span class="text-blue-300 font-medium group-hover:text-blue-200 transition-colors">Edit →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create New Tab -->
      <div v-if="activeTab === 'create'">
        <div class="max-w-3xl mx-auto bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-8">
          <h2 class="text-2xl font-bold text-white mb-6">Create New Adapter</h2>

          <form @submit.prevent="createAdapter" class="space-y-6">
            <!-- Step 1: Basic Info -->
            <div v-if="wizardStep === 1">
              <h3 class="text-lg font-semibold text-white mb-4">1. Basic Information</h3>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">
                    Adapter Name <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="newAdapter.name"
                    type="text"
                    placeholder="my-platform"
                    required
                    pattern="[a-z0-9-]+"
                    class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-gray-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">
                    Display Name <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="newAdapter.displayName"
                    type="text"
                    placeholder="My Platform"
                    required
                    class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">
                    Description <span class="text-red-400">*</span>
                  </label>
                  <textarea
                    v-model="newAdapter.description"
                    rows="3"
                    placeholder="Deploy to my custom platform"
                    required
                    class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-400 mb-1">
                    Category
                  </label>
                  <select
                    v-model="newAdapter.category"
                    class="w-full px-4 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white"
                  >
                    <option value="platform">Platform</option>
                    <option value="storage">Storage</option>
                    <option value="server">Server</option>
                    <option value="container">Container</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div class="mt-6 flex justify-end">
                <button
                  type="button"
                  @click="wizardStep = 2"
                  class="bg-blue-300 text-black px-6 py-2 rounded-lg font-semibold hover:bg-blue-400 transition"
                >
                  Next →
                </button>
              </div>
            </div>

            <!-- Step 2: Configuration -->
            <div v-if="wizardStep === 2">
              <h3 class="text-lg font-semibold text-white mb-4">2. Configuration</h3>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-400 mb-2">
                  What type of authentication does your platform use?
                </label>
                <div class="space-y-2">
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.authType" type="radio" value="apiKey" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">API Key</div>
                      <div class="text-sm text-gray-400">Single API key for authentication</div>
                    </div>
                  </label>
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.authType" type="radio" value="token" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">Bearer Token</div>
                      <div class="text-sm text-gray-400">OAuth or JWT bearer token</div>
                    </div>
                  </label>
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.authType" type="radio" value="credentials" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">Username & Password</div>
                      <div class="text-sm text-gray-400">Traditional credentials</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">
                  How does deployment work?
                </label>
                <div class="space-y-2">
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.deploymentType" type="radio" value="api" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">REST API</div>
                      <div class="text-sm text-gray-400">Upload files via HTTP API</div>
                    </div>
                  </label>
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.deploymentType" type="radio" value="storage" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">Storage (S3, FTP, etc.)</div>
                      <div class="text-sm text-gray-400">Upload files to storage service</div>
                    </div>
                  </label>
                  <label class="flex items-center p-3 border border-gray-500/30 rounded-lg cursor-pointer hover:bg-gray-500/10 transition">
                    <input v-model="newAdapter.deploymentType" type="radio" value="git" class="mr-3" />
                    <div>
                      <div class="font-medium text-white">Git Push</div>
                      <div class="text-sm text-gray-400">Push to Git repository</div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="mt-6 flex justify-between">
                <button
                  type="button"
                  @click="wizardStep = 1"
                  class="px-6 py-2 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/10 hover:text-white transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  :disabled="creating"
                  class="bg-blue-300 text-black px-6 py-2 rounded-lg font-semibold hover:bg-blue-400 transition disabled:opacity-50"
                >
                  {{ creating ? 'Creating...' : 'Create Adapter' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Templates Tab -->
      <div v-if="activeTab === 'templates'">
        <div v-if="loadingTemplates" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
            <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-4"></div>
            <div class="h-4 bg-gray-500/15 rounded w-full mb-4"></div>
            <div class="h-8 bg-gray-500/10 rounded"></div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(template, index) in templates"
            :key="template.id"
            class="group bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl hover:border-gray-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 animate-fade-in"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">{{ template.name }}</h3>
                <span
                  :class="[
                    'px-2 py-1 text-xs font-semibold rounded border',
                    template.difficulty === 'beginner' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    template.difficulty === 'intermediate' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/10 text-red-400 border-red-500/30'
                  ]"
                >
                  {{ template.difficulty }}
                </span>
              </div>
              <p class="text-gray-400 text-sm mb-4">{{ template.description }}</p>
              <div class="mb-4">
                <div class="text-xs font-semibold text-gray-500 mb-2">Features:</div>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="feature in template.features"
                    :key="feature"
                    class="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded border border-gray-500/20"
                  >
                    {{ feature }}
                  </span>
                </div>
              </div>
              <button
                @click="useTemplate(template)"
                class="w-full bg-blue-300 text-black py-2 rounded-lg font-semibold hover:bg-blue-400 transition"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const router = useRouter();
const config = useRuntimeConfig();
const api = useApi();
const { showToast } = useToast();

const user = ref<any>(null);
const activeTab = ref('projects');
const wizardStep = ref(1);
const projects = ref<any[]>([]);
const templates = ref<any[]>([]);
const loadingProjects = ref(true);
const loadingTemplates = ref(false);
const creating = ref(false);

const newAdapter = ref({
  name: '',
  displayName: '',
  description: '',
  category: 'custom',
  authType: 'apiKey',
  deploymentType: 'api',
});

async function loadProjects() {
  try {
    loadingProjects.value = true;
    projects.value = await api.fetch('/v1/adapter-builder/projects');
  } catch (error: any) {
    console.error('Failed to load projects:', error);
  } finally {
    loadingProjects.value = false;
  }
}

async function loadTemplates() {
  try {
    loadingTemplates.value = true;
    templates.value = await api.fetch('/v1/adapter-builder/templates');
  } catch (error: any) {
    console.error('Failed to load templates:', error);
  } finally {
    loadingTemplates.value = false;
  }
}

async function createAdapter() {
  try {
    creating.value = true;

    const project = await api.fetch('/v1/adapter-builder/generate', {
      method: 'POST',
      body: JSON.stringify({
        name: newAdapter.value.name,
        displayName: newAdapter.value.displayName,
        description: newAdapter.value.description,
        platform: newAdapter.value.category,
        authType: newAdapter.value.authType,
        deploymentType: newAdapter.value.deploymentType,
      }),
    });

    showToast({
      type: 'success',
      message: 'Adapter created successfully!',
    });

    router.push(`/adapter-builder/${project.id}`);
  } catch (error: any) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to create adapter',
    });
  } finally {
    creating.value = false;
  }
}

function editProject(projectId: string) {
  router.push(`/adapter-builder/${projectId}`);
}

function useTemplate(template: any) {
  // Pre-fill wizard with template
  newAdapter.value.category = template.category;
  activeTab.value = 'create';
}

onMounted(async () => {
  try {
    const meResponse = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });

    if (!meResponse.ok) {
      router.push('/login');
      return;
    }

    user.value = await meResponse.json();
  } catch (error) {
    console.error('Failed to load user:', error);
  }

  loadProjects();
  loadTemplates();
});
</script>

