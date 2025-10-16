<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-black border border-gray-500/25 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="p-6 py-4 border-b border-gray-500/25 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div :class="getFileIconColor(file.path)">
              <component :is="getFileIcon(file.path)" class="w-6 h-6" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-semibold text-white truncate">{{ fileName }}</h3>
              <p class="text-sm text-gray-500 font-mono">{{ formatBytes(file.size) }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button
              @click="downloadFile"
              class="px-4 py-2 bg-blue-300/10 text-sm hover:bg-blue-300/10 text-blue-300 rounded-lg border border-blue-300/20 hover:border-blue-300/40 transition-all flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              @click="$emit('close')"
              class="px-4 py-2 bg-gray-500/10 text-sm hover:bg-gray-500/20 text-gray-300 rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all"
            >
              Close
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-auto p-6 scrollbar-thin">
          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-20">
            <LoadingMessage />
          </div>
          
          <!-- Error -->
          <div v-else-if="error" class="text-center py-20">
            <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-red-400 font-semibold mb-2">Failed to load file</p>
            <p class="text-gray-500 text-sm">{{ error }}</p>
          </div>
          
          <!-- Image Preview -->
          <div v-else-if="isImage" class="flex items-center justify-center">
            <img
              :src="previewUrl"
              :alt="fileName"
              class="max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
          
          <!-- Code/Text Preview -->
          <div v-else-if="isText" class="bg-black border border-black rounded-lg overflow-hidden">
            <div v-if="highlightedCode" v-html="highlightedCode" class="text-sm overflow-x-auto scrollbar-thin"></div>
            <pre v-else class="p-6 text-sm text-gray-300 font-mono overflow-x-auto scrollbar-thin"><code>{{ content }}</code></pre>
          </div>
          
          <!-- Unsupported -->
          <div v-else class="text-center py-20">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p class="text-gray-400 font-semibold mb-2">Preview not available</p>
            <p class="text-gray-500 text-sm mb-4">This file type cannot be previewed</p>
            <button
              @click="downloadFile"
              class="px-4 py-2 bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition-all font-semibold"
            >
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { codeToHtml } from 'shiki';

interface FileEntry {
  path: string;
  size: number;
  etag: string;
}

interface Props {
  show: boolean;
  file: FileEntry;
  siteId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const config = useRuntimeConfig();
const loading = ref(true);
const error = ref('');
const content = ref('');
const previewUrl = ref('');
const highlightedCode = ref('');

const fileName = computed(() => {
  return props.file.path.split('/').pop() || props.file.path;
});

const fileExtension = computed(() => {
  return props.file.path.split('.').pop()?.toLowerCase() || '';
});

const isImage = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(fileExtension.value);
});

const isText = computed(() => {
  return ['html', 'css', 'js', 'ts', 'json', 'md', 'txt', 'xml', 'yml', 'yaml', 'vue', 'jsx', 'tsx'].includes(fileExtension.value);
});

watch(() => props.show, async (show) => {
  if (show) {
    await loadPreview();
  } else {
    // Reset state when modal closes
    loading.value = true;
    error.value = '';
    content.value = '';
    previewUrl.value = '';
    highlightedCode.value = '';
  }
}, { immediate: true });

async function loadPreview() {
  loading.value = true;
  error.value = '';
  highlightedCode.value = '';
  
  try {
    // Construct file URL
    const fileUrl = `${config.public.apiUrl}/public/${props.siteId}${props.file.path}`;
    
    if (isImage.value) {
      previewUrl.value = fileUrl;
    } else if (isText.value) {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to load file');
      content.value = await response.text();
      
      // Apply syntax highlighting
      await highlightCode();
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load preview';
  } finally {
    loading.value = false;
  }
}

async function highlightCode() {
  if (!content.value) return;
  
  try {
    // Map file extension to language
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'vue': 'vue',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'txt': 'text',
    };
    
    const lang = langMap[fileExtension.value] || 'text';
    
    highlightedCode.value = await codeToHtml(content.value, {
      lang,
      theme: 'github-dark',
      defaultColor: false,
    });
    
    // Replace the background color with pure black
    highlightedCode.value = highlightedCode.value.replace(
      /background-color:[^;]+/g,
      'background-color:#000000',
    );
  } catch (err) {
    console.error('Failed to highlight code:', err);
    // Fall back to plain text if highlighting fails
  }
}

function downloadFile() {
  const fileUrl = `${config.public.apiUrl}/public/${props.siteId}${props.file.path}`;
  window.open(fileUrl, '_blank');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Reuse file icon functions from files page
function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z', 'clip-rule': 'evenodd' })
    ]);
  }
  
  return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
    h('path', { 'fill-rule': 'evenodd', d: 'M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5z', 'clip-rule': 'evenodd' })
  ]);
}

function getFileIconColor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return 'text-green-400';
  }
  
  if (['js', 'ts', 'jsx', 'tsx', 'vue'].includes(ext || '')) {
    return 'text-blue-400';
  }
  
  if (['html'].includes(ext || '')) {
    return 'text-orange-400';
  }
  
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return 'text-pink-400';
  }
  
  if (['json', 'yaml', 'yml'].includes(ext || '')) {
    return 'text-yellow-400';
  }
  
  return 'text-gray-400';
}
</script>

