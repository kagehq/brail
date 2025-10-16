<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="domains"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-1">Custom Domains</h1>
        <p class="text-gray-400 text-sm">Connect your own domain to this site</p>
      </div>

      <!-- Add Domain Button -->
      <div class="mb-6">
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition font-semibold text-sm flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Domain
        </button>
      </div>

      <!-- Domains List -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div v-for="i in 3" :key="i" class="bg-gray-500/10 border border-gray-500/20 rounded-xl p-6 h-32"></div>
      </div>

      <div v-else-if="domains.length === 0" class="text-center py-16 animate-fade-in">
        <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
          <svg class="w-10 h-10 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <p class="text-gray-400 mb-2 text-lg font-medium">No custom domains</p>
        <p class="text-sm text-gray-500">Add a domain to use your own URL</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="(domain, index) in domains"
          :key="domain.id"
          class="bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/20 rounded-xl p-6 hover:border-gray-500/30 transition-all animate-fade-in"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- Domain Name & Status -->
              <div class="flex items-center gap-3 mb-4 flex-wrap">
                <h3 class="text-xl font-semibold text-white">{{ domain.hostname }}</h3>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    domain.status === 'verified' || domain.status === 'active' 
                      ? 'bg-green-300/10 border border-green-300/20 text-green-300'
                      : domain.status === 'securing'
                      ? 'bg-yellow-300/10 border border-yellow-300/20 text-yellow-300'
                      : domain.status === 'failed'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                  ]"
                >
                  {{ domain.status }}
                </span>
                <!-- SSL Status Badge -->
                <span
                  v-if="domain.certStatus"
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5',
                    domain.certStatus === 'issued' 
                      ? 'bg-green-300/10 border border-green-300/20 text-green-300'
                      : domain.certStatus === 'pending'
                      ? 'bg-yellow-300/10 border border-yellow-300/20 text-yellow-300'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  ]"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  SSL: {{ domain.certStatus }}
                </span>
              </div>

              <!-- DNS Instructions -->
              <div class="bg-black/40 border border-gray-500/20 rounded-lg p-4 mb-4">
                <h4 class="text-sm font-semibold text-gray-300 mb-3">DNS Configuration:</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center gap-4">
                    <span class="text-gray-500 w-16">Type:</span>
                    <code class="text-white font-mono">CNAME</code>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="text-gray-500 w-16">Host:</span>
                    <code class="text-white font-mono">{{ getHost(domain.hostname) }}</code>
                    <button
                      @click="copyToClipboard(getHost(domain.hostname))"
                      class="text-gray-500 hover:text-white transition"
                      title="Copy"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="text-gray-500 w-16">Target:</span>
                    <code class="text-green-300 font-mono">{{ domain.cnameTarget }}</code>
                    <button
                      @click="copyToClipboard(domain.cnameTarget)"
                      class="text-gray-500 hover:text-white transition"
                      title="Copy"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Last Checked -->
              <p v-if="domain.lastCheckedAt" class="text-xs text-gray-500">
                Last checked: {{ formatDate(domain.lastCheckedAt) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 ml-4">
              <button
                v-if="domain.status === 'pending' || domain.status === 'failed'"
                @click="verifyDomain(domain.id)"
                :disabled="verifying === domain.id"
                class="px-4 py-2 bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition font-medium text-sm disabled:opacity-50"
              >
                {{ verifying === domain.id ? 'Verifying...' : 'Verify DNS' }}
              </button>

              <button
                v-if="(domain.status === 'verified' || domain.status === 'active') && !domain.certStatus"
                @click="provisionSSL(domain.id)"
                :disabled="provisioning === domain.id"
                class="px-4 py-2 bg-green-300 text-black rounded-lg hover:bg-green-400 transition font-medium text-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {{ provisioning === domain.id ? 'Getting SSL...' : 'Enable SSL' }}
              </button>

              <button
                @click="confirmRemove(domain)"
                class="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Domain Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click.self="showAddModal = false"
    >
      <div class="bg-black border border-gray-500/25 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fade-in">
        <h2 class="text-2xl font-bold text-white mb-4">Add Custom Domain</h2>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Domain Name
          </label>
          <input
            v-model="newHostname"
            type="text"
            placeholder="example.com or www.example.com"
            class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300/50 placeholder:text-gray-600"
            @keyup.enter="addDomain"
          />
          <p class="text-xs text-gray-500 mt-2">
            Enter your domain without http:// or https://
          </p>
        </div>

        <div class="flex gap-3">
          <button
            @click="addDomain"
            :disabled="!newHostname || adding"
            class="flex-1 px-4 py-3 bg-blue-300 text-sm text-black rounded-lg hover:bg-blue-400 transition font-semibold disabled:opacity-50"
          >
            {{ adding ? 'Adding...' : 'Add Domain' }}
          </button>
          <button
            @click="showAddModal = false"
            class="px-4 py-3 border border-gray-500/25 text-sm text-gray-300 hover:text-white hover:border-gray-500/40 rounded-lg transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmModal
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
const router = useRouter();
const api = useApi();
const config = useRuntimeConfig();
const toast = useToast();

const siteId = route.params.id as string;

const user = ref<any>(null);
const site = ref<any>(null);
const domains = ref<any[]>([]);
const loading = ref(true);
const showAddModal = ref(false);
const newHostname = ref('');
const adding = ref(false);
const verifying = ref<string | null>(null);
const provisioning = ref<string | null>(null);

const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  description: '',
  variant: 'primary' as 'primary' | 'warning' | 'danger',
  onConfirm: () => {},
});

const breadcrumbItems = computed(() => [
  { label: 'Sites', to: '/sites' },
  { label: site.value?.name || 'Site', to: `/sites/${siteId}` },
  { label: 'Domains', to: `/sites/${siteId}/domains` },
]);

async function loadDomains() {
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/domains`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load domains');
    
    domains.value = await response.json();
  } catch (error: any) {
    console.error('Failed to load domains:', error);
    toast.error('Failed to load domains', error.message);
  }
}

async function addDomain() {
  if (!newHostname.value) return;

  adding.value = true;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/domains`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: newHostname.value }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add domain');
    }

    await loadDomains();
    toast.success('Domain Added', 'Configure your DNS with the instructions shown');
    showAddModal.value = false;
    newHostname.value = '';
  } catch (error: any) {
    toast.error('Failed to add domain', error.message);
  } finally {
    adding.value = false;
  }
}

async function verifyDomain(domainId: string) {
  verifying.value = domainId;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/domains/${domainId}/verify`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Verification failed');

    const result = await response.json();
    await loadDomains();

    if (result.verification.ok) {
      toast.success('Domain Verified!', 'DNS configuration is correct');
    } else {
      toast.warning('Not Verified Yet', 'DNS records not found or incorrect. Changes can take up to 48 hours to propagate.');
    }
  } catch (error: any) {
    toast.error('Verification Failed', error.message);
  } finally {
    verifying.value = null;
  }
}

async function provisionSSL(domainId: string) {
  provisioning.value = domainId;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/domains/${domainId}/ssl/provision`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to provision SSL');
    }

    toast.success('SSL Provisioning Started', 'Your certificate will be ready in a few minutes. This page will update automatically.');
    
    // Poll for updates
    setTimeout(async () => {
      await loadDomains();
      
      // If still pending, poll again
      const domain = domains.value.find(d => d.id === domainId);
      if (domain && domain.certStatus === 'pending') {
        toast.info('SSL Still Provisioning', 'This usually takes 2-5 minutes...');
      } else if (domain && domain.certStatus === 'issued') {
        toast.success('SSL Certificate Active!', 'Your domain is now secured with HTTPS 🔒');
      } else if (domain && domain.certStatus === 'failed') {
        toast.error('SSL Provisioning Failed', 'Please try again or contact support if the issue persists.');
      }
    }, 30000); // Check after 30 seconds

  } catch (error: any) {
    toast.error('SSL Provisioning Failed', error.message);
  } finally {
    provisioning.value = null;
  }
}

function confirmRemove(domain: any) {
  confirmModal.value = {
    show: true,
    title: 'Remove Domain',
    message: `Remove ${domain.hostname}?`,
    description: 'This action cannot be undone.',
    variant: 'danger',
    onConfirm: () => removeDomain(domain.id),
  };
}

async function removeDomain(domainId: string) {
  confirmModal.value.show = false;

  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/domains/${domainId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to remove domain');

    await loadDomains();
    toast.success('Domain Removed', 'The domain has been deleted');
  } catch (error: any) {
    toast.error('Failed to remove domain', error.message);
  }
}

function getHost(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return '@';
  return parts.slice(0, -2).join('.') || '@';
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied!', 'Value copied to clipboard');
  } catch (error) {
    toast.error('Copy Failed', 'Could not copy to clipboard');
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleString();
}

onMounted(async () => {
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      router.push('/login');
      return;
    }

    user.value = await response.json();

    // Load site and domains
    site.value = await api.getSite(siteId);
    await loadDomains();
  } catch (error) {
    console.error('Failed to load:', error);
  } finally {
    loading.value = false;
  }
});
</script>

