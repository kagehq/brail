<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="files"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <h1 class="text-3xl font-bold text-white mb-6">{{ site?.name || 'Loading...' }}</h1>
      
      <!-- File Browser -->
      <div class="bg-black border border-gray-500/25 rounded-xl shadow-lg overflow-hidden">
        <div class="border-b border-gray-500/25 p-5 bg-gradient-to-b from-gray-500/5 to-transparent">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              File Browser
            </h2>
            <div class="flex items-center gap-3">
              <button
                v-if="files.length > 0"
                @click="downloadAllAsZip"
                :disabled="downloadingZip"
                class="px-4 py-2 bg-blue-300/10 hover:bg-blue-300/10 text-blue-300 rounded-lg border border-blue-300/20 hover:border-blue-300/40 transition-all text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LoadingSpinner v-if="downloadingZip" size="sm" />
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ downloadingZip ? 'Creating ZIP...' : 'Download All' }}
              </button>
              <div class="text-sm text-gray-400 bg-gray-500/10 px-3 py-1 rounded-lg border border-gray-500/20">
                <span class="font-semibold text-white">{{ filteredFiles.length }}</span> of <span class="font-semibold text-white">{{ files.length }}</span> {{ files.length === 1 ? 'file' : 'files' }}
              </div>
            </div>
          </div>
          
          <!-- Search & Filter -->
          <div v-if="files.length > 0">
            <SearchFilter
              v-model="searchQuery"
              v-model:filter-value="filterValue"
              search-placeholder="Search files..."
              :filter-options="filterOptions"
            />
          </div>
        </div>
        
        <!-- Loading state -->
        <div v-if="loading" class="p-6 space-y-3 animate-pulse-slow">
          <div v-for="i in 8" :key="i" class="flex items-center gap-3 p-3 bg-gray-500/5 rounded-lg">
            <div class="w-5 h-5 bg-gray-500/20 rounded"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-500/20 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-500/15 rounded w-1/4"></div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="files.length === 0" class="p-12 text-center animate-fade-in">
          <div class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-2xl inline-block mb-4">
            <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-gray-400 mb-2 font-semibold">No files found</p>
          <p class="text-sm text-gray-500">Make sure you've uploaded files and <span class="text-blue-300 font-semibold">activated</span> a deployment</p>
          <NuxtLink
            :to="`/sites/${siteId}`"
            class="inline-block mt-4 px-4 py-2 bg-blue-300 text-black text-sm font-semibold rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20"
          >
            Go to Overview
          </NuxtLink>
        </div>
        
        <!-- No results from search/filter -->
        <div v-else-if="filteredFiles.length === 0" class="p-12 text-center animate-fade-in">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p class="text-gray-400 mb-2 font-semibold">No files found</p>
          <p class="text-sm text-gray-500">Try adjusting your search or filter</p>
        </div>
        
        <!-- File List -->
        <div v-else>
          <!-- Use virtual scrolling for large lists (500+ files) -->
          <VirtualList
            v-if="filteredFiles.length > 500"
            :items="filteredFiles"
            :item-height="68"
            container-height="calc(100vh - 400px)"
            key-field="path"
          >
            <template #item="{ item: file }">
              <div
                @click="openPreview(file)"
                @contextmenu.prevent="openContextMenu($event, file)"
                class="flex items-center justify-between p-4 hover:bg-gray-500/5 transition-all group cursor-pointer border-b border-gray-500/10"
              >
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="flex-shrink-0" :class="getFileIconColor(file.path)">
                    <component :is="getFileIcon(file.path)" class="w-5 h-5" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                      {{ file.path }}
                    </div>
                    <div class="text-xs text-gray-500 flex items-center gap-2">
                      <span>{{ formatBytes(file.size) }}</span>
                      <span class="text-gray-600">•</span>
                      <span class="font-mono text-gray-600">{{ getFileExtension(file.path) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all" @click.stop>
                  <button
                    @click="openReplaceDialog(file)"
                    class="px-3 py-1.5 text-xs bg-blue-300/10 hover:bg-blue-300/20 text-blue-300 rounded-lg border border-blue-300/20 hover:border-blue-300/40 transition-all flex items-center gap-1.5"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Replace
                  </button>
                  <button
                    @click="openDeleteDialog(file)"
                    class="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-1.5"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </template>
          </VirtualList>
          
          <!-- Regular list for smaller file counts -->
          <div v-else class="divide-y divide-gray-500/10">
            <div
              v-for="(file, index) in filteredFiles"
              :key="file.path"
              @click="openPreview(file)"
              @contextmenu.prevent="openContextMenu($event, file)"
              class="flex items-center justify-between p-4 hover:bg-gray-500/5 transition-all group animate-fade-in cursor-pointer"
              :style="{ animationDelay: `${index * 20}ms` }"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0" :class="getFileIconColor(file.path)">
                  <component :is="getFileIcon(file.path)" class="w-5 h-5" />
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                    {{ file.path }}
                  </div>
                  <div class="text-xs text-gray-500 flex items-center gap-2">
                    <span>{{ formatBytes(file.size) }}</span>
                    <span class="text-gray-600">•</span>
                    <span class="font-mono text-gray-600">{{ getFileExtension(file.path) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all" @click.stop>
                <button
                  @click="openReplaceDialog(file)"
                  class="px-3 py-1.5 text-xs bg-blue-300/10 hover:bg-blue-300/20 text-blue-300 rounded-lg border border-blue-300/20 hover:border-blue-300/40 transition-all flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Replace
                </button>
                <button
                  @click="openDeleteDialog(file)"
                  class="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- File Preview Modal -->
    <FilePreviewModal
      v-if="previewFile"
      :show="showPreview"
      :file="previewFile"
      :site-id="siteId"
      @close="showPreview = false"
    />
    
    <!-- Context Menu -->
    <ContextMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="contextMenu.show = false"
    />
    
    <!-- Replace File Dialog -->
    <div
      v-if="replaceDialog.show"
      class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      @click.self="replaceDialog.show = false"
    >
      <div class="bg-black border border-gray-500/25 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-xl font-semibold mb-4 text-white">Replace File</h3>
        
        <div class="mb-4">
          <div class="text-sm text-gray-400 mb-2">File to replace:</div>
          <div class="text-white font-medium font-mono bg-gray-500/10 p-2 border border-gray-500/10 rounded-lg">{{ replaceDialog.file?.path }}</div>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm text-gray-400 mb-2">
            Choose new file:
          </label>
          <input
            type="file"
            @change="handleFileSelect"
            class="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border
              file:text-sm file:font-semibold
              file:bg-blue-300/5 file:border-blue-300/10 file:text-blue-300
              hover:file:bg-blue-300/10 file:cursor-pointer
              cursor-pointer"
          />
        </div>
        
        <div class="mb-6">
          <label class="flex items-center gap-2 text-sm text-gray-400">
            <input
              v-model="replaceDialog.activate"
              type="checkbox"
              class="rounded border-gray-500/25 bg-black text-blue-300 focus:ring-blue-300 focus:ring-offset-0"
            />
            Activate immediately
          </label>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="performReplace"
            :disabled="!replaceDialog.selectedFile || replaceDialog.uploading"
            class="flex-1 px-4 py-2 text-sm bg-blue-300 hover:bg-blue-400 disabled:bg-gray-500/40 disabled:text-gray-400 text-black rounded font-medium transition"
          >
            {{ replaceDialog.uploading ? 'Replacing...' : 'Replace' }}
          </button>
          <button
            @click="replaceDialog.show = false"
            :disabled="replaceDialog.uploading"
            class="px-4 py-2 bg-gray-500/10 font-medium text-sm border border-gray-500/10 hover:bg-gray-500/15 text-white rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete File Dialog -->
    <div
      v-if="deleteDialog.show"
      class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      @click.self="deleteDialog.show = false"
    >
      <div class="bg-black border border-gray-500/25 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 class="text-xl font-semibold mb-4 text-white">Delete File</h3>
        
        <div class="mb-4">
          <div class="text-sm text-gray-400 mb-2">Are you sure you want to delete:</div>
          <div class="text-white font-medium font-mono bg-gray-500/10 p-2 border border-gray-500/10 rounded-lg">{{ deleteDialog.file?.path }}</div>
        </div>
        
        <div class="mb-6">
          <label class="flex items-center gap-2 text-sm text-gray-400">
            <input
              v-model="deleteDialog.activate"
              type="checkbox"
              class="rounded border-gray-500/25 bg-black text-blue-300 focus:ring-blue-300 focus:ring-offset-0"
            />
            Activate immediately
          </label>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="performDelete"
            :disabled="deleteDialog.deleting"
            class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:bg-gray-500/40 disabled:text-gray-400 text-white rounded font-medium transition"
          >
            {{ deleteDialog.deleting ? 'Deleting...' : 'Delete' }}
          </button>
          <button
            @click="deleteDialog.show = false"
            :disabled="deleteDialog.deleting"
            class="px-4 py-2 bg-gray-500/10 font-medium text-sm border border-gray-500/10 hover:bg-gray-500/15 text-white rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import JSZip from 'jszip'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const siteId = route.params.id as string
const api = useApi()
const toast = useToast()

interface FileEntry {
  path: string
  size: number
  etag: string
}

const loading = ref(true)
const user = ref<any>(null)
const site = ref<any>(null)
const files = ref<FileEntry[]>([])
const downloadingZip = ref(false)

// Search & Filter state
const searchQuery = ref('')
const filterValue = ref('all')
const filterOptions = [
  { label: 'All Files', value: 'all' },
  { label: 'Images', value: 'image' },
  { label: 'Code', value: 'code' },
  { label: 'Styles', value: 'style' },
  { label: 'Documents', value: 'doc' },
]

// File preview state
const previewFile = ref<FileEntry | null>(null)
const showPreview = ref(false)

const replaceDialog = ref({
  show: false,
  file: null as FileEntry | null,
  selectedFile: null as File | null,
  activate: true,
  uploading: false,
})

const deleteDialog = ref({
  show: false,
  file: null as FileEntry | null,
  activate: true,
  deleting: false,
})

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  file: null as FileEntry | null,
})

// Breadcrumbs
const breadcrumbItems = computed(() => [
  { label: 'Sites', to: '/sites' },
  { label: site.value?.name || 'Site', to: `/sites/${siteId}` },
  { label: 'Files', to: `/sites/${siteId}/files` },
])

const sortedFiles = computed(() => {
  return [...files.value].sort((a, b) => a.path.localeCompare(b.path))
})

// Filtered files with search and type filter
const filteredFiles = computed(() => {
  let result = sortedFiles.value
  
  // Search by path
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(f => f.path.toLowerCase().includes(query))
  }
  
  // Filter by type
  if (filterValue.value !== 'all') {
    result = result.filter(f => {
      const ext = f.path.split('.').pop()?.toLowerCase()
      switch (filterValue.value) {
        case 'image':
          return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')
        case 'code':
          return ['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'rb', 'go', 'java', 'php'].includes(ext || '')
        case 'style':
          return ['css', 'scss', 'sass', 'less'].includes(ext || '')
        case 'doc':
          return ['html', 'md', 'txt', 'json', 'xml', 'yml', 'yaml'].includes(ext || '')
        default:
          return true
      }
    })
  }
  
  return result
})

function openPreview(file: FileEntry) {
  previewFile.value = file
  showPreview.value = true
}

async function downloadAllAsZip() {
  downloadingZip.value = true
  const toastId = toast.loading('Creating ZIP file...')
  
  try {
    const zip = new JSZip()
    
    // Fetch and add each file to the ZIP
    let completed = 0
    for (const file of files.value) {
      try {
        const fileUrl = `${config.public.apiUrl}/public/${siteId}${file.path}`
        const response = await fetch(fileUrl)
        
        if (!response.ok) {
          console.warn(`Failed to fetch ${file.path}`)
          continue
        }
        
        const blob = await response.blob()
        zip.file(file.path.replace(/^\//, ''), blob)
        
        completed++
        toast.loading(`Creating ZIP file... (${completed}/${files.value.length})`)
      } catch (error) {
        console.error(`Error adding ${file.path} to ZIP:`, error)
      }
    }
    
    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, (metadata) => {
      const percent = Math.round(metadata.percent)
      toast.loading(`Compressing... ${percent}%`)
    })
    
    // Download
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${site.value?.name || 'site'}-files.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('ZIP Downloaded', `Downloaded ${completed} files`)
  } catch (error: any) {
    console.error('Failed to create ZIP:', error)
    toast.error('Failed to create ZIP', error.message)
  } finally {
    downloadingZip.value = false
  }
}

// Context menu items
const contextMenuItems = computed(() => {
  if (!contextMenu.value.file) return []
  
  return [
    {
      label: 'Preview',
      icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' }),
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' }),
      ]),
      action: () => openPreview(contextMenu.value.file!),
    },
    {
      label: 'Copy Path',
      icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' }),
      ]),
      action: () => copyFilePath(contextMenu.value.file!),
      shortcut: '⌘C',
    },
    {
      label: 'Replace',
      icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' }),
      ]),
      action: () => openReplaceDialog(contextMenu.value.file!),
    },
    {
      label: 'Delete',
      icon: h('svg', { class: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' }),
      ]),
      action: () => openDeleteDialog(contextMenu.value.file!),
      danger: true,
      shortcut: '⌫',
    },
  ]
})

const openContextMenu = (event: MouseEvent, file: FileEntry) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    file,
  }
}

const copyFilePath = async (file: FileEntry) => {
  try {
    await navigator.clipboard.writeText(file.path)
    toast.success('Path Copied', `Copied: ${file.path}`)
  } catch (error: any) {
    console.error('Failed to copy path:', error)
    toast.error('Copy Failed', error.message)
  }
}

onMounted(async () => {
  try {
    // Check if user is authenticated
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      router.push('/login')
      return
    }
    
    user.value = await response.json()
    
    await loadData()
  } catch (error) {
    console.error('Failed to load:', error)
    router.push('/login')
  }
})

async function loadData() {
  loading.value = true
  
  try {
    // Load site info
    site.value = await api.getSite(siteId)
    
    // Load file tree
    const tree = await api.fetch(`/v1/sites/${siteId}/tree`)
    files.value = tree.files || []
    
    // Debug: log if no active deploy
    if (!site.value.activeDeployId) {
      console.warn('No active deployment found. Please activate a deployment first.')
    }
  } catch (error: any) {
    console.error('Error loading files:', error)
    toast.error('Failed to load files', error.message)
  } finally {
    loading.value = false
  }
}

function openReplaceDialog(file: FileEntry) {
  replaceDialog.value = {
    show: true,
    file,
    selectedFile: null,
    activate: true,
    uploading: false,
  }
}

function openDeleteDialog(file: FileEntry) {
  deleteDialog.value = {
    show: true,
    file,
    activate: true,
    deleting: false,
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    replaceDialog.value.selectedFile = target.files[0]
  }
}

async function performReplace() {
  if (!replaceDialog.value.selectedFile || !replaceDialog.value.file) {
    return
  }
  
  replaceDialog.value.uploading = true
  
  try {
    // Read file as base64
    const arrayBuffer = await replaceDialog.value.selectedFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const contentB64 = btoa(String.fromCharCode(...bytes))
    
    // Determine content type
    const contentType = replaceDialog.value.selectedFile.type || 'application/octet-stream'
    
    // Send patch request
    await api.fetch(`/v1/sites/${siteId}/patch/file`, {
      method: 'POST',
      body: JSON.stringify({
        destPath: replaceDialog.value.file.path,
        contentB64,
        contentType,
        activate: replaceDialog.value.activate,
      }),
    })
    
    toast.success(
      'File Replaced',
      replaceDialog.value.activate
        ? 'File replaced and activated'
        : 'File replaced (not yet active)'
    )
    
    replaceDialog.value.show = false
    
    // Reload file tree
    await loadData()
  } catch (error: any) {
    toast.error('Failed to replace file', error.message)
  } finally {
    replaceDialog.value.uploading = false
  }
}

async function performDelete() {
  if (!deleteDialog.value.file) {
    return
  }
  
  deleteDialog.value.deleting = true
  
  try {
    await api.fetch(`/v1/sites/${siteId}/patch/delete`, {
      method: 'POST',
      body: JSON.stringify({
        paths: [deleteDialog.value.file.path],
        activate: deleteDialog.value.activate,
      }),
    })
    
    toast.success(
      'File Deleted',
      deleteDialog.value.activate
        ? 'File deleted and activated'
        : 'File deleted (not yet active)'
    )
    
    deleteDialog.value.show = false
    
    // Reload file tree
    await loadData()
  } catch (error: any) {
    toast.error('Failed to delete file', error.message)
  } finally {
    deleteDialog.value.deleting = false
  }
}

function isImageFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getFileExtension(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : 'file'
}

function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z', 'clip-rule': 'evenodd' })
    ])
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'vue', 'py', 'rb', 'go', 'java', 'php', 'swift', 'kt'].includes(ext || '')) {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zm4.03 6.28a.75.75 0 00-1.06-1.06L4.97 9.47a.75.75 0 000 1.06l2.25 2.25a.75.75 0 001.06-1.06L6.56 10l1.72-1.72zm4.5-1.06a.75.75 0 10-1.06 1.06L13.44 10l-1.72 1.72a.75.75 0 101.06 1.06l2.25-2.25a.75.75 0 000-1.06l-2.25-2.25z', 'clip-rule': 'evenodd' })
    ])
  }
  
  // CSS/Style files
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { d: 'M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z' })
    ])
  }
  
  // HTML
  if (ext === 'html') {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { 'fill-rule': 'evenodd', d: 'M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z', 'clip-rule': 'evenodd' })
    ])
  }
  
  // JSON/Config
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'config'].includes(ext || '')) {
    return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
      h('path', { d: 'M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z' })
    ])
  }
  
  // Default document icon
  return h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
    h('path', { 'fill-rule': 'evenodd', d: 'M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z', 'clip-rule': 'evenodd' })
  ])
}

function getFileIconColor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  
  // Images - green
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext || '')) {
    return 'text-green-400'
  }
  
  // Code files - blue
  if (['js', 'ts', 'jsx', 'tsx', 'vue'].includes(ext || '')) {
    return 'text-blue-400'
  }
  
  // Code files - purple
  if (['py', 'rb', 'go', 'java', 'php', 'swift', 'kt'].includes(ext || '')) {
    return 'text-purple-400'
  }
  
  // CSS - pink
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return 'text-pink-400'
  }
  
  // HTML - orange
  if (ext === 'html') {
    return 'text-orange-400'
  }
  
  // JSON/Config - yellow
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'config'].includes(ext || '')) {
    return 'text-yellow-400'
  }
  
  // Default - gray
  return 'text-gray-400'
}
</script>

