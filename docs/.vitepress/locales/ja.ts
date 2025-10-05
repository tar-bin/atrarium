import { DefaultTheme } from 'vitepress'

export const jaNavigation: DefaultTheme.Config = {
  // Sidebar configuration
  sidebar: [
    {
      text: 'ガイド',
      collapsed: false,
      items: [
        { text: 'Atrariumとは？', link: '/ja/guide/concept' },
        { text: 'セットアップ', link: '/ja/guide/setup' },
        { text: 'クイックスタート', link: '/ja/guide/quickstart' }
      ]
    },
    {
      text: 'アーキテクチャ',
      collapsed: false,
      items: [
        { text: 'システム設計', link: '/ja/architecture/system-design' },
        { text: 'データベーススキーマ', link: '/ja/architecture/database' },
        { text: 'API設計', link: '/ja/architecture/api' }
      ]
    },
    {
      text: 'リファレンス',
      collapsed: false,
      items: [
        { text: 'APIリファレンス', link: '/ja/reference/api-reference' },
        { text: '実装ガイド', link: '/ja/reference/implementation' },
        { text: '開発仕様', link: '/ja/reference/development-spec' }
      ]
    }
  ],

  // Top navigation bar
  nav: [
    { text: 'ガイド', link: '/ja/guide/concept', activeMatch: '^/ja/guide/' },
    { text: 'アーキテクチャ', link: '/ja/architecture/system-design', activeMatch: '^/ja/architecture/' },
    { text: 'リファレンス', link: '/ja/reference/api-reference', activeMatch: '^/ja/reference/' },
    { text: 'GitHub', link: 'https://github.com/tar-bin/atrarium' },
    { text: 'メインサイト', link: 'https://github.com/tar-bin/atrarium#readme' }
  ],

  // Edit link configuration
  editLink: {
    pattern: 'https://github.com/tar-bin/atrarium/edit/main/docs/ja/:path',
    text: 'GitHubでこのページを編集'
  },

  // Footer
  footer: {
    message: 'MITライセンスの下で公開されています。',
    copyright: 'Copyright © 2025 Atrarium Contributors'
  }
}
