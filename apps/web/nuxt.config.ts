// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  telemetry: false,
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', 'nuxt-icon'],
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      flowscopeEnabled: process.env.FLOWSCOPE_ENABLED === 'true',
    },
  },
  devServer: {
    port: 3001,
  },
  ssr: false,
  app: {
    head: {
      title: 'Brail - Instant Static Deploys Platform',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Instant Static Deploys Platform' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ],
      htmlAttrs: {
        style: 'background:#000'
      },
      bodyAttrs: {
        style: 'background:#000;margin:0;padding:0'
      }
    },
  },

  compatibilityDate: '2025-01-01',
})

