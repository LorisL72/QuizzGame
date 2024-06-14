export default defineNuxtConfig({
  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap' }
      ]
    },
    baseURL: '/QuizzGame/' // Correct way to set base URL in Nuxt 3
  },
  modules: ['@nuxtjs/tailwindcss'],
  devtools: { enabled: true },
})
