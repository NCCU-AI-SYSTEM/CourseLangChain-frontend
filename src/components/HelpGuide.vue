<template>
  <div
    v-if="isOpen"
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    aria-label="使用說明"
    @click.self="close"
  >
    <div class="modal-box max-w-2xl flex flex-col gap-5 text-left">
      <div class="flex items-center gap-2">
        <Icon icon="mingcute:question-line" class="h-6 w-6" />
        <h3 class="font-bold text-xl grow">使用說明</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="close" aria-label="關閉">
          <Icon icon="mingcute:close-line" class="h-5 w-5" />
        </button>
      </div>

      <p class="text-sm opacity-80 leading-relaxed">
        用平常說話的方式提問就好,條件說得越具體,結果越準。下面是助理能做的事和問法範例。
      </p>

      <ul class="flex flex-col gap-3">
        <li v-for="f in features" :key="f.title" class="flex gap-3">
          <div class="bg-base-200 rounded-lg p-2 h-fit">
            <Icon :icon="f.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="font-medium">{{ f.title }}</p>
            <p class="text-sm opacity-80 leading-relaxed">{{ f.desc }}</p>
            <p class="text-sm opacity-60 mt-1">例:「{{ f.example }}」</p>
          </div>
        </li>
      </ul>

      <div class="bg-base-200 rounded-lg p-4 flex flex-col gap-2 text-sm leading-relaxed">
        <p class="font-medium">右側「我的課表」</p>
        <p class="opacity-80">
          可以直接輸入課程代碼(9 碼或 13 碼)加課,切換週課表與清單檢視。
          加入的課如果和現有課程衝堂、或是同一門課的另一個班,會自動替換掉舊的那幾門,並告訴你原因。
          「志願序」按鈕可以整理選課要填的志願順序,並一鍵複製。
        </p>
      </div>

      <div class="flex flex-col gap-1 text-sm leading-relaxed">
        <p class="font-medium">小提醒</p>
        <ul class="list-disc pl-5 opacity-80 flex flex-col gap-1">
          <li>回答通常需要幾十秒;等待時上方會顯示目前在做哪一步和經過的時間。</li>
          <li>資料是本學期的課程。助理可能出錯,正式選課前請以學校系統為準。</li>
          <li>左上角「新對話」會清空這次的對話、課表、成績單與 Moodle 連結。</li>
          <li>成績單只用在這次對話,不會儲存;Moodle 密碼不會存在瀏覽器裡,閒置八小時自動失效。</li>
        </ul>
      </div>

      <button class="btn btn-primary w-fit self-end" @click="close">開始使用</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import { useHelpGuide } from "../composables/useHelpGuide";

/** 使用說明視窗。由導覽列的「使用說明」或首頁的連結打開(useHelpGuide)。 */
const { isOpen, close } = useHelpGuide();

const features = [
  {
    icon: "mingcute:search-line",
    title: "找課",
    desc: "說出主題、時段或老師,助理會列出符合的課。點課名可以看完整的課程大綱。",
    example: "星期三下午有什麼 AI 相關的課?",
  },
  {
    icon: "mingcute:document-line",
    title: "看課程細節",
    desc: "評分方式、教科書、每週進度都可以問。也可以直接點任何課名打開課程卡片。",
    example: "統計學的評分方式是什麼?",
  },
  {
    icon: "mingcute:calendar-2-line",
    title: "排課表",
    desc: "說出學分數和想避開的時段,助理會排出不衝堂的方案,按「套用此方案」就會放進右側課表。",
    example: "幫我排 15 學分的課,避開星期五",
  },
  {
    icon: "mingcute:list-ordered-line",
    title: "志願序要排第幾",
    desc: "根據歷年分發結果與學生回報,估計一門課要排到第幾志願才選得上。指定時段會更準。",
    example: "羽球初級 二12 要排第幾才選得上?",
  },
  {
    icon: "mingcute:book-5-line",
    title: "Moodle 課業(需先連結)",
    desc: "在右上角連結 Moodle 後,可以查自己的作業、截止日和成績。",
    example: "我這週有哪些作業還沒交?",
  },
];

const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape" && isOpen.value) close();
};
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>
