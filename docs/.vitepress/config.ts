import { defineConfig } from 'vitepress'
import { enNavigation } from './locales/en'
import { jaNavigation } from './locales/ja'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Atrarium',
  description: 'Community management system on AT Protocol',

  // Base configuration
  cleanUrls: true,

  // i18n configuration
  locales: {
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: enNavigation
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja/',
      themeConfig: jaNavigation
    }
  },

  // Theme configuration (shared across locales)
  themeConfig: {
    logo: '/logo.svg',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tar-bin/atrarium' }
    ]
  }
})
