<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import Home from './Home.vue'
import Article from './Article.vue'
import NotFound from './NotFound.vue'

const route = useRoute()
const isIndex = computed(() => route.path.replace(/index.html$/, '') === '/')
const isNotFound = computed(() => route.component === NotFound)
</script>

<template>
  <div class="antialiased dark:bg-slate-900">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <nav class="flex justify-between items-center py-10 font-bold">
        <a class="text-xl" href="/" aria-label="HelloTools Team Blog">
          <img
            class="inline-block mr-2"
            style="width: 36px; height: 31px"
            alt="logo"
            src="/logo.png"
          />
          <span v-if="!isIndex" class="hidden md:inline dark:text-white"
            >HelloTools Team Blog</span
          >
        </a>
        <div class="text-sm text-gray-500 dark:text-white leading-5">
          <a
            class="hover:text-gray-700 dark:hover:text-gray-200"
            href="https://github.com/HelloTools-Studio/blog"
            target="_blank"
            rel="noopener"
            ><span class="hidden sm:inline">GitHub</span></a
          >
          <span class="mr-2 ml-2">·</span>
          <a
            class="hover:text-gray-700 dark:hover:text-gray-200"
            href="/feed.rss"
            ><span class="hidden sm:inline">RSS 订阅</span></a
          >
          <span class="mr-2 ml-2">·</span>
          <a
            class="hover:text-gray-700 dark:hover:text-gray-200"
            href="https://yeeee.ml"
            target="_blank"
            rel="noopener"
            >主页 →</a
          >
        </div>
      </nav>
    </div>
    <main class="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
      <Home v-if="isIndex" />
      <NotFound v-else-if="isNotFound" />
      <Article v-else />
    </main>
  </div>
</template>
