<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader :user-email="user?.email" />

    <div v-if="loading" class="flex justify-center items-center h-screen">
      <LoadingSpinner size="lg" />
    </div>

    <div v-else-if="project" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header Actions -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ project.displayName }}</h1>
          <p class="text-gray-600">{{ project.description }}</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="testAdapter"
            :disabled="testing"
            class="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition disabled:opacity-50"
          >
            {{ testing ? 'Testing...' : '🧪 Test' }}
          </button>
          <button
            @click="saveProject"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : '💾 Save' }}
          </button>
          <button
            @click="showPublishModal = true"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            📦 Publish
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'code'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'code'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Code
          </button>
          <button
            @click="activeTab = 'config'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'config'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Configuration
          </button>
          <button
            @click="activeTab = 'test'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'test'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Test Results
          </button>
          <button
            @click="activeTab = 'docs'"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'docs'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Documentation
          </button>
        </nav>
      </div>

      <!-- Code Tab -->
      <div v-if="activeTab === 'code'" class="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-6">
        <div class="mb-4">
          <h3 class="text-lg font-semibold text-white mb-2">Adapter Implementation</h3>
          <p class="text-sm text-gray-400">Edit your adapter code below. The code uses the @brailhq/adapter-kit SDK.</p>
        </div>

        <div class="border border-gray-500/30 rounded-lg overflow-hidden">
          <div class="bg-gray-900 text-white p-2 text-xs font-mono flex items-center justify-between">
            <span>src/index.ts</span>
            <button
              @click="copyCode"
              class="px-2 py-1 bg-gray-700 rounded text-xs hover:bg-gray-600 transition"
            >
              📋 Copy
            </button>
          </div>
          <textarea
            v-model="project.code"
            rows="25"
            class="w-full p-4 font-mono text-sm bg-gray-900 text-gray-100 border-0 focus:ring-0"
            style="tab-size: 2"
          />
        </div>

        <div class="mt-4 p-4 bg-blue-300/10 border border-blue-300/30 rounded-lg">
          <h4 class="font-semibold text-blue-300 mb-2">💡 Quick Tips</h4>
          <ul class="text-sm text-gray-300 space-y-1">
            <li>• Use <code class="bg-gray-500/30 px-1 rounded">ctx.logger</code> for logging</li>
            <li>• Return deployment info from <code class="bg-gray-500/30 px-1 rounded">upload()</code></li>
            <li>• Implement <code class="bg-gray-500/30 px-1 rounded">rollback()</code> for zero-downtime deployments</li>
            <li>• Test your adapter before publishing</li>
          </ul>
        </div>
      </div>

      <!-- Config Tab -->
      <div v-if="activeTab === 'config'" class="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Adapter Configuration</h3>

        <form class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">Required Configuration Fields</label>
            <div class="space-y-2">
              <div
                v-for="(field, index) in project.config.requiredFields"
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="project.config.requiredFields[index]"
                  type="text"
                  placeholder="fieldName"
                  class="flex-1 px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-white placeholder-gray-500"
                />
                <button
                  @click="project.config.requiredFields.splice(index, 1)"
                  class="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <button
                @click="project.config.requiredFields.push('')"
                class="text-sm text-blue-300 hover:text-blue-200 font-medium"
              >
                + Add Field
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">Optional Configuration Fields</label>
            <div class="space-y-2">
              <div
                v-for="(field, index) in project.config.optionalFields"
                :key="index"
                class="flex items-center gap-2"
              >
                <input
                  v-model="project.config.optionalFields[index]"
                  type="text"
                  placeholder="fieldName"
                  class="flex-1 px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-white placeholder-gray-500"
                />
                <button
                  @click="project.config.optionalFields.splice(index, 1)"
                  class="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <button
                @click="project.config.optionalFields.push('')"
                class="text-sm text-blue-300 hover:text-blue-200 font-medium"
              >
                + Add Field
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- Test Results Tab -->
      <div v-if="activeTab === 'test'" class="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Test Results</h3>

        <div v-if="!testResults" class="text-center py-12">
          <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
            <div class="text-6xl">🧪</div>
          </div>
          <p class="text-gray-400 mb-4">No test results yet.</p>
          <button
            @click="testAdapter"
            :disabled="testing"
            class="bg-blue-300 text-black px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
          >
            {{ testing ? 'Testing...' : 'Run Tests' }}
          </button>
        </div>

        <div v-else>
          <div
            :class="[
              'mb-6 p-4 rounded-lg border-2',
              testResults.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
            ]"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">{{ testResults.success ? '✅' : '❌' }}</span>
              <span :class="['font-semibold text-lg', testResults.success ? 'text-green-400' : 'text-red-400']">
                {{ testResults.success ? 'All Tests Passed' : 'Tests Failed' }}
              </span>
            </div>
            <p class="text-sm text-gray-400">
              Tested at {{ new Date(testResults.timestamp).toLocaleString() }}
            </p>
          </div>

          <div class="space-y-3">
            <div
              v-for="(result, index) in testResults.results"
              :key="index"
              :class="[
                'p-4 rounded-lg border',
                result.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
              ]"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div :class="['font-semibold', result.passed ? 'text-green-400' : 'text-red-400']">{{ result.test }}</div>
                  <div class="text-sm text-gray-400">{{ result.message }}</div>
                </div>
                <span class="text-2xl">{{ result.passed ? '✅' : '❌' }}</span>
              </div>
            </div>
          </div>

          <button
            @click="testAdapter"
            :disabled="testing"
            class="mt-6 bg-blue-300 text-black px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
          >
            {{ testing ? 'Testing...' : 'Run Tests Again' }}
          </button>
        </div>
      </div>

      <!-- Documentation Tab -->
      <div v-if="activeTab === 'docs'" class="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border border-gray-500/20 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Adapter SDK Documentation</h3>

        <div class="prose max-w-none">
          <h4 class="font-semibold text-lg text-white mb-2">Core Methods</h4>
          <ul class="space-y-2 mb-6 text-gray-300">
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">validateConfig(config)</code>
              - Validate adapter configuration
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">upload(ctx, input)</code>
              - Upload files to destination
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">activate(ctx, input)</code>
              - Activate deployment
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">rollback(ctx, input)</code>
              - Rollback to previous version (optional)
            </li>
          </ul>

          <h4 class="font-semibold text-lg text-white mb-2">Helper Functions</h4>
          <ul class="space-y-2 mb-6 text-gray-300">
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">validateRequired(config, fields)</code>
              - Validate required fields
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">createLogger(name)</code>
              - Create prefixed logger
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">sleep(ms)</code>
              - Async sleep helper
            </li>
            <li>
              <code class="bg-gray-500/30 px-2 py-1 rounded text-blue-300">retry(fn, options)</code>
              - Retry with exponential backoff
            </li>
          </ul>

          <h4 class="font-semibold text-lg mb-2">Resources</h4>
          <ul class="space-y-2">
            <li>
              <a
                href="https://github.com/kagehq/brail/tree/main/docs/ADAPTER_SDK.md"
                target="_blank"
                class="text-purple-600 hover:text-purple-700"
              >
                📚 Full SDK Documentation →
              </a>
            </li>
            <li>
              <a
                href="https://github.com/kagehq/brail/tree/main/packages/adapters"
                target="_blank"
                class="text-purple-600 hover:text-purple-700"
              >
                💡 Example Adapters →
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Publish Modal -->
    <div
      v-if="showPublishModal"
      class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      @click.self="showPublishModal = false"
    >
      <div class="bg-black border border-gray-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h2 class="text-2xl font-bold text-white mb-4">Publish Adapter</h2>
        <p class="text-gray-400 mb-6">
          Publishing will make your adapter available in the adapter catalog. Make sure you've tested it thoroughly.
        </p>

        <form @submit.prevent="publishAdapter" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Version</label>
            <input
              v-model="publishVersion"
              type="text"
              placeholder="1.0.0"
              pattern="^\d+\.\d+\.\d+$"
              required
              class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">
              Changelog (optional)
            </label>
            <textarea
              v-model="publishChangelog"
              rows="3"
              placeholder="Initial release"
              class="w-full px-3 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-white placeholder-gray-500"
            />
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="publishing"
              class="flex-1 bg-blue-300 text-black py-3 rounded-lg font-semibold hover:bg-blue-400 transition disabled:opacity-50"
            >
              {{ publishing ? 'Publishing...' : 'Publish' }}
            </button>
            <button
              type="button"
              @click="showPublishModal = false"
              class="px-6 py-3 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/10 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const api = useApi();
const { showToast } = useToast();

const user = ref<any>(null);
const projectId = route.params.id as string;

const project = ref<any>(null);
const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const publishing = ref(false);
const activeTab = ref('code');
const testResults = ref<any>(null);
const showPublishModal = ref(false);
const publishVersion = ref('1.0.0');
const publishChangelog = ref('');

async function loadProject() {
  try {
    loading.value = true;
    project.value = await api.fetch(`/v1/adapter-builder/projects/${projectId}`);
  } catch (error: any) {
    showToast({
      type: 'error',
      message: 'Failed to load project',
    });
    router.push('/adapter-builder');
  } finally {
    loading.value = false;
  }
}

async function saveProject() {
  try {
    saving.value = true;
    await api.fetch(`/v1/adapter-builder/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        code: project.value.code,
        config: project.value.config,
      }),
    });
    showToast({
      type: 'success',
      message: 'Project saved successfully',
    });
  } catch (error: any) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to save project',
    });
  } finally {
    saving.value = false;
  }
}

async function testAdapter() {
  try {
    testing.value = true;
    testResults.value = await api.fetch(`/v1/adapter-builder/projects/${projectId}/test`, {
      method: 'POST',
      body: JSON.stringify({
        testConfig: {},
      }),
    });
    activeTab.value = 'test';
    showToast({
      type: testResults.value.success ? 'success' : 'error',
      message: testResults.value.success ? 'All tests passed!' : 'Some tests failed',
    });
  } catch (error: any) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to run tests',
    });
  } finally {
    testing.value = false;
  }
}

async function publishAdapter() {
  try {
    publishing.value = true;
    const result = await api.fetch(`/v1/adapter-builder/projects/${projectId}/publish`, {
      method: 'POST',
      body: JSON.stringify({
        version: publishVersion.value,
        changelog: publishChangelog.value,
      }),
    });
    showToast({
      type: 'success',
      message: 'Adapter published successfully!',
    });
    showPublishModal.value = false;
    loadProject();
  } catch (error: any) {
    showToast({
      type: 'error',
      message: error.message || 'Failed to publish adapter',
    });
  } finally {
    publishing.value = false;
  }
}

function copyCode() {
  navigator.clipboard.writeText(project.value.code);
  showToast({
    type: 'success',
    message: 'Code copied to clipboard',
  });
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

  loadProject();
});
</script>

