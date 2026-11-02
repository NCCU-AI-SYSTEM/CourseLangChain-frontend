<template>
  <div class="h-full flex justify-center">
    <div class="w-full max-w-3xl flex flex-col gap-6 py-4 px-2">
      <div class="text-center flex flex-col items-center gap-3">
        <div class="bg-primary text-primary-content rounded-2xl p-3">
          <Icon icon="mingcute:school-line" class="h-8 w-8" />
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold">政大選課助理</h1>
        <p class="opacity-80 leading-relaxed max-w-xl">
          用說的就能找課、看課綱、排出不衝堂的課表,還能查志願序要排第幾才選得上。
        </p>
      </div>

      <div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="f in visibleFeatures"
            :key="f.title"
            class="group bg-base-200 hover:bg-base-300 transition-colors rounded-xl p-4 text-left flex gap-3 items-start"
            @click="emits('click', f.example)"
          >
            <div class="bg-base-100 rounded-lg p-2 shrink-0">
              <Icon :icon="f.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0 grow">
              <p class="font-medium">{{ f.title }}</p>
              <p class="text-sm opacity-70 mt-1">「{{ f.example }}」</p>
            </div>
            <Icon
              icon="mingcute:send-fill"
              class="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
            />
          </button>
        </div>
        <p class="text-xs opacity-60 text-center mt-2">點一下範例就會直接送出。</p>
      </div>

      <ol class="steps steps-vertical sm:steps-horizontal text-sm">
        <li class="step step-primary">輸入問題</li>
        <li class="step step-primary">點課名看大綱、按「加入課表」</li>
        <li class="step step-primary">在右側課表調整、整理志願序</li>
      </ol>

      <TranscriptUpload />

      <p class="text-sm text-center opacity-70">
        第一次使用?
        <button class="link link-primary" @click="openHelp">看完整使用說明</button>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import TranscriptUpload from "./TranscriptUpload.vue";
import { useMoodle } from "../composables/useMoodle";
import { useHelpGuide } from "../composables/useHelpGuide";

/**
 * 對話還沒開始時的首頁:說明能做什麼、給可以直接點的範例、三步驟引導。
 * 範例的事件名稱(click)沿用原本的介面,App.vue 收到後直接當成提問送出。
 */
const emits = defineEmits<{
  (e: "click", content: string): void;
}>();

const { status: moodle } = useMoodle();
const { open: openHelp } = useHelpGuide();

const features = [
  { icon: "mingcute:search-line", title: "找課", example: "星期三下午有什麼 AI 相關的課?" },
  { icon: "mingcute:calendar-2-line", title: "排課表", example: "幫我排 15 學分的課,避開星期五" },
  { icon: "mingcute:document-line", title: "看課程細節", example: "統計學的評分方式是什麼?" },
  { icon: "mingcute:list-ordered-line", title: "志願序要排第幾", example: "羽球初級 二12 要排第幾才選得上?" },
  { icon: "mingcute:book-5-line", title: "Moodle 課業", example: "我這週有哪些作業還沒交?", moodle: true },
];

// Moodle 範例只在後端有啟用時才出現:不給使用者一個問了只會得到「無法使用」的範例
const visibleFeatures = computed(() =>
  features.filter((f) => !f.moodle || moodle.value.enabled)
);
</script>
