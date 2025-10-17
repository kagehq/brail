<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="destinations"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-1">Connection Profiles</h1>
          <p class="text-gray-500 text-sm">Configure deployment destinations (SSH servers, S3 buckets, platforms)</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-blue-300 text-sm font-semibold text-black px-5 py-2.5 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 hover:scale-105 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Profile
        </button>
      </div>
      
      <!-- Loading Skeleton -->
      <div v-if="loading" class="grid gap-4 md:grid-cols-2">
        <div v-for="i in 4" :key="i" class="bg-gray-500/5 border border-gray-500/10 p-6 rounded-xl animate-pulse-slow">
          <div class="h-6 bg-gray-500/20 rounded w-3/4 mb-4"></div>
          <div class="h-4 bg-gray-500/15 rounded w-1/2 mb-3"></div>
          <div class="h-4 bg-gray-500/15 rounded w-2/3"></div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="profiles.length === 0" class="text-center py-20 animate-fade-in">
        <div class="max-w-md mx-auto">
          <div class="mb-6 flex justify-center">
            <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-semibold text-white mb-2">No connection profiles yet</h3>
          <p class="text-gray-400 mb-6">Add your first deployment destination to start shipping your sites</p>
          <button
            @click="showCreateModal = true"
            class="bg-blue-300 text-black text-sm font-medium px-6 py-3 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 hover:scale-105"
          >
            Create Your First Profile
          </button>
        </div>
      </div>
      
      <!-- Profile Cards -->
      <div v-else class="grid gap-4 md:grid-cols-2">
        <div
          v-for="(profile, index) in profiles"
          :key="profile.id"
          class="group relative bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/20 p-6 rounded-xl hover:border-gray-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 animate-fade-in"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- Subtle glow on hover -->
          <div class="absolute inset-0 bg-gradient-to-br from-blue-300/0 to-blue-300/0 group-hover:from-blue-300/3 group-hover:to-transparent rounded-xl transition-all duration-300"></div>
          
          <div class="relative flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <!-- Header with icon and badges -->
              <div class="flex items-center gap-3 mb-4">
                <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-500/10 border border-gray-500/20 rounded-lg" :class="getAdapterColor(profile.adapter)">
                  <component :is="getAdapterIcon(profile.adapter)" class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-white truncate">{{ profile.name }}</h3>
                  <p class="text-xs text-gray-500 font-medium">{{ getAdapterLabel(profile.adapter) }}</p>
                </div>
                <span
                  v-if="profile.isDefault"
                  class="flex-shrink-0 px-2.5 py-1 text-xs bg-green-300/10 border border-green-300/20 text-green-300 rounded-lg font-semibold flex items-center gap-1"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                  </svg>
                  DEFAULT
                </span>
              </div>
              
              <!-- Configuration Details -->
              <div class="space-y-2">
                <!-- SSH config -->
                <div v-if="profile.adapter === 'ssh-rsync' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white font-mono truncate">{{ profile.config.user }}@{{ profile.config.host }}:{{ profile.config.port || 22 }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ profile.config.basePath }}</p>
                  </div>
                </div>
                
                <!-- S3 config -->
                <div v-if="profile.adapter === 's3' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white font-mono truncate">s3://{{ profile.config.bucket }}/{{ profile.config.prefix }}</p>
                    <p class="text-xs text-gray-500">{{ profile.config.region }}</p>
                  </div>
                </div>
                
                <!-- Vercel config -->
                <div v-if="profile.adapter === 'vercel' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.projectName || 'Auto-generated' }}</p>
                    <p v-if="profile.config?.productionDomain" class="text-xs text-gray-500 truncate">{{ profile.config.productionDomain }}</p>
                  </div>
                </div>
                
                <!-- Cloudflare Pages config -->
                <div v-if="profile.adapter === 'cloudflare-pages' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.projectName || 'Auto-generated' }}</p>
                    <p class="text-xs text-gray-500 truncate font-mono">{{ profile.config.accountId }}</p>
                  </div>
                </div>
                
                <!-- Cloudflare Sandbox config -->
                <div v-if="profile.adapter === 'cloudflare-sandbox' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.runtime || 'node' }} • {{ profile.config.buildCommand || 'npm run build' }}</p>
                    <p class="text-xs text-gray-500 truncate font-mono">{{ profile.config.accountId }}</p>
                  </div>
                </div>
                
                <!-- Vercel Sandbox config -->
                <div v-if="profile.adapter === 'vercel-sandbox' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.runtime || 'node22' }} • {{ profile.config.vcpus || 2 }} vCPUs</p>
                    <p class="text-xs text-gray-500 truncate font-mono">{{ profile.config.projectId }}</p>
                  </div>
                </div>
                
                <!-- Railway config -->
                <div v-if="profile.adapter === 'railway' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white font-mono truncate">{{ profile.config.projectId }}</p>
                  </div>
                </div>
                
                <!-- Fly config -->
                <div v-if="profile.adapter === 'fly' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.appName || 'Auto-generated' }}</p>
                  </div>
                </div>
                
                <!-- FTP config -->
                <div v-if="profile.adapter === 'ftp' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white font-mono truncate">{{ profile.config.user }}@{{ profile.config.host }}:{{ profile.config.port || 21 }}</p>
                    <p class="text-xs text-gray-500 truncate">{{ profile.config.basePath || '/' }}</p>
                  </div>
                </div>
                
                <!-- GitHub Pages config -->
                <div v-if="profile.adapter === 'github-pages' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white font-mono truncate">{{ profile.config.owner }}/{{ profile.config.repo }}</p>
                    <p class="text-xs text-gray-500">branch: {{ profile.config.branch || 'gh-pages' }}</p>
                  </div>
                </div>
                
                <!-- Netlify config -->
                <div v-if="profile.adapter === 'netlify' && profile.config" class="flex items-start gap-2">
                  <svg class="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ profile.config.siteName || 'Auto-generated' }}</p>
                    <p class="text-xs text-gray-500 font-mono truncate">{{ profile.config.siteId || 'Will create new' }}</p>
                  </div>
                </div>
                
                <!-- Created date -->
                <div class="flex items-center gap-2">
                  <svg class="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-gray-600">{{ formatDate(profile.createdAt) }}</p>
                </div>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex flex-col gap-2 flex-shrink-0">
              <button
                v-if="!profile.isDefault"
                @click="setDefault(profile.id)"
                class="px-3 py-2 text-sm bg-blue-300/10 border border-blue-300/10 text-blue-300 rounded-lg hover:bg-blue-300/20 hover:border-blue-300/30 transition-all font-medium flex items-center justify-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Set Default
              </button>
              <button
                @click="openDeleteConfirmation(profile)"
                class="px-3 py-2 text-sm bg-red-500/10 border border-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all font-medium flex items-center justify-center gap-1.5"
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
    
    <!-- Create Profile Modal -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"
        @click.self="showCreateModal = false"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-150"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="showCreateModal" class="bg-black border border-gray-500/25 p-8 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <h3 class="text-2xl font-bold mb-2 text-white">Add Connection Profile</h3>
            <p class="text-gray-400 text-sm mb-6">Configure a deployment destination for your site</p>
        
        <form @submit.prevent="handleCreate" class="space-y-4" autocomplete="off">
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Profile Name
            </label>
            <input
              v-model="newProfile.name"
              type="text"
              required
              autocomplete="off"
              class="w-full px-4 py-3 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all placeholder:text-gray-600"
              placeholder="production"
            />
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-300 mb-2">
              Adapter
            </label>
            <select
              v-model="newProfile.adapter"
              required
              class="w-full px-4 py-3 text-white border outline-none border-gray-500/25 bg-black rounded-lg focus:ring-2 focus:ring-blue-300/50 focus:border-blue-300/50 transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSIjOUM5QzlDIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[length:12px] bg-[position:right_1rem_center] bg-no-repeat pr-10"
              style="color-scheme: dark;"
            >
              <optgroup label="Traditional / Shared Hosting" class="bg-black text-white">
                <option value="ftp" class="bg-black text-white">FTP</option>
                <option value="ssh-rsync" class="bg-black text-white">SSH + rsync</option>
                <option value="s3" class="bg-black text-white">S3</option>
              </optgroup>
              <optgroup label="Jamstack Platforms" class="bg-black text-white">
                <option value="vercel" class="bg-black text-white">Vercel</option>
                <option value="cloudflare-pages" class="bg-black text-white">Cloudflare Pages</option>
                <option value="netlify" class="bg-black text-white">Netlify</option>
              </optgroup>
              <optgroup label="Cloud & Open Source" class="bg-black text-white">
                <option value="railway" class="bg-black text-white">Railway</option>
                <option value="fly" class="bg-black text-white">Fly.io</option>
                <option value="github-pages" class="bg-black text-white">GitHub Pages</option>
              </optgroup>
              <optgroup label="Dynamic & Server-side" class="bg-black text-white">
                <option value="cloudflare-sandbox" class="bg-black text-white">Cloudflare Sandbox</option>
                <option value="vercel-sandbox" class="bg-black text-white">Vercel Sandbox</option>
              </optgroup>
            </select>
          </div>
          
          <!-- SSH Config -->
          <div v-if="newProfile.adapter === 'ssh-rsync'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">SSH Configuration</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Host *</label>
                <input
                  v-model="newProfile.config.host"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="example.com"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Port</label>
                <input
                  v-model.number="newProfile.config.port"
                  type="number"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="22"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">User *</label>
              <input
                v-model="newProfile.config.user"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="deploy"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Private Key *</label>
              <textarea
                v-model="newProfile.config.privateKey"
                required
                rows="4"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm font-mono"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Base Path *</label>
              <input
                v-model="newProfile.config.basePath"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="/var/www/my-site"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Keep Releases</label>
              <input
                v-model.number="newProfile.config.keepReleases"
                type="number"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="5"
              />
            </div>
          </div>
          
          <!-- S3 Config -->
          <div v-if="newProfile.adapter === 's3'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">S3 Configuration</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Bucket *</label>
                <input
                  v-model="newProfile.config.bucket"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-bucket"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Prefix *</label>
                <input
                  v-model="newProfile.config.prefix"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-site"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Region *</label>
              <input
                v-model="newProfile.config.region"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="us-east-1"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Access Key ID *</label>
              <input
                v-model="newProfile.config.accessKeyId"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="AKIA..."
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Secret Access Key *</label>
              <input
                v-model="newProfile.config.secretAccessKey"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Endpoint (optional)</label>
              <input
                v-model="newProfile.config.endpoint"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="https://s3.amazonaws.com"
              />
            </div>
          </div>
          
          <!-- FTP Config -->
          <div v-if="newProfile.adapter === 'ftp'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">FTP Configuration</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Host *</label>
                <input
                  v-model="newProfile.config.ftpHost"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="ftp.example.com"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Port</label>
                <input
                  v-model.number="newProfile.config.ftpPort"
                  type="number"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="21"
                />
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Username *</label>
                <input
                  v-model="newProfile.config.ftpUser"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="username"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Password *</label>
                <input
                  v-model="newProfile.config.ftpPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Base Path</label>
              <input
                v-model="newProfile.config.ftpBasePath"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="/public_html"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input
                v-model="newProfile.config.ftpSecure"
                type="checkbox"
                class="rounded border-gray-500/25 bg-gray-500/10 text-blue-500"
              />
              <label class="text-sm text-gray-400">Use FTPS (secure FTP)</label>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Keep Releases</label>
              <input
                v-model.number="newProfile.config.keepReleases"
                type="number"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="3"
              />
            </div>
          </div>
          
          <!-- Cloudflare Sandbox Config -->
          <div v-if="newProfile.adapter === 'cloudflare-sandbox'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Cloudflare Sandbox Configuration
            </h3>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Account ID</label>
              <input
                v-model="newProfile.config.accountId"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="your-cloudflare-account-id"
              />
              <p class="text-xs text-gray-500 mt-1">Get from Cloudflare dashboard</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">API Token</label>
              <input
                v-model="newProfile.config.apiToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="your-api-token"
              />
              <p class="text-xs text-gray-500 mt-1">Create at Cloudflare dashboard → My Profile → API Tokens</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Runtime</label>
                <select
                  v-model="newProfile.config.runtime"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                >
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="deno">Deno</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Port</label>
                <input
                  v-model="newProfile.config.sandboxPort"
                  type="number"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="3000"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Build Command</label>
              <input
                v-model="newProfile.config.buildCommand"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="npm run build"
              />
              <p class="text-xs text-gray-500 mt-1">Command to build your application</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Start Command</label>
              <input
                v-model="newProfile.config.startCommand"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="npm start"
              />
              <p class="text-xs text-gray-500 mt-1">Command to start your application (optional)</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Memory (MB)</label>
                <input
                  v-model="newProfile.config.sandboxMemory"
                  type="number"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="128"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Timeout (seconds)</label>
                <input
                  v-model="newProfile.config.sandboxTimeout"
                  type="number"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="300"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">R2 Bucket (for static files)</label>
              <input
                v-model="newProfile.config.sandboxBucket"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="your-r2-bucket"
              />
              <p class="text-xs text-gray-500 mt-1">Optional: R2 bucket for static file storage</p>
            </div>
          </div>
          
          <!-- Vercel Sandbox Config -->
          <div v-if="newProfile.adapter === 'vercel-sandbox'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Vercel Sandbox Configuration
            </h3>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Team ID</label>
              <input
                v-model="newProfile.config.vercelTeamId"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="team_xxxxxxxxxxxxxxxx"
              />
              <p class="text-xs text-gray-500 mt-1">Get from Vercel dashboard → Settings → General</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Project ID</label>
              <input
                v-model="newProfile.config.vercelProjectId"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="prj_xxxxxxxxxxxxxxxx"
              />
              <p class="text-xs text-gray-500 mt-1">Get from Vercel dashboard → Project Settings</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Access Token</label>
              <input
                v-model="newProfile.config.vercelToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="vercel_xxxxxxxxxxxxxxxx"
              />
              <p class="text-xs text-gray-500 mt-1">Create at Vercel dashboard → Settings → Tokens</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Runtime</label>
                <select
                  v-model="newProfile.config.vercelRuntime"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                >
                  <option value="node22">Node.js 22</option>
                  <option value="python3.13">Python 3.13</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">vCPUs</label>
                <select
                  v-model="newProfile.config.vercelVcpus"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                >
                  <option value="1">1 vCPU</option>
                  <option value="2">2 vCPUs</option>
                  <option value="3">3 vCPUs</option>
                  <option value="4">4 vCPUs</option>
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Timeout (minutes)</label>
                <select
                  v-model="newProfile.config.vercelTimeout"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="300">5 hours</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Ports</label>
                <input
                  v-model="newProfile.config.vercelPorts"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="3000,8080"
                />
                <p class="text-xs text-gray-500 mt-1">Comma-separated port numbers</p>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Source Repository URL</label>
              <input
                v-model="newProfile.config.vercelSourceUrl"
                type="url"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="https://github.com/username/repo.git"
              />
              <p class="text-xs text-gray-500 mt-1">Git repository URL to clone and deploy</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Build Command</label>
                <input
                  v-model="newProfile.config.vercelBuildCommand"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="npm run build"
                />
                <p class="text-xs text-gray-500 mt-1">Command to build your application</p>
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Start Command</label>
                <input
                  v-model="newProfile.config.vercelStartCommand"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="npm start"
                />
                <p class="text-xs text-gray-500 mt-1">Command to start your application</p>
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Working Directory</label>
              <input
                v-model="newProfile.config.vercelWorkingDirectory"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="/vercel/sandbox"
              />
              <p class="text-xs text-gray-500 mt-1">Optional: Custom working directory path</p>
            </div>
          </div>
          
          <!-- GitHub Pages Config -->
          <div v-if="newProfile.adapter === 'github-pages'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">GitHub Pages Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">GitHub Token *</label>
              <input
                v-model="newProfile.config.githubToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="ghp_..."
              />
              <p class="mt-1 text-xs text-gray-500">Personal Access Token with 'repo' scope</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Owner *</label>
                <input
                  v-model="newProfile.config.githubOwner"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="username or org"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Repository *</label>
                <input
                  v-model="newProfile.config.githubRepo"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-repo"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Branch</label>
              <input
                v-model="newProfile.config.githubBranch"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="gh-pages"
              />
            </div>
          </div>
          
          <!-- Netlify Config -->
          <div v-if="newProfile.adapter === 'netlify'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">Netlify Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Netlify Token *</label>
              <input
                v-model="newProfile.config.netlifyToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="nfp_..."
              />
              <p class="mt-1 text-xs text-gray-500">Personal Access Token from Netlify</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Site ID (optional)</label>
              <input
                v-model="newProfile.config.netlifySiteId"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p class="mt-1 text-xs text-gray-500">Leave empty to create a new site</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Site Name (for new sites)</label>
              <input
                v-model="newProfile.config.netlifySiteName"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="my-site-name"
              />
            </div>
          </div>
          
          <!-- Vercel Config -->
          <div v-if="newProfile.adapter === 'vercel'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">Vercel Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">API Token *</label>
              <input
                v-model="newProfile.config.token"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="vercel_..."
              />
              <p class="text-xs text-gray-500 mt-1">Get from vercel.com/account/tokens</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Team ID (optional)</label>
                <input
                  v-model="newProfile.config.teamId"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="team_..."
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Project Name (optional)</label>
                <input
                  v-model="newProfile.config.projectName"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-project"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Production Domain (optional)</label>
              <input
                v-model="newProfile.config.productionDomain"
                type="text"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="mysite.com"
              />
            </div>
          </div>
          
          <!-- Cloudflare Pages Config -->
          <div v-if="newProfile.adapter === 'cloudflare-pages'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">Cloudflare Pages Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Account ID *</label>
              <input
                v-model="newProfile.config.accountId"
                type="text"
                required
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                placeholder="abc123..."
              />
              <p class="text-xs text-gray-500 mt-1">Find in Cloudflare dashboard URL</p>
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">API Token *</label>
              <input
                v-model="newProfile.config.apiToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">Create at dash.cloudflare.com with Pages:Edit permissions</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Project Name (optional)</label>
                <input
                  v-model="newProfile.config.projectName"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-project"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Production Domain (optional)</label>
                <input
                  v-model="newProfile.config.productionDomain"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="mysite.pages.dev"
                />
              </div>
            </div>
          </div>
          
          <!-- Railway Config -->
          <div v-if="newProfile.adapter === 'railway'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">Railway Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">API Token *</label>
              <input
                v-model="newProfile.config.token"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Project ID *</label>
                <input
                  v-model="newProfile.config.projectId"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Environment ID *</label>
                <input
                  v-model="newProfile.config.environmentId"
                  type="text"
                  required
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          
          <!-- Fly Config -->
          <div v-if="newProfile.adapter === 'fly'" class="space-y-4 p-4 border border-gray-500/15 rounded-lg">
            <h4 class="font-medium text-white">Fly.io Configuration</h4>
            
            <div>
              <label class="block text-sm text-gray-400 mb-1">Access Token *</label>
              <input
                v-model="newProfile.config.accessToken"
                type="password"
                required
                autocomplete="new-password"
                class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
              />
              <p class="text-xs text-gray-500 mt-1">Get from fly.io/user/personal_access_tokens</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">App Name (optional)</label>
                <input
                  v-model="newProfile.config.appName"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="my-app"
                />
              </div>
              
              <div>
                <label class="block text-sm text-gray-400 mb-1">Organization (optional)</label>
                <input
                  v-model="newProfile.config.org"
                  type="text"
                  class="w-full px-3 py-2 text-white border outline-none border-gray-500/25 bg-gray-500/10 rounded-lg text-sm"
                  placeholder="personal"
                />
              </div>
            </div>
          </div>
          
          <div v-if="createError" class="p-3 bg-red-500/10 text-red-500 rounded text-sm">
            {{ createError }}
          </div>
          
          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="creating"
              class="flex-1 bg-blue-300 text-sm font-semibold text-black py-3 px-4 rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ creating ? 'Creating...' : 'Create Profile' }}
            </button>
            <button
              type="button"
              @click="showCreateModal = false"
              class="flex-1 bg-gray-500/10 text-sm font-semibold text-gray-300 hover:text-white border border-gray-500/20 py-3 px-4 rounded-lg hover:bg-gray-500/20 hover:border-gray-500/30 transition-all"
            >
              Cancel
            </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';

const route = useRoute();
const router = useRouter();
const api = useApi();
const config = useRuntimeConfig();
const toast = useToast();

const siteId = route.params.id as string;

const user = ref<any>(null);
const site = ref<any>(null);
const profiles = ref<any[]>([]);
const loading = ref(true);
const showCreateModal = ref(false);
const creating = ref(false);
const createError = ref('');

// Confirmation modal state
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  description: '',
  variant: 'primary' as 'primary' | 'warning' | 'danger',
  onConfirm: () => {},
});

// Breadcrumbs
const breadcrumbItems = computed(() => [
  { label: 'Sites', to: '/sites' },
  { label: site.value?.name || 'Site', to: `/sites/${siteId}` },
  { label: 'Destinations', to: `/sites/${siteId}/destinations` },
]);

const newProfile = ref({
  name: '',
  adapter: 'ssh-rsync',
  config: {
    // SSH
    host: '',
    port: 22,
    user: 'deploy',
    privateKey: '',
    basePath: '',
    keepReleases: 5,
    // S3
    bucket: '',
    prefix: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    endpoint: '',
    // FTP
    ftpHost: '',
    ftpPort: 21,
    ftpUser: '',
    ftpPassword: '',
    ftpBasePath: '/',
    ftpSecure: false,
    // GitHub Pages
    githubToken: '',
    githubOwner: '',
    githubRepo: '',
    githubBranch: 'gh-pages',
    // Netlify
    netlifyToken: '',
    netlifySiteId: '',
    netlifySiteName: '',
    // Vercel
    token: '',
    teamId: '',
    projectName: '',
    productionDomain: '',
    // Cloudflare Pages
    accountId: '',
    apiToken: '',
    // Railway
    projectId: '',
    environmentId: '',
    // Fly
    accessToken: '',
    appName: '',
    org: '',
    // Cloudflare Sandbox
    runtime: 'node',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    sandboxPort: 3000,
    sandboxMemory: 128,
    sandboxTimeout: 300,
    sandboxBucket: '',
    // Vercel Sandbox
    vercelTeamId: '',
    vercelProjectId: '',
    vercelToken: '',
    vercelRuntime: 'node22',
    vercelVcpus: 2,
    vercelTimeout: 5,
    vercelPorts: '3000',
    vercelSourceUrl: '',
    vercelBuildCommand: 'npm run build',
    vercelStartCommand: 'npm start',
    vercelWorkingDirectory: '/vercel/sandbox',
  } as any,
});

onMounted(async () => {
  try {
    // Check if user is authenticated
    const response = await fetch(`${config.public.apiUrl}/v1/auth/me`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      router.push('/login');
      return;
    }
    
    user.value = await response.json();
    
    // Load site info for breadcrumbs
    site.value = await api.getSite(siteId);
    
    await loadProfiles();
  } catch (error) {
    console.error('Failed to load:', error);
    router.push('/login');
  }
});

// Helper function to get adapter icon
const getAdapterIcon = (adapter: string) => {
  const iconMap: Record<string, any> = {
    'ssh-rsync': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' }),
    ]),
    's3': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' }),
    ]),
    'vercel': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }),
    ]),
    'cloudflare-pages': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' }),
    ]),
    'railway': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 10V3L4 14h7v7l9-11h-7z' }),
    ]),
    'fly': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' }),
    ]),
    'ftp': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' }),
    ]),
    'github-pages': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' }),
    ]),
    'netlify': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' }),
    ]),
    'cloudflare-sandbox': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }),
    ]),
    'vercel-sandbox': h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }),
    ]),
  };
  return iconMap[adapter] || iconMap['ssh-rsync'];
};

// Helper function to get adapter color
const getAdapterColor = (adapter: string) => {
  const colorMap: Record<string, string> = {
    'ssh-rsync': 'text-blue-300 bg-blue-300/10 border-blue-300/20',
    's3': 'text-orange-300 bg-orange-300/10 border-orange-300/20',
    'vercel': 'text-purple-300 bg-purple-300/10 border-purple-300/20',
    'cloudflare-pages': 'text-yellow-300 bg-yellow-300/10 border-yellow-300/20',
    'railway': 'text-pink-300 bg-pink-300/10 border-pink-300/20',
    'fly': 'text-cyan-300 bg-cyan-300/10 border-cyan-300/20',
    'ftp': 'text-green-300 bg-green-300/10 border-green-300/20',
    'github-pages': 'text-gray-300 bg-gray-300/10 border-gray-300/20',
    'netlify': 'text-teal-300 bg-teal-300/10 border-teal-300/20',
    'cloudflare-sandbox': 'text-indigo-300 bg-indigo-300/10 border-indigo-300/20',
    'vercel-sandbox': 'text-orange-300 bg-orange-300/10 border-orange-300/20',
  };
  return colorMap[adapter] || 'text-gray-300 bg-gray-300/10 border-gray-300/20';
};

// Helper function to get adapter label
const getAdapterLabel = (adapter: string) => {
  const labelMap: Record<string, string> = {
    'ssh-rsync': 'SSH + rsync',
    's3': 'Amazon S3',
    'vercel': 'Vercel',
    'cloudflare-pages': 'Cloudflare Pages',
    'railway': 'Railway',
    'fly': 'Fly.io',
    'ftp': 'FTP',
    'github-pages': 'GitHub Pages',
    'netlify': 'Netlify',
    'cloudflare-sandbox': 'Cloudflare Sandbox',
    'vercel-sandbox': 'Vercel Sandbox',
  };
  return labelMap[adapter] || adapter;
};

const loadProfiles = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/profiles`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      profiles.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to load profiles:', error);
  } finally {
    loading.value = false;
  }
};

const handleCreate = async () => {
  const toast = useToast();
  creating.value = true;
  createError.value = '';
  
  try {
    // Build config based on adapter
    let adapterConfig: any;
    
    if (newProfile.value.adapter === 'ssh-rsync') {
      adapterConfig = {
        host: newProfile.value.config.host,
        port: newProfile.value.config.port || 22,
        user: newProfile.value.config.user,
        privateKey: newProfile.value.config.privateKey,
        basePath: newProfile.value.config.basePath,
        keepReleases: newProfile.value.config.keepReleases || 5,
      };
    } else if (newProfile.value.adapter === 's3') {
      adapterConfig = {
        bucket: newProfile.value.config.bucket,
        prefix: newProfile.value.config.prefix,
        region: newProfile.value.config.region,
        accessKeyId: newProfile.value.config.accessKeyId,
        secretAccessKey: newProfile.value.config.secretAccessKey,
        keepReleases: newProfile.value.config.keepReleases || 5,
      };
      
      if (newProfile.value.config.endpoint) {
        adapterConfig.endpoint = newProfile.value.config.endpoint;
      }
    } else if (newProfile.value.adapter === 'ftp') {
      adapterConfig = {
        host: newProfile.value.config.ftpHost,
        port: newProfile.value.config.ftpPort || 21,
        user: newProfile.value.config.ftpUser,
        password: newProfile.value.config.ftpPassword,
        basePath: newProfile.value.config.ftpBasePath || '/',
        secure: newProfile.value.config.ftpSecure || false,
        keepReleases: newProfile.value.config.keepReleases || 3,
      };
    } else if (newProfile.value.adapter === 'github-pages') {
      adapterConfig = {
        token: newProfile.value.config.githubToken,
        owner: newProfile.value.config.githubOwner,
        repo: newProfile.value.config.githubRepo,
        branch: newProfile.value.config.githubBranch || 'gh-pages',
      };
    } else if (newProfile.value.adapter === 'netlify') {
      adapterConfig = {
        token: newProfile.value.config.netlifyToken,
      };
      
      if (newProfile.value.config.netlifySiteId) {
        adapterConfig.siteId = newProfile.value.config.netlifySiteId;
      }
      if (newProfile.value.config.netlifySiteName) {
        adapterConfig.siteName = newProfile.value.config.netlifySiteName;
      }
    } else if (newProfile.value.adapter === 'vercel') {
      adapterConfig = {
        token: newProfile.value.config.token,
      };
      
      if (newProfile.value.config.teamId) {
        adapterConfig.teamId = newProfile.value.config.teamId;
      }
      if (newProfile.value.config.projectName) {
        adapterConfig.projectName = newProfile.value.config.projectName;
      }
      if (newProfile.value.config.productionDomain) {
        adapterConfig.productionDomain = newProfile.value.config.productionDomain;
      }
    } else if (newProfile.value.adapter === 'cloudflare-pages') {
      adapterConfig = {
        accountId: newProfile.value.config.accountId,
        apiToken: newProfile.value.config.apiToken,
      };

      if (newProfile.value.config.projectName) {
        adapterConfig.projectName = newProfile.value.config.projectName;
      }

      if (newProfile.value.config.productionDomain) {
        adapterConfig.productionDomain = newProfile.value.config.productionDomain;
      }
    } else if (newProfile.value.adapter === 'cloudflare-sandbox') {
      adapterConfig = {
        accountId: newProfile.value.config.accountId,
        apiToken: newProfile.value.config.apiToken,
        runtime: newProfile.value.config.runtime || 'node',
        buildCommand: newProfile.value.config.buildCommand,
        startCommand: newProfile.value.config.startCommand || 'npm start',
        port: newProfile.value.config.sandboxPort || 3000,
        memory: newProfile.value.config.sandboxMemory || 128,
        timeout: newProfile.value.config.sandboxTimeout || 300,
      };
      
      if (newProfile.value.config.sandboxBucket) {
        adapterConfig.bucket = newProfile.value.config.sandboxBucket;
      }
    } else if (newProfile.value.adapter === 'vercel-sandbox') {
      adapterConfig = {
        teamId: newProfile.value.config.vercelTeamId,
        projectId: newProfile.value.config.vercelProjectId,
        token: newProfile.value.config.vercelToken,
        runtime: newProfile.value.config.vercelRuntime || 'node22',
        vcpus: Number(newProfile.value.config.vercelVcpus) || 2,
        timeout: Number(newProfile.value.config.vercelTimeout) * 60000 || 300000, // Convert minutes to milliseconds
        ports: newProfile.value.config.vercelPorts ? newProfile.value.config.vercelPorts.split(',').map(Number) : [3000],
        source: {
          url: newProfile.value.config.vercelSourceUrl,
          type: 'git',
        },
        buildCommand: newProfile.value.config.vercelBuildCommand,
        startCommand: newProfile.value.config.vercelStartCommand,
        workingDirectory: newProfile.value.config.vercelWorkingDirectory,
      };
    }
    
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name: newProfile.value.name,
        adapter: newProfile.value.adapter,
        config: adapterConfig,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      const errorMsg = error.message || 'Failed to create profile';
      createError.value = errorMsg;
      toast.error('Profile Creation Failed', errorMsg);
      return;
    }
    
    showCreateModal.value = false;
    await loadProfiles();
    toast.success('Profile Created', `Profile "${newProfile.value.name}" has been created successfully.`);
    
    // Reset form
    newProfile.value = {
      name: '',
      adapter: 'ssh-rsync',
      config: {
        host: '',
        port: 22,
        user: 'deploy',
        privateKey: '',
        basePath: '',
        keepReleases: 5,
        bucket: '',
        prefix: '',
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: '',
        ftpHost: '',
        ftpPort: 21,
        ftpUser: '',
        ftpPassword: '',
        ftpBasePath: '/',
        ftpSecure: false,
        githubToken: '',
        githubOwner: '',
        githubRepo: '',
        githubBranch: 'gh-pages',
        netlifyToken: '',
        netlifySiteId: '',
        netlifySiteName: '',
      },
    };
  } catch (error: any) {
    createError.value = error.message;
    toast.apiError(error);
  } finally {
    creating.value = false;
  }
};

const setDefault = async (profileId: string) => {
  const toast = useToast();
  
  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/sites/${siteId}/profiles/${profileId}/default`,
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    
    if (response.ok) {
      await loadProfiles();
      toast.success('Default Profile Set', 'This profile will now be used by default for deployments.');
    } else {
      toast.error('Failed', 'Could not set default profile');
    }
  } catch (error: any) {
    console.error('Failed to set default:', error);
    toast.apiError(error);
  }
};

const openDeleteConfirmation = (profile: any) => {
  confirmModal.value = {
    show: true,
    title: 'Delete Profile',
    message: `Are you sure you want to delete "${profile.name}"?`,
    description: 'This action cannot be undone. The connection profile will be permanently removed.',
    variant: 'danger',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeDeleteProfile(profile.id);
    },
  };
};

const executeDeleteProfile = async (profileId: string) => {
  const toastId = toast.loading('Deleting profile...');
  
  try {
    const response = await fetch(
      `${config.public.apiUrl}/v1/sites/${siteId}/profiles/${profileId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
    
    if (response.ok) {
      await loadProfiles();
      toast.success('Profile Deleted', 'The connection profile has been removed.');
    } else {
      toast.error('Deletion Failed', 'Could not delete the profile');
    }
  } catch (error: any) {
    console.error('Failed to delete profile:', error);
    toast.apiError(error);
  }
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleString();
};
</script>
