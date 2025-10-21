<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="env"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-1">Environment Variables</h1>
        <p class="text-gray-400 text-sm">Manage environment variables for builds and deployments</p>
      </div>

      

      <!-- Actions Bar -->
      <div class="flex items-center justify-between mb-6">
        <!-- Scope Selector -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">Scope - <span class="text-gray-500 text-xs">{{ selectedScopeDescription }}</span></label>
          <div class="relative max-w-[14rem]">
            <select
              v-model="selectedScope"
              class="w-full bg-gray-500/10 hover:bg-gray-500/15 border border-gray-500/25 hover:border-gray-500/40 text-white rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all appearance-none cursor-pointer"
            >
              <optgroup label="Build & Runtime">
                <option value="build">Build</option>
                <option value="runtime:preview">Runtime (Preview)</option>
                <option value="runtime:production">Runtime (Production)</option>
              </optgroup>
              <optgroup label="Platform Adapters">
                <option value="adapter:vercel">Vercel</option>
                <option value="adapter:cloudflare-pages">Cloudflare Pages</option>
                <option value="adapter:cloudflare-workers">Cloudflare Workers</option>
                <option value="adapter:cloudflare-sandbox">Cloudflare Sandbox</option>
                <option value="adapter:vercel-sandbox">Vercel Sandbox</option>
                <option value="adapter:netlify">Netlify</option>
                <option value="adapter:railway">Railway</option>
                <option value="adapter:fly">Fly.io</option>
                <option value="adapter:render">Render</option>
                <option value="adapter:s3">S3</option>
                <option value="adapter:github-pages">GitHub Pages</option>
                <option value="adapter:ftp">FTP</option>
                <option value="adapter:ssh-rsync">SSH/Rsync</option>
              </optgroup>
              <optgroup label="Other">
                <option value="ssh-agent">SSH Agent</option>
              </optgroup>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <!-- <p class="text-xs text-gray-500 mt-2">
            {{ selectedScopeDescription }}
          </p> -->
        </div>
        <!-- Search -->
        <div class="relative flex-1 w-full mr-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search variables..."
            class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 placeholder:text-gray-600"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Add Variable Button -->
        <div class="flex gap-2">
          <button
            @click="showTemplates = !showTemplates"
            class="px-4 py-2 bg-gray-500/10 hover:bg-gray-500/15 text-gray-300 hover:text-white rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all text-sm font-semibold flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Templates
          </button>
          <button
            @click="showImportModal = true"
            class="px-4 py-2 bg-gray-500/10 hover:bg-gray-500/15 text-gray-300 hover:text-white rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all text-sm font-semibold flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button
            @click="openAddModal()"
            class="px-4 py-2 bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition font-semibold text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Variable
          </button>
        </div>
      </div>

      <!-- Templates Dropdown -->
      <div v-if="showTemplates" class="mb-6 bg-gradient-to-b from-gray-500/10 to-gray-500/5 border border-gray-500/25 rounded-xl p-4 animate-fade-in">
        <h3 class="text-sm font-semibold text-white mb-3">Common Variables</h3>
        <div class="grid md:grid-cols-2 gap-2">
          <button
            v-for="template in templates"
            :key="template.key"
            @click="applyTemplate(template)"
            class="text-left px-3 py-2 bg-gray-500/5 hover:bg-gray-500/15 border border-gray-500/20 hover:border-gray-500/40 rounded-lg text-sm transition-all"
          >
            <div class="font-medium text-white">{{ template.key }}</div>
            <div class="text-xs text-gray-500">{{ template.description }}</div>
          </button>
        </div>
      </div>

      <!-- Variables List -->
      <div v-if="loading" class="space-y-3 animate-pulse">
        <div v-for="i in 3" :key="i" class="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 h-20"></div>
      </div>

      <div v-else-if="filteredVars.length === 0" class="text-center py-16 animate-fade-in">
        <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
          <svg class="w-10 h-10 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-gray-400 mb-2 text-lg font-medium">
          {{ searchQuery ? 'No variables found' : 'No environment variables' }}
        </p>
        <p class="text-sm text-gray-500">
          {{ searchQuery ? 'Try a different search term' : `Add variables for the ${selectedScopeLabel} scope` }}
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(envVar, index) in filteredVars"
          :key="envVar.id"
          class="bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/20 rounded-xl p-5 hover:border-gray-500/30 transition-all animate-fade-in"
          :style="{ animationDelay: `${index * 30}ms` }"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- Variable Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-lg font-semibold text-white font-mono">{{ envVar.key }}</h3>
                <span
                  v-if="envVar.isSecret"
                  class="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 flex items-center gap-1"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secret
                </span>
              </div>
              
              <!-- Value -->
              <div class="bg-black/40 border border-gray-500/20 rounded-lg p-3 mb-2">
                <div v-if="revealedVars.has(envVar.id)" class="flex items-center gap-2">
                  <code class="text-sm text-green-300 font-mono break-all">{{ revealedVars.get(envVar.id) }}</code>
                  <button
                    @click="copyToClipboard(revealedVars.get(envVar.id)!)"
                    class="text-gray-500 hover:text-white transition flex-shrink-0"
                    title="Copy value"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <code v-else class="text-sm text-gray-400 font-mono">{{ envVar.value }}</code>
              </div>

              <!-- Metadata -->
              <div class="flex items-center gap-4 text-xs text-gray-500">
                <span v-if="envVar.updatedBy">Updated by {{ envVar.updatedBy }}</span>
                <span>{{ formatDate(envVar.updatedAt) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2">
              <button
                v-if="envVar.isSecret && !revealedVars.has(envVar.id)"
                @click="revealValue(envVar)"
                :disabled="revealing === envVar.id"
                class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {{ revealing === envVar.id ? 'Revealing...' : 'Reveal' }}
              </button>
              
              <button
                v-else-if="revealedVars.has(envVar.id)"
                @click="revealedVars.delete(envVar.id)"
                class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                Hide
              </button>

              <button
                @click="openEditModal(envVar)"
                class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

              <button
                @click="confirmDelete(envVar)"
                class="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 rounded-lg text-sm transition-all flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click.self="showModal = false"
    >
      <div class="bg-black border border-gray-500/25 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
        <h2 class="text-2xl font-bold text-white mb-4">
          {{ modalMode === 'add' ? 'Add Variable' : 'Edit Variable' }}
        </h2>
        
        <div class="space-y-4 mb-6">
          <!-- Key -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Key
            </label>
            <input
              v-model="formData.key"
              :disabled="modalMode === 'edit'"
              type="text"
              placeholder="API_URL"
              class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300/50 placeholder:text-gray-600 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">
              Must start with A-Z or _, contain only A-Z, 0-9, and _
            </p>
          </div>

          <!-- Value -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Value
            </label>
            <textarea
              v-model="formData.value"
              rows="3"
              placeholder="https://api.example.com"
              class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300/50 placeholder:text-gray-600 font-mono resize-none"
            ></textarea>
          </div>

          <!-- Secret Toggle -->
          <div class="flex items-center justify-between bg-gray-500/5 border border-gray-500/20 rounded-lg p-3">
            <div>
              <div class="text-sm font-medium text-white">Secret Variable</div>
              <div class="text-xs text-gray-500">Value will be masked in the UI</div>
            </div>
            <label class="relative inline-block w-12 h-6 cursor-pointer">
              <input
                v-model="formData.isSecret"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-full h-full bg-gray-500/20 peer-focus:ring-2 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-300"></div>
            </label>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="saveVariable"
            :disabled="saving || !formData.key || !formData.value"
            class="flex-1 px-4 py-3 bg-blue-300 text-sm text-black rounded-lg hover:bg-blue-400 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Saving...' : modalMode === 'add' ? 'Add Variable' : 'Save Changes' }}
          </button>
          <button
            @click="showModal = false"
            class="px-4 py-3 border text-sm border-gray-500/25 text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click.self="showImportModal = false"
    >
      <div class="bg-black border border-gray-500/25 rounded-xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in">
        <h2 class="text-2xl font-bold text-white mb-2">Import Variables</h2>
        <p class="text-sm text-gray-400 mb-4">Paste your .env file content below. One variable per line in KEY=VALUE format.</p>
        
        <div class="space-y-4 mb-6">
          <!-- Import Text Area -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Environment Variables
            </label>
            <textarea
              v-model="importText"
              rows="12"
              placeholder="API_URL=https://api.example.com
API_KEY=secret123
DATABASE_URL=postgresql://localhost:5432/db
NODE_ENV=production

# Comments are ignored
NEXT_PUBLIC_SITE_URL=https://example.com"
              class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300/50 placeholder:text-gray-600 font-mono text-sm resize-none"
            ></textarea>
            <p class="text-xs text-gray-500 mt-2">
              {{ importPreviewCount }} variable{{ importPreviewCount !== 1 ? 's' : '' }} detected
            </p>
          </div>

          <!-- Secret Toggle -->
          <div class="flex items-center justify-between bg-gray-500/5 border border-gray-500/20 rounded-lg p-3">
            <div>
              <div class="text-sm font-medium text-white">Import as Secrets</div>
              <div class="text-xs text-gray-500">All imported values will be masked in the UI</div>
            </div>
            <label class="relative inline-block w-12 h-6 cursor-pointer">
              <input
                v-model="importAsSecret"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-full h-full bg-gray-500/20 peer-focus:ring-2 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-300"></div>
            </label>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="bulkImport"
            :disabled="importing || !importText.trim()"
            class="flex-1 px-4 py-3 bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ importing ? 'Importing...' : `Import ${importPreviewCount} Variable${importPreviewCount !== 1 ? 's' : ''}` }}
          </button>
          <button
            @click="showImportModal = false; importText = ''"
            class="px-4 py-3 border border-gray-500/25 text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <ConfirmModal
      v-if="confirmModal.show"
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :description="confirmModal.description"
      :variant="confirmModal.variant"
      @confirm="confirmModal.onConfirm()"
      @cancel="confirmModal.show = false"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const toast = useToast();

const siteId = route.params.id as string;

const user = ref<any>(null);
const site = ref<any>(null);
const envVars = ref<any[]>([]);
const loading = ref(true);
const selectedScope = ref('build');
const searchQuery = ref('');
const showModal = ref(false);
const showTemplates = ref(false);
const showImportModal = ref(false);
const modalMode = ref<'add' | 'edit'>('add');
const saving = ref(false);
const revealing = ref<string | null>(null);
const revealedVars = reactive(new Map<string, string>());
const importText = ref('');
const importAsSecret = ref(true);
const importing = ref(false);

const formData = ref({
  key: '',
  value: '',
  isSecret: true,
});

const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  description: '',
  variant: 'primary' as 'primary' | 'warning' | 'danger',
  onConfirm: () => {},
});

const scopes = [
  { value: 'build', label: 'Build' },
  { value: 'runtime:preview', label: 'Runtime (Preview)' },
  { value: 'runtime:production', label: 'Runtime (Production)' },
  { value: 'adapter:vercel', label: 'Vercel' },
  { value: 'adapter:cloudflare-pages', label: 'Cloudflare Pages' },
  { value: 'adapter:cloudflare-workers', label: 'Cloudflare Workers' },
  { value: 'adapter:cloudflare-sandbox', label: 'Cloudflare Sandbox' },
  { value: 'adapter:vercel-sandbox', label: 'Vercel Sandbox' },
  { value: 'adapter:netlify', label: 'Netlify' },
  { value: 'adapter:railway', label: 'Railway' },
  { value: 'adapter:fly', label: 'Fly.io' },
  { value: 'adapter:render', label: 'Render' },
  { value: 'adapter:s3', label: 'S3' },
  { value: 'adapter:github-pages', label: 'GitHub Pages' },
  { value: 'adapter:ftp', label: 'FTP' },
  { value: 'adapter:ssh-rsync', label: 'SSH/Rsync' },
  { value: 'ssh-agent', label: 'SSH Agent' },
];

const templates = [
  { key: 'NODE_ENV', value: 'production', description: 'Node environment', isSecret: false },
  { key: 'API_URL', value: 'https://api.example.com', description: 'API base URL', isSecret: false },
  { key: 'API_KEY', value: '', description: 'API authentication key', isSecret: true },
  { key: 'DATABASE_URL', value: '', description: 'Database connection string', isSecret: true },
  { key: 'NEXT_PUBLIC_APP_URL', value: '', description: 'Next.js public app URL', isSecret: false },
  { key: 'VITE_API_URL', value: '', description: 'Vite public API URL', isSecret: false },
  { key: 'PUBLIC_SITE_URL', value: '', description: 'Public site URL', isSecret: false },
  { key: 'SECRET_KEY', value: '', description: 'Application secret key', isSecret: true },
];

const breadcrumbItems = computed(() => [
  { label: 'Sites', to: '/sites' },
  { label: site.value?.name || 'Site', to: `/sites/${siteId}` },
  { label: 'Environment Variables', to: `/sites/${siteId}/env` },
]);

const selectedScopeLabel = computed(() => {
  return scopes.find(s => s.value === selectedScope.value)?.label || selectedScope.value;
});

const selectedScopeDescription = computed(() => {
  const descriptions: Record<string, string> = {
    'build': 'Variables injected during build process (npm run build)',
    'runtime:preview': 'Variables for preview deployments',
    'runtime:production': 'Variables for production deployments',
    'adapter:vercel': 'Vercel-specific configuration (API tokens, project IDs)',
    'adapter:cloudflare-pages': 'Cloudflare Pages-specific configuration',
    'adapter:cloudflare-workers': 'Cloudflare Workers-specific configuration (KV namespace, etc.)',
    'adapter:cloudflare-sandbox': 'Cloudflare Sandbox-specific configuration',
    'adapter:vercel-sandbox': 'Vercel Sandbox-specific configuration',
    'adapter:netlify': 'Netlify-specific configuration',
    'adapter:railway': 'Railway-specific configuration',
    'adapter:fly': 'Fly.io-specific configuration',
    'adapter:render': 'Render-specific configuration',
    'adapter:s3': 'S3-specific configuration (bucket, credentials)',
    'adapter:github-pages': 'GitHub Pages-specific configuration',
    'adapter:ftp': 'FTP-specific configuration',
    'adapter:ssh-rsync': 'SSH/Rsync-specific configuration',
    'ssh-agent': 'SSH agent configuration for deployments',
  };
  return descriptions[selectedScope.value] || 'Environment variables for this scope';
});

const filteredVars = computed(() => {
  let vars = envVars.value.filter(v => v.scope === selectedScope.value);
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    vars = vars.filter(v => 
      v.key.toLowerCase().includes(query) || 
      v.value.toLowerCase().includes(query)
    );
  }
  
  return vars;
});

const importPreviewCount = computed(() => {
  if (!importText.value.trim()) return 0;
  
  const lines = importText.value.split('\n');
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.match(/^[A-Z_][A-Z0-9_]*=/)) count++;
  }
  
  return count;
});

async function loadEnvVars() {
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/env`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load environment variables');
    
    envVars.value = await response.json();
  } catch (error: any) {
    console.error('Failed to load environment variables:', error);
    toast.error('Failed to load environment variables', error.message);
  }
}

function openAddModal() {
  modalMode.value = 'add';
  formData.value = {
    key: '',
    value: '',
    isSecret: true,
  };
  showModal.value = true;
}

function openEditModal(envVar: any) {
  modalMode.value = 'edit';
  formData.value = {
    key: envVar.key,
    value: envVar.value,
    isSecret: envVar.isSecret,
  };
  showModal.value = true;
}

function applyTemplate(template: any) {
  formData.value = {
    key: template.key,
    value: template.value,
    isSecret: template.isSecret,
  };
  showTemplates.value = false;
  showModal.value = true;
}

async function saveVariable() {
  saving.value = true;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/env`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: selectedScope.value,
        key: formData.value.key,
        value: formData.value.value,
        isSecret: formData.value.isSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save variable');
    }

    await loadEnvVars();
    toast.success(
      modalMode.value === 'add' ? 'Variable Added' : 'Variable Updated',
      `${formData.value.key} has been saved`
    );
    showModal.value = false;
  } catch (error: any) {
    toast.error('Failed to save variable', error.message);
  } finally {
    saving.value = false;
  }
}

async function revealValue(envVar: any) {
  revealing.value = envVar.id;

  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/sites/${siteId}/env/${envVar.scope}/${envVar.key}/reveal`,
      { credentials: 'include' }
    );

    if (!response.ok) throw new Error('Failed to reveal value');

    const data = await response.json();
    revealedVars.set(envVar.id, data.value);
  } catch (error: any) {
    toast.error('Failed to reveal value', error.message);
  } finally {
    revealing.value = null;
  }
}

function confirmDelete(envVar: any) {
  confirmModal.value = {
    show: true,
    title: 'Delete Variable',
    message: `Delete ${envVar.key}?`,
    description: 'This action cannot be undone.',
    variant: 'danger',
    onConfirm: () => deleteVariable(envVar),
  };
}

async function deleteVariable(envVar: any) {
  confirmModal.value.show = false;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/env`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: envVar.scope,
        key: envVar.key,
      }),
    });

    if (!response.ok) throw new Error('Failed to delete variable');

    await loadEnvVars();
    revealedVars.delete(envVar.id);
    toast.success('Variable Deleted', `${envVar.key} has been removed`);
  } catch (error: any) {
    toast.error('Failed to delete variable', error.message);
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copied!', 'Value copied to clipboard');
  }).catch(() => {
    toast.error('Copy Failed', 'Could not copy to clipboard');
  });
}

async function bulkImport() {
  if (!importText.value.trim()) return;
  
  importing.value = true;
  
  try {
    const lines = importText.value.split('\n');
    const vars: Record<string, string> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Parse KEY=VALUE
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!match) {
        console.warn(`Skipping invalid line: ${line}`);
        continue;
      }
      
      const [, key, value] = match;
      
      // Remove quotes if present
      let cleanValue = value;
      if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
          (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.slice(1, -1);
      }
      
      vars[key] = cleanValue;
    }
    
    const count = Object.keys(vars).length;
    
    if (count === 0) {
      toast.error('No Valid Variables', 'No valid KEY=VALUE pairs found');
      return;
    }
    
    // Bulk import via API
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/env/bulk`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: selectedScope.value,
        vars,
        isSecret: importAsSecret.value,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import variables');
    }
    
    const result = await response.json();
    
    await loadEnvVars();
    toast.success(
      'Variables Imported',
      `Successfully imported ${result.count} variable${result.count !== 1 ? 's' : ''}`
    );
    
    showImportModal.value = false;
    importText.value = '';
  } catch (error: any) {
    toast.error('Import Failed', error.message);
  } finally {
    importing.value = false;
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleString();
}

onMounted(async () => {
  try {
    const { data: userData } = await useFetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });
    user.value = userData.value;

    const { data: siteData } = await useFetch(`${config.public.apiUrl}/v1/sites/${siteId}`, {
      credentials: 'include',
    });
    site.value = siteData.value;

    await loadEnvVars();
  } catch (error) {
    console.error('Failed to load page:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
</style>

