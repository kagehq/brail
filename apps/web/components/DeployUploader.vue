<template>
  <div>
    <!-- Drag & Drop Overlay -->
    <DragDropOverlay :show="isDragging" />

    <!-- Build Options (CLI Note) -->
    <div v-if="!currentDeploy" class="bg-gradient-to-br from-gray-500/5 to-transparent border border-gray-500/20 rounded-xl p-5 mb-4">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 bg-blue-300/10 border border-blue-300/20 rounded-lg p-2">
          <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="text-sm font-semibold text-white mb-1">Need to build first?</h4>
          <p class="text-xs text-gray-400 mb-3">
            For Next.js, Astro, Vite, or other frameworks, use the CLI to build before deploying:
          </p>
          <div class="bg-black/40 border border-gray-500/20 rounded-lg p-3">
            <code class="text-xs text-green-300 font-mono">
              br drop . --build auto
            </code>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Or build manually with: <code class="text-gray-400 font-mono">br build .</code>
          </p>
        </div>
      </div>
    </div>
    
    <div
      v-if="!currentDeploy"
      class="border-2 border-dashed border-gray-500/25 rounded-lg p-12 text-center hover:border-gray-500/60 transition cursor-pointer"
      @click="triggerFileInput"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      :class="{ 'border-blue-300 bg-blue-300/5': isDragging }"
    >
      <input
        ref="fileInput"
        type="file"
        webkitdirectory
        directory
        multiple
        @change="handleFiles"
        class="hidden"
      />
      
      <div class="text-6xl mb-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-12 mx-auto text-gray-500">
          <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v3.26a3.235 3.235 0 0 1 1.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75ZM3.75 9A1.75 1.75 0 0 0 2 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-4.5A1.75 1.75 0 0 0 16.25 9H3.75Z" />
        </svg>
      </div>
      <h3 class="text-xl font-semibold mb-2 text-white">Drop a folder here</h3>
      <p class="text-gray-400 mb-4">or click to select a folder</p>
      <button
        type="button"
        class="bg-blue-300 text-sm font-medium text-black px-6 py-2 rounded-lg hover:bg-blue-400 transition"
      >
        Select Folder
      </button>
    </div>
    
    <div v-else class="space-y-4">
      <!-- Progress Overview -->
      <div class="bg-gradient-to-br from-blue-300/10 to-transparent border border-blue-300/20 rounded-xl p-5 mb-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Uploading {{ files.length }} files
            </h3>
            <p class="text-sm text-gray-400 mt-1">
              {{ uploadedCount }} of {{ files.length }} completed
              <span v-if="estimatedTimeRemaining > 0" class="text-gray-500">
                · {{ formatTime(estimatedTimeRemaining) }} remaining
              </span>
            </p>
          </div>
          
          <div class="text-right">
            <div class="text-3xl font-bold text-blue-300 mb-1">
              {{ Math.round(overallProgress) }}%
            </div>
            <div class="text-xs text-gray-500">
              {{ formatBytes(uploadedBytes) }} / {{ formatBytes(totalBytes) }}
            </div>
            <div v-if="uploadSpeed > 0" class="text-xs text-gray-600 mt-1">
              {{ formatBytes(uploadSpeed) }}/s
            </div>
          </div>
        </div>
        
        <!-- Enhanced Progress Bar -->
        <div class="relative w-full bg-gray-500/20 rounded-full h-4 overflow-hidden">
          <div
            class="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 h-full transition-all duration-300 animate-shimmer"
            :style="{ width: `${overallProgress}%` }"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-xs font-semibold text-white drop-shadow-lg">
              {{ Math.round(overallProgress) }}%
            </span>
          </div>
        </div>
      </div>
      
      <!-- File List -->
      <div class="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
        <div
          v-for="file in files"
          :key="file.path"
          class="bg-gray-500/10 border border-gray-500/15 mt-1 rounded-lg p-3 hover:bg-gray-500/15 transition-all"
          :class="{ 'border-gray-500/15 bg-gray-500/5': file.progress === 100, 'border-red-500/30 bg-red-500/5': file.error }"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate text-white">
                {{ file.path }}
              </div>
              <div class="text-xs text-gray-400">
                {{ formatBytes(file.size) }}
              </div>
            </div>
            
            <div class="ml-4 flex items-center gap-3">
              <div v-if="file.progress < 100 && !file.error" class="text-sm font-semibold text-blue-300">
                {{ Math.round(file.progress) }}%
              </div>
              <div
                v-if="file.progress === 100"
                class="text-green-300 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                </svg>
                <span class="text-xs font-medium">Done</span>
              </div>
              <div
                v-else-if="file.error"
                class="text-red-400 flex items-center gap-1"
                :title="file.error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
                <span class="text-xs font-medium">Failed</span>
              </div>
            </div>
          </div>
          
          <!-- Individual File Progress Bar -->
          <div v-if="file.progress < 100 && !file.error" class="w-full bg-gray-500/20 rounded-full h-1.5 overflow-hidden">
            <div
              class="bg-blue-300 h-full transition-all duration-300"
              :style="{ width: `${file.progress}%` }"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Deployment Notes -->
      <div v-if="canFinalize" class="pt-4 border-t border-gray-500/25">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Deployment Notes (Optional)
        </label>
        <textarea
          v-model="deploymentNotes"
          rows="2"
          placeholder="Add a description or notes for this deployment..."
          class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600 resize-none"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">
          Describe what changed in this deployment
        </p>
      </div>
      
      <!-- Destination Selection (Phase 1) -->
      <div v-if="canFinalize && profiles.length > 0" class="pt-4 border-t border-gray-500/25">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Deploy Destination (Optional)
        </label>
        <select
          v-model="selectedProfile"
          class="w-full bg-gray-500/10 border border-gray-500/25 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option :value="null">Phase 0 (Brail Storage Only)</option>
          <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
            {{ profile.name }} ({{ profile.adapter }})
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-400">
          <span v-if="!selectedProfile">Files will be stored in Brail's storage</span>
          <span v-else>Files will be deployed to your infrastructure via {{ selectedProfileAdapter }}</span>
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-3 pt-4">
        <button
          v-if="canFinalize"
          @click="finalizeDeploy"
          :disabled="finalizing || activating"
          class="flex-1 bg-blue-300 text-sm font-medium text-black py-2 px-4 rounded-lg hover:bg-blue-400 transition disabled:opacity-50"
        >
          {{ getDeployButtonText() }}
        </button>
        
        <button
          @click="cancelUpload"
          :disabled="finalizing || activating"
          class="px-4 py-2 bg-gray-500/10 text-sm font-medium text-white border border-gray-500/15 rounded-lg hover:bg-gray-500/15 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatBytes } from '@br/shared';
import { toast as sonnerToast } from 'vue-sonner';

const props = defineProps<{
  siteId: string;
}>();

const emit = defineEmits<{
  deployCreated: [deployId: string];
  uploadComplete: [deployId: string];
}>();

const api = useApi();
const config = useRuntimeConfig();

// Helper function to format time
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
};

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const currentDeploy = ref<string | null>(null);

interface FileUpload {
  path: string;
  file: File;
  size: number;
  progress: number;
  error?: string;
}

interface ConnectionProfile {
  id: string;
  name: string;
  adapter: string;
  isDefault: boolean;
}

const files = ref<FileUpload[]>([]);
const finalizing = ref(false);
const activating = ref(false);
const profiles = ref<ConnectionProfile[]>([]);
const selectedProfile = ref<string | null>(null);
const deploymentNotes = ref<string>('');

// Upload speed tracking
const uploadStartTime = ref<number>(0);
const lastUploadedBytes = ref<number>(0);
const lastUpdateTime = ref<number>(0);
const uploadSpeed = ref<number>(0);

const uploadedCount = computed(() => {
  return files.value.filter((f) => f.progress === 100).length;
});

const totalBytes = computed(() => {
  return files.value.reduce((sum, f) => sum + f.size, 0);
});

const uploadedBytes = computed(() => {
  return files.value.reduce((sum, f) => sum + (f.size * f.progress / 100), 0);
});

const overallProgress = computed(() => {
  if (totalBytes.value === 0) return 0;
  return (uploadedBytes.value / totalBytes.value) * 100;
});

const estimatedTimeRemaining = computed(() => {
  if (uploadSpeed.value === 0) return 0;
  const remainingBytes = totalBytes.value - uploadedBytes.value;
  return remainingBytes / uploadSpeed.value; // seconds
});

const canFinalize = computed(() => {
  return uploadedCount.value === files.value.length && uploadedCount.value > 0;
});

const selectedProfileAdapter = computed(() => {
  if (!selectedProfile.value) return '';
  const profile = profiles.value.find(p => p.id === selectedProfile.value);
  return profile?.adapter || '';
});

// Update browser title during upload
const originalTitle = ref(document.title);
watch(overallProgress, (progress) => {
  if (currentDeploy.value && progress > 0 && progress < 100) {
    document.title = `(${Math.round(progress)}%) Uploading... - Brail`;
  } else if (progress === 100 && uploadedCount.value === files.value.length) {
    document.title = '✓ Upload Complete - Brail';
    // Restore original title after 3 seconds
    setTimeout(() => {
      document.title = originalTitle.value;
    }, 3000);
  }
});

// Fetch connection profiles on mount
onMounted(async () => {
  // Store original title
  originalTitle.value = document.title;
  
  try {
    const response = await api.fetch(`/v1/sites/${props.siteId}/profiles`);
    profiles.value = response;
    
    // Auto-select default profile if exists
    const defaultProfile = profiles.value.find(p => p.isDefault);
    if (defaultProfile) {
      selectedProfile.value = defaultProfile.id;
    }
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
  }
});

const getDeployButtonText = () => {
  if (activating.value) return 'Deploying...';
  if (finalizing.value) return 'Finalizing...';
  if (selectedProfile.value) return 'Finalize & Deploy to Destination';
  return 'Finalize Deploy';
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  
  const items = Array.from(e.dataTransfer?.items || []);
  const entries = items
    .map((item) => item.webkitGetAsEntry())
    .filter(Boolean);
  
  if (entries.length > 0) {
    processEntries(entries);
  }
};

const handleFiles = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const fileList = Array.from(input.files || []);
  
  if (fileList.length > 0) {
    processFileList(fileList);
  }
};

/**
 * Check if a file should be ignored based on .dropignore patterns
 */
const shouldIgnoreFile = (filePath: string, patterns: string[]): boolean => {
  for (const pattern of patterns) {
    // Handle directory patterns (ending with /)
    if (pattern.endsWith('/')) {
      const dir = pattern.slice(0, -1);
      if (filePath.startsWith(dir + '/') || filePath === dir) {
        return true;
      }
    }
    // Handle exact matches
    else if (filePath === pattern) {
      return true;
    }
    // Handle wildcard patterns
    else if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) {
        return true;
      }
    }
    // Handle files within directories
    else if (filePath.startsWith(pattern + '/')) {
      return true;
    }
  }
  return false;
};

const processFileList = async (fileList: File[]) => {
  // Create deploy
  const deploy = await api.createDeploy(props.siteId);
  currentDeploy.value = deploy.deployId;
  emit('deployCreated', deploy.deployId);
  
  // Build file list with relative paths
  const fileUploads: FileUpload[] = [];
  let basePath = '';
  
  // Determine base path from first file
  if (fileList[0].webkitRelativePath) {
    const parts = fileList[0].webkitRelativePath.split('/');
    basePath = parts[0];
  }
  
  // Check for .dropignore file
  let ignorePatterns: string[] = [];
  const dropignoreFile = fileList.find(f => {
    const path = f.webkitRelativePath || f.name;
    return path.endsWith('.dropignore') || path.endsWith('/.dropignore');
  });
  
  if (dropignoreFile) {
    try {
      const ignoreContent = await dropignoreFile.text();
      ignorePatterns = ignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (e) {
      console.warn('Failed to read .dropignore:', e);
    }
  }
  
  for (const file of fileList) {
    let relativePath = file.webkitRelativePath || file.name;
    
    // Remove base directory from path
    if (basePath && relativePath.startsWith(basePath + '/')) {
      relativePath = relativePath.substring(basePath.length + 1);
    }
    
    // Skip files matching .dropignore patterns
    if (shouldIgnoreFile(relativePath, ignorePatterns)) {
      continue;
    }
    
    fileUploads.push({
      path: relativePath,
      file,
      size: file.size,
      progress: 0,
    });
  }
  
  files.value = fileUploads;
  
  // Start uploads
  startUploads();
};

const processEntries = async (entries: any[]) => {
  // Create deploy
  const deploy = await api.createDeploy(props.siteId);
  currentDeploy.value = deploy.deployId;
  emit('deployCreated', deploy.deployId);
  
  const fileUploads: FileUpload[] = [];
  const allFiles: { file: File; path: string }[] = [];
  
  // Recursively read all entries
  const readEntry = async (entry: any, basePath = ''): Promise<void> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name;
          allFiles.push({ file, path: fullPath });
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
          for (const childEntry of entries) {
            await readEntry(childEntry, dirPath);
          }
          resolve();
        });
      });
    }
  };
  
  // Read all entries first
  for (const entry of entries) {
    await readEntry(entry);
  }
  
  // Check for .dropignore file
  let ignorePatterns: string[] = [];
  const dropignoreFile = allFiles.find(f => f.path.endsWith('.dropignore') || f.path === '.dropignore');
  
  if (dropignoreFile) {
    try {
      const ignoreContent = await dropignoreFile.file.text();
      ignorePatterns = ignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (e) {
      console.warn('Failed to read .dropignore:', e);
    }
  }
  
  // Determine base path (first directory dropped)
  let basePath = '';
  if (allFiles.length > 0 && allFiles[0].path.includes('/')) {
    const parts = allFiles[0].path.split('/');
    basePath = parts[0];
  }
  
  // Filter files based on .dropignore and remove base path
  for (const { file, path } of allFiles) {
    let relativePath = path;
    
    // Remove base directory from path
    if (basePath && relativePath.startsWith(basePath + '/')) {
      relativePath = relativePath.substring(basePath.length + 1);
    }
    
    // Skip files matching .dropignore patterns
    if (shouldIgnoreFile(relativePath, ignorePatterns)) {
      continue;
    }
    
    fileUploads.push({
      path: relativePath,
      file,
      size: file.size,
      progress: 0,
    });
  }
  
  files.value = fileUploads;
  
  // Start uploads
  startUploads();
};

const startUploads = async () => {
  const uploadEndpoint = `${config.public.apiUrl}/v1/simple-uploads`;
  
  // Initialize upload tracking
  uploadStartTime.value = Date.now();
  lastUploadedBytes.value = 0;
  lastUpdateTime.value = Date.now();
  
  // Store original title to restore later
  const originalTitle = document.title;
  
  // Get the session token from cookies
  const sessionToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('br_session='))
    ?.split('=')[1];
  
  // Upload files sequentially
  for (const fileUpload of files.value) {
    try {
      const formData = new FormData();
      formData.append('file', fileUpload.file);
      
      const xhr = new XMLHttpRequest();
      
      // Track progress and calculate speed
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          fileUpload.progress = (e.loaded / e.total) * 100;
          
          // Update upload speed every 500ms
          const now = Date.now();
          if (now - lastUpdateTime.value > 500) {
            const currentBytes = uploadedBytes.value;
            const bytesDiff = currentBytes - lastUploadedBytes.value;
            const timeDiff = (now - lastUpdateTime.value) / 1000; // seconds
            uploadSpeed.value = bytesDiff / timeDiff;
            lastUploadedBytes.value = currentBytes;
            lastUpdateTime.value = now;
          }
        }
      });
      
      // Handle completion
      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            fileUpload.progress = 100;
            console.log('Upload complete:', fileUpload.path);
            resolve(true);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('POST', uploadEndpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${sessionToken}`);
        xhr.setRequestHeader('x-deploy-id', currentDeploy.value!);
        xhr.setRequestHeader('x-relpath', fileUpload.path);
        xhr.send(formData);
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      fileUpload.error = error.message;
      sonnerToast.error('Upload Failed', {
        description: `Failed to upload ${fileUpload.path}: ${error.message}`
      });
    }
  }
  
  // Check if any files failed
  const failedFiles = files.value.filter(f => f.error);
  if (failedFiles.length > 0) {
    // Mark deployment as failed on backend
    try {
      await fetch(`${config.public.apiUrl}/v1/deploys/${currentDeploy.value}/fail`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to mark deployment as failed:', error);
    }
    
    sonnerToast.error('Upload Failed', {
      description: `${failedFiles.length} file(s) failed to upload. The deployment has been marked as failed.`
    });
    
    // Emit completion anyway so UI updates
    if (currentDeploy.value) {
      emit('uploadComplete', currentDeploy.value);
    }
    
    // Reset state
    currentDeploy.value = null;
    files.value = [];
    deploymentNotes.value = '';
    return;
  }
};

const finalizeDeploy = async () => {
  if (!currentDeploy.value) return;
  
  finalizing.value = true;
  
  try {
    // Step 1: Finalize (compute hash, file count, etc.) and save comment
    await api.fetch(`/v1/deploys/${currentDeploy.value}/finalize`, {
      method: 'PATCH',
      body: JSON.stringify({
        comment: deploymentNotes.value || undefined,
      }),
    });
    
    // Step 2: If profile selected, deploy to destination
    if (selectedProfile.value) {
      activating.value = true;
      
      try {
        // Stage to adapter
        await api.fetch(`/v1/deploys/${currentDeploy.value}/stage`, {
          method: 'POST',
          body: JSON.stringify({ profileId: selectedProfile.value }),
        });
        
        // Activate via adapter (includes health checks)
        await api.fetch(`/v1/deploys/${currentDeploy.value}/activate`, {
          method: 'POST',
          body: JSON.stringify({ 
            profileId: selectedProfile.value,
            comment: deploymentNotes.value || undefined,
          }),
        });
        
        sonnerToast.success('Deploy Successful!', {
          description: 'Your site is now live on your infrastructure.'
        });
      } catch (error: any) {
        console.error('Failed to deploy to destination:', error);
        sonnerToast.error('Deploy to Destination Failed', {
          description: `${error.message}\n\nYour files are safely stored in Phase 0 storage.`
        });
      }
    }
    
    emit('uploadComplete', currentDeploy.value);
    
    // Reset state
    currentDeploy.value = null;
    files.value = [];
    selectedProfile.value = null;
    deploymentNotes.value = '';
  } catch (error: any) {
    console.error('Failed to finalize deploy:', error);
    sonnerToast.error('Finalization Failed', {
      description: error.message || 'Failed to finalize deployment'
    });
  } finally {
    finalizing.value = false;
    activating.value = false;
  }
};

const cancelUpload = async () => {
  // Mark deployment as failed in the backend
  if (currentDeploy.value) {
    try {
      await api.fetch(`/v1/deploys/${currentDeploy.value}/fail`, {
        method: 'POST',
      });
      
      // Emit completion so the UI updates
      emit('uploadComplete', currentDeploy.value);
    } catch (error: any) {
      console.error('Failed to mark deploy as failed:', error);
      // Still proceed with cancellation locally
    }
  }
  
  // Reset upload state
  currentDeploy.value = null;
  files.value = [];
  deploymentNotes.value = '';
  selectedProfile.value = null;
  
  sonnerToast.info('Upload Cancelled', {
    description: 'The deployment has been cancelled.'
  });
};
</script>

