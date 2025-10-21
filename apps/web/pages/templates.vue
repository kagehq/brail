<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Templates</h1>
          <p class="text-gray-500 text-sm">Pre-built sites ready to deploy. Perfect for quick starts and prototypes.</p>
        </div>
        <NuxtLink
          to="/sites"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/20 rounded-lg hover:text-white hover:border-gray-500/40 transition"
        >
          ← Back to Sites
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
          <div class="h-48 bg-gray-500/20 rounded-lg mb-4"></div>
          <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-3"></div>
          <div class="h-4 bg-gray-500/15 rounded w-full mb-4"></div>
          <div class="h-8 bg-gray-500/10 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-gray-500/5 border border-gray-500/20 rounded-xl p-6">
        <p class="text-gray-400">{{ error }}</p>
      </div>

      <!-- Templates Grid -->
      <div v-else>
        <!-- Category Filters -->
        <div class="mb-6 flex gap-2 flex-wrap">
          <button
            @click="selectedCategory = null"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold transition',
              selectedCategory === null
                ? 'bg-blue-300 text-black'
                : 'bg-gray-500/10 text-gray-300 border border-gray-500/20 hover:text-white hover:border-gray-500/40'
            ]"
          >
            All
          </button>
          <button
            v-for="category in categories"
            :key="category"
            @click="selectedCategory = category"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold transition capitalize',
              selectedCategory === category
                ? 'bg-blue-300 text-black'
                : 'bg-gray-500/10 text-gray-300 border border-gray-500/20 hover:text-white hover:border-gray-500/40'
            ]"
          >
            {{ category }}
          </button>
        </div>

        <!-- Templates -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(template, index) in filteredTemplates"
            :key="template.id"
            class="group bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl hover:border-gray-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 cursor-pointer animate-fade-in"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="selectedTemplate = template"
          >
            <!-- Preview Image Placeholder -->
            <div class="h-48 bg-gradient-to-br from-blue-300/20 to-purple-300/20 border-b border-gray-500/20 flex items-center justify-center">
              <div class="text-6xl">{{ getTemplateIcon(template.id) }}</div>
            </div>

            <!-- Content -->
            <div class="p-6">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">{{ template.name }}</h3>
                <span class="px-2 py-1 border border-gray-500/30 text-gray-500 text-xs uppercase tracking-wide rounded-lg">
                  {{ template.category }}
                </span>
              </div>

              <p class="text-gray-400 text-sm mb-4">{{ template.description }}</p>

              <!-- Tech Stack -->
              <div class="flex gap-2 flex-wrap mb-4">
                <span
                  v-for="tech in template.tech"
                  :key="tech"
                  class="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded border border-gray-500/20"
                >
                  {{ tech }}
                </span>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">{{ template.buildRequired ? '🔨 Build Required' : '⚡ No Build' }}</span>
                <span class="text-blue-300 font-medium group-hover:text-blue-200 transition-colors">
                  Use Template →
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredTemplates.length === 0" class="text-center py-20">
          <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
            <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-gray-400">No templates found in this category.</p>
        </div>
      </div>
    </div>

    <!-- Template Details Modal -->
    <div
      v-if="selectedTemplate"
      class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      @click.self="selectedTemplate = null"
    >
      <div class="bg-black border border-gray-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold text-white">{{ selectedTemplate.name }}</h2>
            <button
              @click="selectedTemplate = null"
              class="text-gray-400 hover:text-gray-200 transition"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <p class="text-gray-400 mb-6">{{ selectedTemplate.description }}</p>

          <!-- Details -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span class="text-sm font-semibold text-gray-500">Category</span>
              <p class="capitalize text-white">{{ selectedTemplate.category }}</p>
            </div>
            <div>
              <span class="text-sm font-semibold text-gray-500">Author</span>
              <p class="text-white">{{ selectedTemplate.author }}</p>
            </div>
            <div>
              <span class="text-sm font-semibold text-gray-500">Version</span>
              <p class="text-white">{{ selectedTemplate.version }}</p>
            </div>
            <div>
              <span class="text-sm font-semibold text-gray-500">Build Required</span>
              <p class="text-white">{{ selectedTemplate.buildRequired ? 'Yes' : 'No' }}</p>
            </div>
          </div>

          <!-- Tech Stack -->
          <div class="mb-6">
            <span class="text-sm font-semibold text-gray-500 block mb-2">Technologies</span>
            <div class="flex gap-2 flex-wrap">
              <span
                v-for="tech in selectedTemplate.tech"
                :key="tech"
                class="px-3 py-1 bg-gray-500/20 text-gray-300 text-sm rounded border border-gray-500/20"
              >
                {{ tech }}
              </span>
            </div>
          </div>

          <!-- Variables -->
          <div v-if="selectedTemplate.variables && selectedTemplate.variables.length > 0" class="mb-6">
            <span class="text-sm font-semibold text-gray-500 block mb-2">Customization Options</span>
            <form @submit.prevent="deployTemplate" class="space-y-3">
              <div v-for="variable in selectedTemplate.variables" :key="variable.key">
                <label class="block text-sm font-medium text-gray-400 mb-1">
                  {{ variable.label }}
                  <span v-if="variable.required" class="text-red-400">*</span>
                </label>
                <input
                  v-model="templateVariables[variable.key]"
                  type="text"
                  :placeholder="variable.default"
                  :required="variable.required"
                  class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-gray-500"
                />
                <p class="text-xs text-gray-500 mt-1">{{ variable.description }}</p>
              </div>
            </form>
          </div>

          <!-- Site Name -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-400 mb-1">
              Site Name <span class="text-red-400">*</span>
            </label>
            <input
              v-model="siteName"
              type="text"
              placeholder="my-awesome-site"
              required
              class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white placeholder-gray-500"
            />
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              @click="deployTemplate"
              :disabled="deploying || !siteName"
              class="flex-1 bg-blue-300 text-black px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ deploying ? 'Deploying...' : 'Deploy Template' }}
            </button>
            <button
              @click="selectedTemplate = null"
              class="px-6 py-3 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/10 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const router = useRouter();
const config = useRuntimeConfig();
const api = useApi();
const { showToast } = useToast();

const user = ref<any>(null);

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  tech: string[];
  buildRequired: boolean;
  preview?: string;
  variables?: Array<{
    key: string;
    label: string;
    description: string;
    default: string;
    required: boolean;
  }>;
  adapters?: {
    recommended: string[];
    supported: string | string[];
  };
}

const templates = ref<Template[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedCategory = ref<string | null>(null);
const selectedTemplate = ref<Template | null>(null);
const templateVariables = ref<Record<string, string>>({});
const siteName = ref('');
const deploying = ref(false);

const categories = computed(() => {
  const cats = new Set(templates.value.map(t => t.category));
  return Array.from(cats).sort();
});

const filteredTemplates = computed(() => {
  if (!selectedCategory.value) return templates.value;
  return templates.value.filter(t => t.category === selectedCategory.value);
});

function getTemplateIcon(templateId: string): string {
  const icons: Record<string, string> = {
    'landing-page': '🚀',
    'portfolio': '🎨',
    'blog': '📝',
    'docs': '📚',
    'coming-soon': '⏰',
  };
  return icons[templateId] || '📄';
}

async function loadTemplates() {
  try {
    loading.value = true;
    error.value = null;
    templates.value = await api.fetch('/v1/templates');
  } catch (err: any) {
    error.value = err.message || 'Failed to load templates';
  } finally {
    loading.value = false;
  }
}

async function deployTemplate() {
  if (!selectedTemplate.value || !siteName.value) return;

  try {
    deploying.value = true;

    const result = await api.fetch(`/v1/templates/${selectedTemplate.value.id}/deploy`, {
      method: 'POST',
      body: JSON.stringify({
        siteName: siteName.value,
        variables: templateVariables.value,
      }),
    });

    showToast({
      type: 'success',
      message: `Template "${selectedTemplate.value.name}" deployed successfully!`,
    });

    // Navigate to the new site
    router.push(`/sites/${result.site.id}`);
  } catch (err: any) {
    showToast({
      type: 'error',
      message: err.message || 'Failed to deploy template',
    });
  } finally {
    deploying.value = false;
  }
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
  
  loadTemplates();
});
</script>

