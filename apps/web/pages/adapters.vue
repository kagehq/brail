<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Adapter Catalog</h1>
          <p class="text-gray-500 text-sm">Discover built-in platforms and integrations available in Brail</p>
        </div>
        <NuxtLink
          to="/sites"
          class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-300 border border-gray-500/20 rounded-lg hover:text-white hover:border-gray-500/40 transition"
        >
          ← Back to Sites
        </NuxtLink>
      </div>

      <div v-if="loading" class="space-y-6">
        <div v-for="i in 3" :key="`skeleton-${i}`" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
          <div class="h-5 bg-gray-500/20 rounded w-40 mb-4"></div>
          <div class="grid gap-3 md:grid-cols-2">
            <div v-for="j in 4" :key="`inner-${i}-${j}`" class="bg-gray-500/10 border border-gray-500/10 rounded-lg h-32"></div>
          </div>
        </div>
      </div>

      <div v-else-if="!adapters.length" class="bg-black border border-gray-500/25 rounded-xl p-6 text-gray-400 text-sm">
        No adapters found. Try again later or configure an external catalog via <code>ADAPTER_CATALOG_URL</code>.
      </div>

      <div v-else class="space-y-10 animate-fade-in">
        <section v-for="section in groupedAdapters" :key="section.key">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white">{{ section.label }}</h2>
            <span class="text-xs px-2 py-1 border border-gray-500/30 text-gray-500 rounded-lg">
              {{ section.items.length }} integration{{ section.items.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article
              v-for="adapter in section.items"
              :key="adapter.name"
              class="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-5 hover:border-gray-500/35 transition-all shadow-md"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold text-white mb-1">{{ adapter.title || adapter.name }}</h3>
                  <p class="text-sm text-gray-400 leading-relaxed">{{ adapter.description }}</p>
                </div>
                <span class="text-xs uppercase tracking-wide px-2 py-1 border border-gray-500/30 rounded-lg text-gray-500">
                  {{ adapter.category }}
                </span>
              </div>

              <div v-if="adapter.features?.length" class="mt-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Highlights</p>
                <ul class="text-sm text-gray-300 space-y-1">
                  <li v-for="feature in adapter.features" :key="feature" class="flex items-start gap-2">
                    <span class="mt-1 w-1.5 h-1.5 bg-blue-300 rounded-full"></span>
                    <span>{{ feature }}</span>
                  </li>
                </ul>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span v-if="supportLabel(adapter)" class="px-2 py-1 border border-gray-500/30 rounded-lg">
                  Supports: {{ supportLabel(adapter) }}
                </span>
                <a
                  v-if="adapter.docsUrl"
                  :href="adapter.docsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 px-2 py-1 border border-gray-500/30 rounded-lg text-gray-300 hover:text-white hover:border-gray-500/50"
                >
                  Docs
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6h8m0 0v8m0-8L5 19" />
                  </svg>
                </a>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AdapterCatalogEntry {
  name: string;
  title?: string;
  category: string;
  description: string;
  features?: string[];
  docsUrl?: string;
  supportsPreview?: boolean;
  supportsProduction?: boolean;
}

const router = useRouter();
const config = useRuntimeConfig();
const toast = useToast();

const user = ref<any>(null);
const loading = ref(true);
const adapters = ref<AdapterCatalogEntry[]>([]);

const categoryLabels: Record<string, string> = {
  traditional: 'Traditional & Self-Hosted',
  storage: 'Storage & CDN',
  platform: 'Managed Platforms',
  dynamic: 'Dynamic Runtime & Sandboxes',
};

const groupedAdapters = computed(() => {
  const groups = adapters.value.reduce<Record<string, AdapterCatalogEntry[]>>((acc, entry) => {
    const key = entry.category || 'platform';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([key, items]) => ({
      key,
      label: categoryLabels[key] || key,
      items: items.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

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

    const response = await fetch(`${config.public.apiUrl}/v1/catalog/adapters`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to load adapter catalog');
    }

    adapters.value = await response.json();
  } catch (error) {
    toast.apiError(error);
  } finally {
    loading.value = false;
  }
});

function supportLabel(adapter: AdapterCatalogEntry): string | null {
  const supports: string[] = [];
  if (adapter.supportsPreview) supports.push('preview');
  if (adapter.supportsProduction ?? true) supports.push('production');
  return supports.length ? supports.join(' + ') : null;
}
</script>
