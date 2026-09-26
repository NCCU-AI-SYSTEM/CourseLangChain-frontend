<template>
  <div class="navbar bg-base-200">
    <div class="navbar-start">
      <button class="btn btn-square" @click="emits('delete')">
        <Icon icon="mingcute:delete-2-line" class="h-6 w-6" />
      </button>
    </div>
    <div class="navbar-center">
      <span class="text-xl font-bold">Course LangChain</span>
    </div>
    <div class="navbar-end gap-1">
      <!-- Moodle 入口放在這裡而不是 Intro:Intro 只在對話還沒開始時顯示,
           但助理是在對話中要求使用者登入的,入口必須一直在畫面上。 -->
      <MoodleLogin />
      <Theme />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import Theme from "./Theme.vue";
import MoodleLogin from "./MoodleLogin.vue";

const emits = defineEmits<{
  (e: "delete"): void
}>()
</script>
