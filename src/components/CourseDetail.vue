<template>
  <div
    v-if="openId"
    class="modal modal-open"
    role="dialog"
    aria-modal="true"
    :aria-label="card?.name ?? '課程詳細資料'"
    @click.self="close"
  >
    <div class="modal-box max-w-2xl p-0 flex flex-col max-h-[90vh]">
      <!-- 標頭:課名、基本資訊、動作。內容再長,這一塊都固定在上方 -->
      <div class="p-5 pb-4 border-b border-base-300">
        <div class="flex items-start gap-3">
          <div class="grow min-w-0">
            <template v-if="card">
              <h3 class="text-xl font-bold leading-snug">
                {{ card.name || "(未命名課程)" }}
              </h3>
              <p v-if="card.name_en" class="text-sm opacity-60">{{ card.name_en }}</p>
            </template>
            <div v-else class="flex flex-col gap-2">
              <div class="h-7 w-2/3 rounded bg-base-300 animate-pulse"></div>
              <div class="h-4 w-1/3 rounded bg-base-300 animate-pulse"></div>
            </div>
          </div>
          <button class="btn btn-sm btn-circle btn-ghost" @click="close" aria-label="關閉">
            <Icon icon="mingcute:close-line" class="h-5 w-5" />
          </button>
        </div>

        <div v-if="card" class="flex flex-wrap gap-2 mt-3">
          <span v-for="chip in chips" :key="chip.icon" class="badge badge-outline gap-1 py-3">
            <Icon :icon="chip.icon" class="h-4 w-4" />
            {{ chip.text }}
          </span>
        </div>

        <div v-if="card" class="flex flex-wrap gap-2 mt-4">
          <button
            class="btn btn-sm"
            :class="inSchedule ? 'btn-ghost' : 'btn-primary'"
            :disabled="scheduleLoading || inSchedule"
            @click="addToSchedule"
          >
            <Icon :icon="inSchedule ? 'mingcute:check-line' : 'mingcute:add-line'" class="h-4 w-4" />
            {{ inSchedule ? "已在課表" : "加入課表" }}
          </button>
          <button
            class="btn btn-sm btn-ghost"
            :class="{ 'text-primary': inPreference }"
            @click="togglePreference"
          >
            <Icon :icon="inPreference ? 'mingcute:star-fill' : 'mingcute:star-line'" class="h-4 w-4" />
            {{ inPreference ? "已在志願序" : "加入志願序" }}
          </button>
          <a
            v-if="card.syllabus_url"
            :href="card.syllabus_url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost"
          >
            <Icon icon="mingcute:external-link-line" class="h-4 w-4" />
            官方課程大綱
          </a>
          <a
            v-if="card.teacher_url"
            :href="card.teacher_url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost"
          >
            <Icon icon="mingcute:user-3-line" class="h-4 w-4" />
            教師資訊
          </a>
        </div>
        <p v-if="message" class="text-xs opacity-70 mt-2 leading-relaxed">{{ message }}</p>
      </div>

      <!-- 內容:大綱各段落,常用的三段預設展開 -->
      <div class="p-5 overflow-auto flex flex-col gap-2">
        <template v-if="loading">
          <div v-for="n in 3" :key="n" class="h-12 rounded-lg bg-base-200 animate-pulse"></div>
        </template>

        <div v-else-if="error" class="alert alert-error text-sm">
          <Icon icon="mingcute:alert-line" class="h-5 w-5" />
          <span class="grow">{{ error }}</span>
          <button class="btn btn-sm" @click="retry">
            <Icon icon="mingcute:refresh-1-line" class="h-4 w-4" />
            重試
          </button>
        </div>

        <template v-else-if="card">
          <p v-if="!sections.length" class="text-sm opacity-70 py-6 text-center leading-relaxed">
            這門課沒有填寫課程大綱。<br />
            <template v-if="card.syllabus_url">可以點上方的「官方課程大綱」看學校頁面。</template>
          </p>
          <details
            v-for="s in sections"
            :key="s.key"
            class="group bg-base-200 rounded-lg"
            :open="s.open"
          >
            <summary
              class="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-2 px-4 py-3 font-medium"
            >
              <Icon :icon="s.icon" class="h-5 w-5 opacity-70" />
              {{ s.label }}
              <Icon
                icon="mingcute:down-line"
                class="h-4 w-4 ml-auto transition-transform group-open:rotate-180"
              />
            </summary>
            <div class="px-4 pb-4 text-sm leading-relaxed flex flex-col gap-1">
              <p v-for="(line, i) in s.lines" :key="i" class="whitespace-pre-line">{{ line }}</p>
            </div>
          </details>
        </template>
      </div>

      <!-- 頁尾:科目代號(選課系統用得到)與資料來源 -->
      <div
        v-if="card"
        class="px-5 py-3 border-t border-base-300 text-xs flex flex-wrap items-center gap-x-3 gap-y-1"
      >
        <span class="opacity-70">科目代號</span>
        <span class="font-mono">{{ code }}</span>
        <button class="btn btn-xs btn-ghost" @click="copyCode">
          <Icon icon="mingcute:copy-2-line" class="h-3 w-3" />
          {{ copied ? "已複製" : "複製" }}
        </button>
        <span class="opacity-50 sm:ml-auto">資料來源:政大全校課程查詢系統,內容以學校公告為準</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useCourseDetail } from "../composables/useCourseDetail";
import { useSchedule } from "../composables/useSchedule";
import { usePreference } from "../composables/usePreference";
import { SECTIONS, creditsText, paragraphs, subjectCode } from "../utils/courseText";

/**
 * 課程詳細資料卡片。
 *
 * 全頁只掛一份(App.vue),由 useCourseDetail().open(courseId) 打開 ——
 * 聊天候選卡片、課表面板、排課方案、志願序清單點課名都走這裡。
 * 資料來自 GET /api/courses/{id},直接讀資料庫、不經 LLM,所以不會有轉述錯誤。
 */
const { openId, card, loading, error, close, retry } = useCourseDetail();
const { courses: scheduled, loading: scheduleLoading, lastMessage, addCourse } = useSchedule();
const { has, toggle } = usePreference();

const chips = computed(() => {
  const c = card.value;
  if (!c) return [];
  return [
    { icon: "mingcute:user-3-line", text: c.teacher },
    { icon: "mingcute:time-line", text: c.time || "時間未定" },
    { icon: "mingcute:book-2-line", text: creditsText(c.credits) },
    { icon: "mingcute:location-line", text: c.classroom },
    { icon: "mingcute:building-2-line", text: c.unit },
    { icon: "mingcute:translate-line", text: c.language },
  ].filter((chip): chip is { icon: string; text: string } => !!chip.text);
});

const sections = computed(() => {
  const c = card.value;
  if (!c) return [];
  return SECTIONS.map((s) => ({ ...s, lines: paragraphs(c[s.key]) })).filter(
    (s) => s.lines.length > 0
  );
});

const code = computed(() => (card.value ? subjectCode(card.value.course_id) : ""));
const inSchedule = computed(() =>
  scheduled.value.some((c) => c.course_id === card.value?.course_id)
);
const inPreference = computed(() => !!card.value && has(card.value.course_id));

// 換一門課就清掉上一門的提示訊息
const message = ref("");
const copied = ref(false);
watch(openId, () => {
  message.value = "";
  copied.value = false;
});

const addToSchedule = async () => {
  if (!card.value) return;
  await addCourse(card.value.course_id);
  message.value = lastMessage.value;
};

const togglePreference = () => {
  const c = card.value;
  if (!c) return;
  toggle({
    course_id: c.course_id,
    name: c.name ?? "",
    time: c.time ?? "",
    teacher: c.teacher ?? "",
    credits: c.credits === null ? "" : String(c.credits),
  });
};

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(code.value);
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 2000);
  } catch {
    // http 的區網位址沒有剪貼簿權限;代號就在畫面上,使用者可以自己選取
  }
};

const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape" && openId.value) close();
};
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>
