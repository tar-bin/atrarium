import { DefaultTheme } from 'vitepress'

export const enNavigation: DefaultTheme.Config = {
  // Sidebar configuration
  sidebar: [
    {
      text: 'Guide',
      collapsed: false,
      items: [
        { text: 'Overview', link: '/en/guide/overview' },
        { text: 'Setup', link: '/en/guide/setup' },
        { text: 'Quickstart', link: '/en/guide/quickstart' }
      ]
    },
    {
      text: 'Architecture',
      collapsed: false,
      items: [
        { text: 'System Design', link: '/en/architecture/system-design' },
        { text: 'Database Schema', link: '/en/architecture/database' },
        { text: 'API Design', link: '/en/architecture/api' }
      ]
    },
    {
      text: 'Reference',
      collapsed: false,
      items: [
        { text: 'API Reference', link: '/en/reference/api-reference' },
        { text: 'Implementation Guide', link: '/en/reference/implementation' },
        { text: 'Development Spec', link: '/en/reference/development-spec' }
      ]
    }
  ],

  // Top navigation bar
  nav: [
    { text: 'Guide', link: '/en/guide/overview', activeMatch: '^/en/guide/' },
    { text: 'Architecture', link: '/en/architecture/system-design', activeMatch: '^/en/architecture/' },
    { text: 'Reference', link: '/en/reference/api-reference', activeMatch: '^/en/reference/' },
    { text: 'GitHub', link: 'https://github.com/tar-bin/atrarium' },
    { text: 'Main Site', link: 'https://github.com/tar-bin/atrarium#readme' }
  ],

  // Edit link configuration
  editLink: {
    pattern: 'https://github.com/tar-bin/atrarium/edit/main/docs-site/en/:path',
    text: 'Edit this page on GitHub'
  },

  // Footer
  footer: {
    message: 'Released under the MIT License.',
    copyright: 'Copyright © 2025 Atrarium Contributors'
  }
}
