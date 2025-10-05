import { DefaultTheme } from 'vitepress'

export const enNavigation: DefaultTheme.Config = {
  // Sidebar configuration
  sidebar: [
    {
      text: 'Guide',
      collapsed: false,
      items: [
        { text: 'What is Atrarium?', link: '/guide/concept' },
        { text: 'Setup', link: '/guide/setup' },
        { text: 'Quickstart', link: '/guide/quickstart' }
      ]
    },
    {
      text: 'Architecture',
      collapsed: false,
      items: [
        { text: 'System Design', link: '/architecture/system-design' },
        { text: 'Database Schema', link: '/architecture/database' },
        { text: 'API Design', link: '/architecture/api' }
      ]
    },
    {
      text: 'Reference',
      collapsed: false,
      items: [
        { text: 'API Reference', link: '/reference/api-reference' },
        { text: 'Implementation Guide', link: '/reference/implementation' },
        { text: 'Development Spec', link: '/reference/development-spec' }
      ]
    }
  ],

  // Top navigation bar
  nav: [
    { text: 'Guide', link: '/guide/concept', activeMatch: '^/guide/' },
    { text: 'Architecture', link: '/architecture/system-design', activeMatch: '^/architecture/' },
    { text: 'Reference', link: '/reference/api-reference', activeMatch: '^/reference/' },
    { text: 'GitHub', link: 'https://github.com/tar-bin/atrarium' },
    { text: 'Main Site', link: 'https://github.com/tar-bin/atrarium#readme' }
  ],

  // Edit link configuration
  editLink: {
    pattern: 'https://github.com/tar-bin/atrarium/edit/main/docs/:path',
    text: 'Edit this page on GitHub'
  },

  // Footer
  footer: {
    message: 'Released under the MIT License.',
    copyright: 'Copyright © 2025 Atrarium Contributors'
  }
}
