<template>
  <div class="navbar bg-base-200">
    <div class="navbar-start">
      <button
        class="btn btn-ghost gap-1"
        @click="emits('delete')"
        title="開始新對話(會清空這次的對話、課表、成績單與 Moodle 連結)"
      >
        <Icon icon="mingcute:add-circle-line" class="h-5 w-5" />
        <span class="hidden sm:inline">新對話</span>
      </button>
    </div>
    <div class="navbar-center">
      <span class="text-lg sm:text-xl font-bold flex items-center gap-2">
        <Icon icon="mingcute:school-line" class="h-6 w-6" />
        政大選課助理
      </span>
    </div>
    <div class="navbar-end gap-1">
      <!-- Moodle 入口放在這裡而不是 Intro:Intro 只在對話還沒開始時顯示,
           但助理是在對話中要求使用者登入的,入口必須一直在畫面上。 -->
      <button class="btn btn-sm btn-ghost gap-1" @click="openHelp" title="使用說明">
        <Icon icon="mingcute:question-line" class="h-5 w-5" />
        <span class="hidden sm:inline">使用說明</span>
      </button>
      <MoodleLogin />
      <Theme />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import Theme from "./Theme.vue";
import MoodleLogin from "./MoodleLogin.vue";
import { useHelpGuide } from "../composables/useHelpGuide";

const { open: openHelp } = useHelpGuide();

const emits = defineEmits<{
  (e: "delete"): void
}>()
</script>
