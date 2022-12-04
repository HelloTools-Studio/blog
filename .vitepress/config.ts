import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'HelloTools Blog',
  description: 'The offical blog for HelloTools Team.',
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico'
      }
    ]
  ]
})
