<template>
  <div class="min-h-screen bg-black">
    <DashboardHeader 
      :user-email="user?.email"
      :site-id="siteId"
      active-tab="overview"
    />
    
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Breadcrumbs -->
      <Breadcrumbs :crumbs="breadcrumbItems" />
      
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-white">{{ site?.name || 'Loading...' }}</h1>
        <button
          v-if="site && deploys.length > 0"
          @click="exportData"
          class="px-4 py-2 bg-gray-500/10 hover:bg-gray-500/15 text-gray-300 hover:text-white rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all text-sm font-semibold flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Data
        </button>
      </div>
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-6 animate-pulse-slow">
        <!-- Upload Section Skeleton -->
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
          <div class="h-6 bg-gray-500/20 rounded w-48 mb-4"></div>
          <div class="h-48 bg-gray-500/15 rounded-lg"></div>
        </div>
        
        <!-- Deploy History Skeleton -->
        <div class="bg-gray-500/5 border border-gray-500/10 rounded-xl p-6">
          <div class="h-6 bg-gray-500/20 rounded w-40 mb-6"></div>
          <div class="space-y-3">
            <div v-for="i in 3" :key="i" class="bg-gray-500/10 border border-gray-500/10 rounded-xl p-5">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="h-5 bg-gray-500/20 rounded w-24 mb-3"></div>
                  <div class="h-4 bg-gray-500/15 rounded w-48 mb-2"></div>
                  <div class="h-3 bg-gray-500/10 rounded w-64"></div>
                </div>
                <div class="flex gap-2">
                  <div class="h-9 w-20 bg-gray-500/15 rounded-lg"></div>
                  <div class="h-9 w-24 bg-gray-500/15 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="space-y-6 animate-fade-in">
        <!-- Upload Section -->
        <div class="bg-black border border-gray-500/25 rounded-xl shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Deploy New Version
          </h2>
          
          <DeployUploader
            :site-id="siteId"
            @deploy-created="handleDeployCreated"
            @upload-complete="handleUploadComplete"
          />
        </div>
        
        <!-- Live URL & Badge -->
        <div v-if="site?.activeDeployId" class="grid md:grid-cols-1 gap-4 animate-fade-in">
          <!-- Live URL -->
          <div class="bg-gradient-to-br from-blue-300/10 to-blue-300/5 border border-blue-300/20 rounded-xl p-5">
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-white mb-1 flex items-center gap-2">
                  <svg class="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Live URL
                </h3>
                <a
                  :href="publicUrl"
                  target="_blank"
                  class="text-blue-300 hover:text-blue-400 underline text-sm font-mono break-all flex items-center gap-2"
                >
                  {{ publicUrl }}
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div class="flex items-center gap-2 px-3 py-1.5 text-blue-300 rounded-lg text-sm font-semibold ml-4">
                <span class="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                Live
              </div>
            </div>
          </div>
          
          <!-- Status Badge -->
          <!-- <div class="bg-gradient-to-br from-gray-500/10 to-transparent border border-gray-500/20 rounded-xl p-5">
            <h3 class="font-semibold text-white mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Embeddable Badge
            </h3>
            <div class="flex items-center gap-3 mb-3">
              <img :src="badgeUrl" alt="Deployment Status" class="h-5" />
              <button
                @click="copyBadgeCode"
                class="px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/15 text-gray-300 hover:text-white rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </button>
            </div>
            <p class="text-xs text-gray-500">Show your deployment status in README</p>
          </div> -->
        </div>
        
        <!-- Platform Releases -->
        <div v-if="releases.length > 0" class="bg-black border border-gray-500/25 rounded-xl shadow-lg p-6 mb-6 animate-fade-in">
          <h2 class="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            Platform Releases
          </h2>
          
          <div class="space-y-3">
            <div
              v-for="(release, index) in releases"
              :key="release.id"
              class="group relative bg-gradient-to-br from-purple-300/5 to-transparent border border-gray-500/20 rounded-xl p-5 hover:border-purple-300/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-300/5 animate-fade-in"
              :style="{ animationDelay: `${index * 50}ms` }"
            >
              <!-- Subtle glow on hover -->
              <div class="absolute inset-0 bg-gradient-to-br from-purple-300/0 to-purple-300/0 group-hover:from-purple-300/5 group-hover:to-transparent rounded-xl transition-all duration-300"></div>
              
              <div class="relative flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Status badges and date -->
                  <div class="flex items-center gap-3 mb-3 flex-wrap">
                    <StatusBadge :status="release.status" />
                    <div class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-purple-300/10 border border-purple-300/20 text-purple-300 rounded-lg font-semibold">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {{ release.target || 'preview' }}
                    </div>
                    <span class="text-sm text-gray-500 flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ formatDate(release.createdAt) }}
                    </span>
                  </div>
                  
                  <!-- Adapter -->
                  <div class="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <svg class="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span class="font-semibold text-white">{{ release.adapter }}</span>
                  </div>
                  
                  <!-- Preview URL -->
                  <div v-if="release.previewUrl" class="mb-3">
                    <a
                      :href="release.previewUrl"
                      target="_blank"
                      class="text-sm text-blue-300 hover:text-blue-400 underline flex items-center gap-1.5 group/link"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {{ release.previewUrl }}
                    </a>
                  </div>
                  
                  <!-- Destination ref -->
                  <div v-if="release.destinationRef" class="text-xs text-gray-500 mb-2 font-mono bg-gray-500/5 px-2 py-1 rounded inline-block">
                    {{ release.destinationRef }}
                  </div>
                  
                  <!-- Error Message -->
                  <div v-if="release.status === 'failed' && release.errorMessage" class="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div class="flex items-start gap-2">
                      <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-red-500 mb-1">Deployment Failed</p>
                        <p class="text-sm text-red-500/80 leading-relaxed">{{ release.errorMessage }}</p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Release ID -->
                  <div class="text-xs text-gray-600 font-mono mt-2">
                    {{ release.id }}
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex flex-wrap gap-2 items-start">
                  <button
                    @click="showLogs(release.deployId)"
                    class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-400 hover:text-white hover:border-gray-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5"
                    title="View logs"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Logs
                  </button>
                  
                  <button
                    v-if="release.status === 'staged' && release.target === 'preview' && canPromote(release.adapter)"
                    @click="promoteRelease(release.deployId, release.adapter)"
                    class="px-4 py-2 font-semibold bg-purple-300 text-black rounded-lg hover:bg-purple-400 transition-all hover:shadow-lg hover:shadow-purple-300/20 text-sm flex items-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    Promote
                  </button>
                  
                  <button
                    v-if="release.status === 'active' && canRollback(release.adapter)"
                    @click="rollbackRelease(release.deployId, release.adapter)"
                    class="px-4 py-2 bg-yellow-300/10 border border-yellow-300/20 text-yellow-300 rounded-lg hover:bg-yellow-300/20 hover:border-yellow-300/30 text-sm font-semibold transition-all flex items-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Rollback
                  </button>
                  
                  <button
                    @click="deleteRelease(release.id)"
                    class="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 text-sm transition-all flex items-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                  
                  <button
                    v-if="release.status === 'active'"
                    class="px-4 py-2 bg-green-300/10 border border-green-300/20 text-green-300 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                    disabled
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                    Active
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Logs Modal -->
        <div
          v-if="selectedDeployForLogs"
          class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          @click.self="selectedDeployForLogs = null"
        >
          <div class="max-w-6xl w-full">
            <LogViewer :deploy-id="selectedDeployForLogs" @close="selectedDeployForLogs = null" />
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
        
        <!-- Deploy History -->
        <div class="bg-black border border-gray-500/25 rounded-xl shadow-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white">Deploy History</h2>
          </div>
          
          <!-- Search & Filter -->
          <div v-if="deploys.length > 0" class="mb-6">
            <SearchFilter
              v-model="deploySearchQuery"
              v-model:filter-value="deployFilterValue"
              search-placeholder="Search deployments..."
              :filter-options="deployFilterOptions"
            />
          </div>
          
          <!-- Empty State -->
          <div v-if="filteredDeploys.length === 0 && deploys.length === 0" class="text-center py-12 animate-fade-in">
            <div class="bg-gray-500/5 border border-gray-500/10 p-4 rounded-2xl inline-block mb-4">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p class="text-gray-400 mb-2">No deployments yet</p>
            <p class="text-sm text-gray-500">Upload your first deployment above to get started</p>
          </div>
          
          <!-- No results from search/filter -->
          <div v-else-if="filteredDeploys.length === 0" class="text-center py-12 animate-fade-in">
            <svg class="w-10 h-10 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p class="text-gray-400 mb-2">No deployments found</p>
            <p class="text-sm text-gray-500">Try adjusting your search or filter</p>
          </div>
          
          <!-- Deploy Cards -->
          <div v-else>
            <div class="space-y-3 mb-4">
              <div
                v-for="(deploy, index) in paginatedDeploys"
                :key="deploy.id"
                class="group relative bg-gradient-to-br from-gray-500/5 to-transparent border border-gray-500/20 rounded-xl p-5 hover:border-gray-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 animate-fade-in"
                :style="{ animationDelay: `${index * 50}ms` }"
              >
              <!-- Subtle glow on hover -->
              <div class="absolute inset-0 bg-gradient-to-br from-blue-300/0 to-blue-300/0 group-hover:from-blue-300/3 group-hover:to-transparent rounded-xl transition-all duration-300"></div>
              
              <div class="relative flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Status and Date -->
                  <div class="flex items-center gap-3 mb-3 flex-wrap">
                    <StatusBadge :status="deploy.status" />
                    <span class="text-sm text-gray-500 flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {{ formatDate(deploy.createdAt) }}
                    </span>
                    <span v-if="deploy.duration" class="text-sm text-gray-500 flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {{ formatDuration(deploy.duration) }}
                    </span>
                    <span v-if="deploy.deployedByEmail" class="text-sm text-gray-500 flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {{ deploy.deployedByEmail.split('@')[0] }}
                    </span>
                  </div>
                  
                  <!-- Comment -->
                  <div v-if="deploy.comment" class="mb-3 p-3 bg-gray-500/5 border border-gray-500/10 rounded-lg">
                    <div class="flex items-start gap-2">
                      <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <p class="text-sm text-gray-300 leading-relaxed">{{ deploy.comment }}</p>
                    </div>
                  </div>
                  
                  <!-- File Info -->
                  <div class="flex items-center gap-4 text-sm text-gray-400 mb-2">
                    <span class="flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {{ deploy.fileCount ?? 0 }} files
                    </span>
                    <span class="flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                      {{ formatBytes(deploy.byteSize) }}
                    </span>
                  </div>
                  
                  <!-- Deploy ID -->
                  <div class="text-xs text-gray-500 font-mono truncate">
                    {{ deploy.id }}
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex flex-wrap gap-2 items-start">
                  <button
                    @click="showLogs(deploy.id)"
                    class="px-3 py-2 bg-gray-500/10 border border-gray-500/25 text-gray-400 hover:text-white hover:border-gray-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5"
                    title="View logs"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Logs
                  </button>
                  
                  <button
                    v-if="deploy.status === 'uploaded'"
                    @click="activateDeploy(deploy.id)"
                    :disabled="activating === deploy.id"
                    class="px-4 py-2 font-semibold bg-blue-300 text-black rounded-lg hover:bg-blue-400 transition-all hover:shadow-lg hover:shadow-blue-300/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                  >
                    <LoadingSpinner v-if="activating === deploy.id" size="sm" />
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ activating === deploy.id ? 'Activating...' : 'Activate' }}
                  </button>
                  
                  <button
                    v-if="deploy.status === 'active'"
                    class="px-4 py-2 bg-green-300/10 border border-green-300/20 text-green-300 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                    disabled
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                    Current
                  </button>
                  
                  <button
                    v-if="deploy.status !== 'active'"
                    @click="deleteDeploy(deploy.id)"
                    class="px-3 py-2 bg-red-500/10 border border-red-500/25 text-red-500 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 rounded-lg text-sm transition-all flex items-center gap-1.5"
                    title="Delete deployment"
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
            
            <!-- Load More Button -->
            <div v-if="hasMoreDeploys" class="text-center pt-4 animate-fade-in">
              <button
                @click="loadMoreDeploys"
                class="px-6 py-3 bg-gray-500/10 hover:bg-gray-500/15 text-white rounded-lg border border-gray-500/20 hover:border-gray-500/40 transition-all text-sm font-semibold flex items-center gap-2 mx-auto"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                Load More Deployments
                <span class="text-xs text-gray-500 font-normal">({{ filteredDeploys.length - displayedDeployCount }} more)</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Danger Zone -->
        <div class="bg-black border border-red-500/25 rounded-lg shadow-lg p-6 mt-6">
          <h2 class="text-xl font-semibold mb-2 text-red-400">Danger Zone</h2>
          <p class="text-sm text-gray-400 mb-4">Once you delete a site, there is no going back. Please be certain.</p>
          <button
            @click="deleteSite"
            class="px-4 py-2 bg-red-500/10 border border-red-500/25 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg text-sm font-medium transition"
          >
            Delete This Site
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Site, Deploy } from '@br/shared';
import { formatBytes } from '@br/shared';
import { toast as sonnerToast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const api = useApi();
const config = useRuntimeConfig();
const { celebrate } = useConfetti();

const siteId = route.params.id as string;
const user = ref<any>(null);
const site = ref<Site | null>(null);
const deploys = ref<Deploy[]>([]);
const releases = ref<any[]>([]);
const loading = ref(true);
const activating = ref<string | null>(null);
const selectedDeployForLogs = ref<string | null>(null);

// Search & Filter state
const deploySearchQuery = ref('');
const deployFilterValue = ref('all');
const deployFilterOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Uploaded', value: 'uploaded' },
  { label: 'Uploading', value: 'uploading' },
  { label: 'Failed', value: 'failed' },
];

// Pagination state
const deploysPerPage = 10;
const displayedDeployCount = ref(deploysPerPage);

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
]);

// Filtered deploys with pagination
const filteredDeploys = computed(() => {
  let result = deploys.value;
  
  // Filter by status
  if (deployFilterValue.value !== 'all') {
    result = result.filter(d => d.status === deployFilterValue.value);
  }
  
  // Search by ID
  if (deploySearchQuery.value) {
    const query = deploySearchQuery.value.toLowerCase();
    result = result.filter(d => 
      d.id.toLowerCase().includes(query)
    );
  }
  
  return result;
});

// Paginated deploys for display
const paginatedDeploys = computed(() => {
  return filteredDeploys.value.slice(0, displayedDeployCount.value);
});

// Check if there are more deploys to load
const hasMoreDeploys = computed(() => {
  return filteredDeploys.value.length > displayedDeployCount.value;
});

const loadMoreDeploys = () => {
  displayedDeployCount.value += deploysPerPage;
};

// Reset pagination when filter/search changes
watch([deploySearchQuery, deployFilterValue], () => {
  displayedDeployCount.value = deploysPerPage;
});

const publicUrl = computed(() => {
  return `${config.public.apiUrl}/public/${siteId}/`;
});

const badgeUrl = computed(() => {
  const status = site.value?.activeDeployId ? 'deployed' : 'inactive';
  const color = site.value?.activeDeployId ? 'brightgreen' : 'lightgrey';
  return `https://img.shields.io/badge/brail-${status}-${color}?style=flat-square&logo=rocket`;
});

const badgeMarkdown = computed(() => {
  return `[![Deployment Status](${badgeUrl.value})](${publicUrl.value})`;
});

const badgeHtml = computed(() => {
  return `<a href="${publicUrl.value}"><img src="${badgeUrl.value}" alt="Deployment Status" /></a>`;
});

const loadSite = async () => {
  try {
    site.value = await api.getSite(siteId);
  } catch (error: any) {
    if (error.status === 401) {
      router.push('/login');
      return;
    }
    throw error;
  }
};

const loadDeploys = async () => {
  try {
    deploys.value = await api.listDeploys(siteId);
  } catch (error: any) {
    if (error.status === 401) {
      router.push('/login');
      return;
    }
    throw error;
  }
};

let isLoadingReleases = false;
const loadReleases = async () => {
  // Prevent overlapping requests
  if (isLoadingReleases) return;
  
  isLoadingReleases = true;
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/sites/${siteId}/releases`, {
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
      },
    });
    if (response.status === 401) {
      router.push('/login');
      return;
    }
    if (response.ok) {
      releases.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to load releases:', error);
  } finally {
    isLoadingReleases = false;
  }
};

// Debounce for release reloading
let releaseReloadTimeout: NodeJS.Timeout | null = null;
const debouncedLoadReleases = () => {
  if (releaseReloadTimeout) {
    clearTimeout(releaseReloadTimeout);
  }
  releaseReloadTimeout = setTimeout(() => {
    loadReleases();
  }, 1000); // Wait 1 second after last notification
};

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
    
    await Promise.all([loadSite(), loadDeploys(), loadReleases()]);
    
    // Connect to real-time notifications
    const notifications = useNotifications();
    const socket = notifications.connect();
    notifications.subscribeSite(siteId);
    
    // Listen for deployment-related notifications to refresh releases
    if (socket) {
      socket.on('notification', (notification: any) => {
        // Refresh releases when deployment-related notifications are received
        if (notification.type === 'success' && 
            (notification.message?.includes('deploy') || 
             notification.message?.includes('release') ||
             notification.message?.includes('platform'))) {
          debouncedLoadReleases();
        }
      });
    }
  } catch (error) {
    console.error('Failed to load site:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  // Clear any pending reload timeouts
  if (releaseReloadTimeout) {
    clearTimeout(releaseReloadTimeout);
  }
  
  // Disconnect from notifications
  const notifications = useNotifications();
  notifications.unsubscribeSite(siteId);
  notifications.disconnect();
});

const showLogs = (deployId: string) => {
  selectedDeployForLogs.value = deployId;
};

const promoteRelease = (deployId: string, adapter: string) => {
  confirmModal.value = {
    show: true,
    title: 'Promote to Production',
    message: 'Are you sure you want to promote this preview deployment to production?',
    description: 'This will make the deployment live on the production platform.',
    variant: 'primary',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executePromoteRelease(deployId, adapter);
    },
  };
};

const executePromoteRelease = async (deployId: string, adapter: string) => {
  const toast = useToast();
  const toastId = toast.loading('Promoting to production...');
  
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/deploys/${deployId}/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: 'production',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      toast.error('Promotion Failed', errorData.message || 'Failed to promote deployment');
      return;
    }
    
    await loadReleases();
    toast.success('Promoted to Production', 'Your deployment is now live in production!');
  } catch (error: any) {
    console.error('Failed to promote:', error);
    toast.apiError(error);
  }
};

const rollbackRelease = (deployId: string, adapter: string) => {
  confirmModal.value = {
    show: true,
    title: 'Rollback Deployment',
    message: 'Are you sure you want to rollback this deployment?',
    description: 'This will revert to the previous version on the platform.',
    variant: 'warning',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeRollbackRelease(deployId, adapter);
    },
  };
};

const executeRollbackRelease = async (deployId: string, adapter: string) => {
  const toast = useToast();
  const toastId = toast.loading('Rolling back deployment...');
  
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/deploys/${deployId}/rollback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      toast.error('Rollback Failed', errorData.message || 'Failed to rollback deployment');
      return;
    }
    
    await Promise.all([loadReleases(), loadDeploys()]);
    toast.success('Rollback Complete', 'Your deployment has been reverted to the previous version.');
  } catch (error: any) {
    console.error('Failed to rollback:', error);
    toast.apiError(error);
  }
};

const deleteRelease = (releaseId: string) => {
  confirmModal.value = {
    show: true,
    title: 'Delete Release',
    message: 'Are you sure you want to delete this release?',
    description: 'This will remove the release from the platform and delete it from Vercel. This action cannot be undone.',
    variant: 'danger',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeDeleteRelease(releaseId);
    },
  };
};

const executeDeleteRelease = async (releaseId: string) => {
  const toastId = sonnerToast.loading('Deleting release...');
  
  try {
    const response = await fetch(`${config.public.apiUrl}/v1/releases/${releaseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${api.getToken()}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      sonnerToast.error('Delete Failed', {
        id: toastId,
        description: errorData.message || 'Failed to delete release'
      });
      return;
    }
    
    await loadReleases();
    sonnerToast.success('Release Deleted', {
      id: toastId,
      description: 'The release has been removed from the platform.'
    });
  } catch (error: any) {
    console.error('Failed to delete release:', error);
    sonnerToast.error('Delete Failed', {
      id: toastId,
      description: error.message || 'Failed to delete release'
    });
  }
};

const handleDeployCreated = async (deployId: string) => {
  console.log('Deploy created:', deployId);
  // Refresh deploys when a new deployment is created
  await loadDeploys();
};

const handleUploadComplete = async (deployId: string) => {
  console.log('Upload complete:', deployId);
  await Promise.all([loadDeploys(), loadReleases()]);
};

const activateDeploy = (deployId: string) => {
  confirmModal.value = {
    show: true,
    title: 'Activate Deployment',
    message: 'Are you sure you want to activate this deployment?',
    description: 'This will make it the live version on Brail.',
    variant: 'primary',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeActivateDeploy(deployId);
    },
  };
};

const executeActivateDeploy = async (deployId: string) => {
  const toast = useToast();
  activating.value = deployId;
  const toastId = sonnerToast.loading('Activating deployment...');
  
  try {
    await api.activateDeploy(deployId);
    await Promise.all([loadSite(), loadDeploys(), loadReleases()]);
    celebrate(); // 🎊 Celebration!
    sonnerToast.success('Deployment Activated', {
      id: toastId,
      description: 'Your deployment is now live!'
    });
  } catch (error: any) {
    console.error('Failed to activate deploy:', error);
    sonnerToast.error('Activation Failed', {
      id: toastId,
      description: error.message || 'Failed to activate deployment'
    });
  } finally {
    activating.value = null;
  }
};

const deleteDeploy = (deployId: string) => {
  confirmModal.value = {
    show: true,
    title: 'Delete Deployment',
    message: 'Are you sure you want to delete this deployment?',
    description: 'This action cannot be undone. The deployment files will be permanently removed.',
    variant: 'danger',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeDeleteDeploy(deployId);
    },
  };
};

const executeDeleteDeploy = async (deployId: string) => {
  const toastId = sonnerToast.loading('Deleting deployment...');
  
  try {
    await api.fetch(`/v1/deploys/${deployId}`, {
      method: 'DELETE',
    });
    await loadDeploys();
    sonnerToast.success('Deployment Deleted', {
      id: toastId,
      description: 'The deployment has been removed.'
    });
  } catch (error: any) {
    console.error('Failed to delete deploy:', error);
    sonnerToast.error('Delete Failed', {
      id: toastId,
      description: error.message || 'Failed to delete deployment'
    });
  }
};

const deleteSite = () => {
  confirmModal.value = {
    show: true,
    title: 'Delete Site',
    message: `Are you sure you want to delete "${site.value?.name}"?`,
    description: 'This will permanently delete the site and all its deployments. This action cannot be undone.',
    variant: 'danger',
    onConfirm: async () => {
      confirmModal.value.show = false;
      await executeDeleteSite();
    },
  };
};

const executeDeleteSite = async () => {
  const toastId = sonnerToast.loading('Deleting site...');
  
  try {
    await api.fetch(`/v1/sites/${siteId}`, {
      method: 'DELETE',
    });
    sonnerToast.success('Site Deleted', {
      id: toastId,
      description: 'The site has been permanently removed.',
    });
    router.push('/sites');
  } catch (error: any) {
    console.error('Failed to delete site:', error);
    sonnerToast.error('Failed to delete site', {
      id: toastId,
      description: error.message || 'An error occurred while deleting the site.',
    });
  }
};

const exportData = async () => {
  const toastId = sonnerToast.loading('Preparing export...');
  
  try {
    // Gather all data
    const exportData = {
      site: site.value,
      deploys: deploys.value,
      releases: releases.value,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${site.value?.name || 'site'}-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    sonnerToast.success('Export Complete', {
      id: toastId,
      description: 'Site data has been exported as JSON',
    });
  } catch (error: any) {
    console.error('Failed to export data:', error);
    sonnerToast.error('Export Failed', {
      id: toastId,
      description: error.message || 'Failed to export site data',
    });
  }
};

const copyBadgeCode = async () => {
  const toast = useToast();
  
  try {
    // Copy Markdown format (most common for README)
    await navigator.clipboard.writeText(badgeMarkdown.value);
    toast.success('Badge Code Copied!', 'Markdown format copied to clipboard');
  } catch (error: any) {
    console.error('Failed to copy badge code:', error);
    toast.error('Copy Failed', 'Please copy manually: ' + badgeMarkdown.value);
  }
};

// Adapters that support promote/rollback
const PLATFORM_ADAPTERS = [
  'vercel',
  'cloudflare-pages',
  'cloudflare-workers',
  'netlify',
  'railway',
  'fly',
  'render',
];

// Adapters that only do static deployments (no promote/rollback)
const STATIC_ONLY_ADAPTERS = [
  's3',
  'ftp',
  'ssh-rsync',
  'github-pages',
];

const canPromote = (adapter: string) => {
  return PLATFORM_ADAPTERS.includes(adapter);
};

const canRollback = (adapter: string) => {
  return PLATFORM_ADAPTERS.includes(adapter);
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString();
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};
</script>

