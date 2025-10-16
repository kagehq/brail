<template>
  <nav class="border-b border-gray-500/25">
    <div class="max-w-7xl mx-auto px-4 py-1">
      <div class="flex justify-between items-center min-h-[40px]">
        <!-- Left side: Product title and tabs -->
        <div class="flex items-center gap-6">
          <NuxtLink to="/sites" class="text-xl font-semibold flex items-center gap-1 text-white hover:text-blue-300 transition">
						<img src="~/assets/img/logo.png" alt="Brail" class="w-6 h-6" />
						<span class="text-base font-semibold text-white hover:text-blue-300 transition">Brail</span>
          </NuxtLink>
          
          <!-- Site navigation tabs (optional) -->
          <div class="flex items-center gap-4 min-h-[32px]">
            <template v-if="siteId">
            <NuxtLink
              :to="`/sites/${siteId}`"
              :class="[
                'text-sm transition',
                activeTab === 'overview' 
                  ? 'text-white bg-gray-500/20 border border-gray-500/15 rounded-lg px-2.5 py-1 font-medium' 
                  : 'text-gray-400 hover:text-white'
              ]"
            >
              Overview
            </NuxtLink>
            <NuxtLink
              :to="`/sites/${siteId}/files`"
              :class="[
                'text-sm transition',
                activeTab === 'files' 
                  ? 'text-white bg-gray-500/20 border border-gray-500/15 rounded-lg px-2.5 py-1 font-medium' 
                  : 'text-gray-400 hover:text-white'
              ]"
            >
              Files
            </NuxtLink>
            <NuxtLink
              :to="`/sites/${siteId}/destinations`"
              :class="[
                'text-sm transition flex items-center gap-2',
                activeTab === 'destinations' 
                  ? 'text-white bg-gray-500/20 border border-gray-500/15 rounded-lg px-2.5 py-1 font-medium' 
                  : 'text-gray-400 hover:text-white'
              ]"
            >
              Destinations
            </NuxtLink>
            <NuxtLink
              :to="`/sites/${siteId}/domains`"
              :class="[
                'text-sm transition',
                activeTab === 'domains' 
                  ? 'text-white bg-gray-500/20 border border-gray-500/15 rounded-lg px-2.5 py-1 font-medium' 
                  : 'text-gray-400 hover:text-white'
              ]"
            >
              Domains
            </NuxtLink>
            <NuxtLink
              :to="`/sites/${siteId}/activity`"
              :class="[
                'text-sm transition',
                activeTab === 'activity' 
                  ? 'text-white bg-gray-500/20 border border-gray-500/15 rounded-lg px-2.5 py-1 font-medium' 
                  : 'text-gray-400 hover:text-white'
              ]"
            >
              Activity
            </NuxtLink>
            </template>
          </div>
        </div>
        
        <!-- User avatar - always reserve space -->
        <div class="w-7 h-7 flex items-center justify-center">
          <UserAvatar v-if="userEmail" :email="userEmail" />
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Props {
  userEmail?: string;
  siteId?: string;
  activeTab?: 'overview' | 'files' | 'destinations' | 'domains' | 'activity';
}

defineProps<Props>();
</script>

