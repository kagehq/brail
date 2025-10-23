<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <NuxtLink to="/sites" class="hover:text-white transition">Sites</NuxtLink>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-white">Adapter Catalog</span>
      </nav>

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-4xl font-bold text-white mb-2">Adapter Catalog</h1>
          <p class="text-gray-400">Discover built-in platforms and integrations available in Brail</p>
        </div>
        <NuxtLink
          to="/sites"
          class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-300 border border-gray-500/20 rounded-lg hover:text-white hover:border-gray-500/40 hover:bg-gray-500/5 transition-all"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sites
        </NuxtLink>
      </div>

      <!-- Search and Filters -->
      <div v-if="!loading && adapters.length" class="mb-8 space-y-4">
        <!-- Search Bar -->
        <div class="relative">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search adapters by name or description..."
            class="w-full pl-12 pr-4 py-3.5 bg-gray-500/10 border border-gray-500/25 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600"
          />
        </div>

        <!-- Category Filters and Sort -->
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <!-- Category Tabs -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="cat in categoryFilters"
              :key="cat.value"
              @click="selectedCategory = cat.value"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              :class="selectedCategory === cat.value
                ? 'bg-blue-300 text-black'
                : 'bg-gray-500/10 text-gray-400 hover:text-white hover:bg-gray-500/15 border border-gray-500/20'"
            >
              {{ cat.label }}
              <span v-if="cat.count !== undefined" class="ml-1.5 opacity-70">({{ cat.count }})</span>
            </button>
          </div>

          <!-- Sort Dropdown -->
          <div class="relative" ref="sortDropdownRef">
            <button
              @click.stop="showSortDropdown = !showSortDropdown"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/10 border border-gray-500/25 rounded-lg text-sm text-white hover:bg-gray-500/15 transition-all"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Sort: {{ sortOptions.find(o => o.value === selectedSort)?.label }}</span>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="showSortDropdown"
              @click.stop
              class="absolute right-0 mt-2 w-56 bg-black border border-gray-500/25 rounded-lg shadow-xl z-50 py-1"
            >
              <button
                v-for="option in sortOptions"
                :key="option.value"
                @click="selectSort(option.value)"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-500/15 transition-all"
                :class="selectedSort === option.value ? 'text-blue-300 bg-gray-500/10' : 'text-gray-400'"
              >
                <div class="flex items-center justify-between">
                  <span>{{ option.label }}</span>
                  <svg
                    v-if="selectedSort === option.value"
                    class="w-4 h-4 text-blue-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div v-for="i in 3" :key="`skeleton-${i}`" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse">
          <div class="h-5 bg-gray-500/20 rounded w-40 mb-4"></div>
          <div class="grid gap-4 md:grid-cols-2">
            <div v-for="j in 4" :key="`inner-${i}-${j}`" class="bg-gray-500/10 border border-gray-500/10 rounded-lg h-48"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!adapters.length" class="bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/25 rounded-2xl p-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-500/10 border border-gray-500/20 rounded-2xl mb-4">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No Adapters Found</h3>
        <p class="text-gray-400 text-sm max-w-md mx-auto">
          No adapters found. Try again later or configure an external catalog via <code class="px-2 py-0.5 bg-gray-500/20 rounded">ADAPTER_CATALOG_URL</code>.
        </p>
      </div>

      <!-- No Search Results -->
      <div v-else-if="filteredAdapters.length === 0" class="bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/25 rounded-2xl p-12 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gray-500/10 border border-gray-500/20 rounded-2xl mb-4">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">No Results Found</h3>
        <p class="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
      </div>

      <!-- Adapters Content -->
      <div v-else class="space-y-12 animate-fade-in">
        <section v-if="popularAdapters.length && !searchQuery && selectedCategory === 'all'">
          <div class="mb-6">
            <h2 class="text-2xl font-bold text-white">Popular Adapters</h2>
          </div>

          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="adapter in popularAdapters"
              :key="adapter.name"
              class="group relative bg-gradient-to-br from-gray-500/10 via-gray-500/5 to-transparent border border-gray-500/20 rounded-xl p-6 hover:border-blue-300/40 hover:shadow-2xl hover:shadow-blue-300/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            >
              <div class="absolute top-4 right-4">
                <span class="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-300 text-xs font-medium">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Popular
                </span>
              </div>

              <div class="flex items-center gap-4 mb-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gray-500/20 border border-gray-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon :name="getPlatformIcon(adapter.name)" class="w-6 h-6 text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-xl font-bold text-white mb-1 truncate">{{ adapter.title || adapter.name }}</h3>
                  <span v-if="getBestFor(adapter.name)" class="inline-block text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-md">
                    {{ getBestFor(adapter.name) }}
                  </span>
                </div>
              </div>

              <p class="text-sm text-gray-400 leading-relaxed mb-4">{{ adapter.description }}</p>

              <div v-if="adapter.features?.length" class="mb-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Highlights</p>
                <ul class="text-sm text-gray-300 space-y-1">
                  <li v-for="feature in adapter.features.slice(0, 3)" :key="feature" class="flex items-start gap-2">
                    <svg class="mt-0.5 w-4 h-4 text-blue-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span>{{ feature }}</span>
                  </li>
                </ul>
              </div>

              <div class="flex items-center gap-2 pt-4 border-t border-gray-500/20">
                <a
                  v-if="adapter.docsUrl"
                  :href="adapter.docsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-300 text-black rounded-lg text-sm font-semibold hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/30"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Setup Guide
                </a>
                <span v-if="supportLabel(adapter)" class="text-xs px-3 py-2 border border-gray-500/30 rounded-lg text-gray-400">
                  {{ supportLabel(adapter) }}
                </span>
              </div>
            </article>
          </div>
        </section>

        <section v-for="section in displayedSections" :key="section.key">
          <div v-if="section.label" class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white">{{ section.label }}</h2>
            <span class="text-sm px-3 py-1.5 border border-gray-500/30 text-gray-400 rounded-lg font-medium">
              {{ section.items.length }} {{ section.items.length === 1 ? 'adapter' : 'adapters' }}
            </span>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article
              v-for="adapter in section.items"
              :key="adapter.name"
              class="group bg-gradient-to-br from-gray-500/10 via-gray-500/5 to-transparent border border-gray-500/20 rounded-xl p-6 hover:border-gray-500/40 hover:shadow-xl hover:shadow-gray-500/5 hover:scale-[1.01] transition-all duration-200"
            >
              <div class="flex items-start gap-4 mb-4">
                <div class="flex-shrink-0 w-12 h-12 bg-gray-500/20 border border-gray-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon :name="getPlatformIcon(adapter.name)" class="w-6 h-6 text-white" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <h3 class="text-lg font-bold text-white">{{ adapter.title || adapter.name }}</h3>
                    <span v-if="adapter.title?.includes('Beta')" class="flex-shrink-0 text-xs uppercase px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 font-medium">
                      Beta
                    </span>
                    <span v-else class="flex-shrink-0 text-xs uppercase px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 font-medium">
                      Stable
                    </span>
                  </div>
                  <span v-if="getBestFor(adapter.name)" class="inline-block text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-md">
                    {{ getBestFor(adapter.name) }}
                  </span>
                </div>
              </div>

              <p class="text-sm text-gray-400 leading-relaxed mb-4">{{ adapter.description }}</p>

              <div v-if="adapter.features?.length" class="mb-4">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Highlights</p>
                <ul class="text-sm text-gray-300 space-y-1.5">
                  <li v-for="feature in adapter.features" :key="feature" class="flex items-start gap-2">
                    <svg class="mt-0.5 w-4 h-4 text-blue-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <span>{{ feature }}</span>
                  </li>
                </ul>
              </div>

              <div class="flex items-center gap-3 pt-4 border-t border-gray-500/20">
                <a
                  v-if="adapter.docsUrl"
                  :href="adapter.docsUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-blue-300/10 border border-blue-300/20 text-blue-300 rounded-lg text-sm font-semibold hover:bg-blue-300/20 hover:border-blue-300/40 transition-all"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Docs
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <span v-if="supportLabel(adapter)" class="text-xs px-3 py-2 border border-gray-500/30 rounded-lg text-gray-400">
                  {{ supportLabel(adapter) }}
                </span>
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
const searchQuery = ref('');
const selectedCategory = ref('all');
const selectedSort = ref('alphabetical');
const showSortDropdown = ref(false);
const sortDropdownRef = ref<HTMLElement | null>(null);

const categoryLabels: Record<string, string> = {
  traditional: 'Traditional & Self-Hosted',
  storage: 'Storage & CDN',
  platform: 'Managed Platforms',
  dynamic: 'Dynamic Runtime & Sandboxes',
};

const categoryFilters = computed(() => {
  const counts: Record<string, number> = {};
  adapters.value.forEach(adapter => {
    const cat = adapter.category || 'platform';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return [
    { label: 'All Adapters', value: 'all', count: adapters.value.length },
    { label: 'Managed Platforms', value: 'platform', count: counts.platform || 0 },
    { label: 'Dynamic Runtime', value: 'dynamic', count: counts.dynamic || 0 },
    { label: 'Storage & CDN', value: 'storage', count: counts.storage || 0 },
    { label: 'Self-Hosted', value: 'traditional', count: counts.traditional || 0 },
  ];
});

const sortOptions = [
  { label: 'Alphabetical (A-Z)', value: 'alphabetical' },
  { label: 'Category', value: 'category' },
];

const platformIcons: Record<string, string> = {
  'vercel': 'simple-icons:vercel',
  'vercel-sandbox': 'simple-icons:vercel',
  'cloudflare-pages': 'simple-icons:cloudflare',
  'cloudflare-workers': 'simple-icons:cloudflare',
  'cloudflare-sandbox': 'simple-icons:cloudflare',
  'netlify': 'simple-icons:netlify',
  'github-pages': 'simple-icons:github',
  'railway': 'simple-icons:railway',
  'fly': 'simple-icons:fly',
  'render': 'simple-icons:render',
  's3': 'simple-icons:amazons3',
  'ssh-rsync': 'mdi:server-network',
  'ftp': 'mdi:folder-network',
};

const bestForTags: Record<string, string> = {
  'vercel': 'Static & SSR',
  'cloudflare-pages': 'Static Sites',
  'netlify': 'Jamstack',
  'github-pages': 'Documentation',
  's3': 'Static Assets',
  'cloudflare-workers': 'Edge Computing',
  'railway': 'Full-stack Apps',
  'fly': 'Global Edge',
  'render': 'Web Services',
  'ssh-rsync': 'Self-Hosted',
  'ftp': 'Shared Hosting',
  'vercel-sandbox': 'Isolated Runtime',
  'cloudflare-sandbox': 'Code Execution',
};

const popularAdapterNames = ['vercel', 'cloudflare-pages', 'netlify'];

const filteredAdapters = computed(() => {
  let filtered = adapters.value;

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(adapter =>
      adapter.title?.toLowerCase().includes(query) ||
      adapter.name.toLowerCase().includes(query) ||
      adapter.description.toLowerCase().includes(query)
    );
  }

  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(adapter => adapter.category === selectedCategory.value);
  }

  return filtered;
});

const sortedAdapters = computed(() => {
  const sorted = [...filteredAdapters.value];

  switch (selectedSort.value) {
    case 'alphabetical':
      return sorted.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));

    case 'category':
      return sorted.sort((a, b) => {
        const catCompare = (a.category || 'platform').localeCompare(b.category || 'platform');
        if (catCompare !== 0) return catCompare;
        return (a.title || a.name).localeCompare(b.title || b.name);
      });

    default:
      return sorted;
  }
});

const groupedAdapters = computed(() => {
  // For alphabetical sort, show all adapters in one group
  if (selectedSort.value === 'alphabetical') {
    return [{
      key: 'all',
      label: 'All Adapters',
      items: sortedAdapters.value,
    }];
  }

  // For category sort, group by category
  const groups = sortedAdapters.value.reduce<Record<string, AdapterCatalogEntry[]>>((acc, entry) => {
    const key = entry.category || 'platform';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([key, items]) => ({
      key,
      label: categoryLabels[key] || key,
      items,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const popularAdapters = computed(() => {
  return adapters.value
    .filter(adapter => popularAdapterNames.includes(adapter.name))
    .sort((a, b) => {
      const indexA = popularAdapterNames.indexOf(a.name);
      const indexB = popularAdapterNames.indexOf(b.name);
      return indexA - indexB;
    });
});

const displayedSections = computed(() => {
  if (searchQuery.value.trim() || selectedCategory.value !== 'all') {
    return groupedAdapters.value;
  }

  // For alphabetical sort, hide the heading when popular adapters are shown
  if (selectedSort.value === 'alphabetical') {
    return groupedAdapters.value.map(section => ({
      ...section,
      label: '', // Hide section heading for alphabetical view
      items: section.items.filter(adapter => !popularAdapterNames.includes(adapter.name)),
    })).filter(section => section.items.length > 0);
  }

  // Filter out popular adapters from the main sections
  return groupedAdapters.value.map(section => ({
    ...section,
    items: section.items.filter(adapter => !popularAdapterNames.includes(adapter.name)),
  })).filter(section => section.items.length > 0);
});

function getPlatformIcon(name: string): string {
  return platformIcons[name] || 'mdi:lightning-bolt';
}

function getBestFor(name: string): string | null {
  return bestForTags[name] || null;
}

function supportLabel(adapter: AdapterCatalogEntry): string | null {
  const supports: string[] = [];
  if (adapter.supportsPreview) supports.push('preview');
  if (adapter.supportsProduction ?? true) supports.push('production');
  return supports.length ? supports.join(' + ') : null;
}

function selectSort(value: string) {
  selectedSort.value = value;
  showSortDropdown.value = false;
}

const handleClickOutside = (event: MouseEvent) => {
  if (sortDropdownRef.value && !sortDropdownRef.value.contains(event.target as Node)) {
    showSortDropdown.value = false;
  }
};

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

  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
