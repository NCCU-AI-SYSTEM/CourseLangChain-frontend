<template>
  <div class="mt-3 flex flex-col gap-2">
    <p class="text-xs opacity-70">
      查到的課程:點課名看完整大綱,也可以直接加入課表,或用
      <Icon icon="mingcute:star-line" class="h-3 w-3 inline align-text-bottom" />
      加進志願序。
    </p>

    <div
      v-for="c in courses"
      :key="c.course_id"
      class="bg-base-100 text-base-content rounded-xl p-3 flex gap-3 items-start shadow-sm"
    >
      <div class="grow min-w-0">
        <button
          class="font-medium text-sm text-left line-clamp-2 hover:underline underline-offset-2"
          :title="`${c.name}(點擊看課程大綱)`"
          @click="openDetail(c.course_id)"
        >
          {{ c.name }}
        </button>
        <div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs opacity-70">
          <span class="flex items-center gap-1">
            <Icon icon="mingcute:user-3-line" class="h-3 w-3" />{{ c.teacher || "－" }}
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="mingcute:time-line" class="h-3 w-3" />{{ c.time || "時間未定" }}
          </span>
          <span class="flex items-center gap-1">
            <Icon icon="mingcute:book-2-line" class="h-3 w-3" />{{ c.credits || "?" }} 學分
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1 shrink-0 items-stretch">
        <button
          class="btn btn-xs"
          :class="inSchedule(c.course_id) ? 'btn-ghost' : 'btn-primary'"
          :disabled="loading || inSchedule(c.course_id)"
          @click="add(c.course_id)"
        >
          <Icon
            :icon="
              inSchedule(c.course_id) ? 'mingcute:check-line' : 'mingcute:add-line'
            "
            class="h-4 w-4"
          />
          {{ inSchedule(c.course_id) ? "已加入" : "加入課表" }}
        </button>
        <!--
          加進志願序。刻意與「加入課表」分開:志願序是選課系統要填的申請順序,
          可以包含最後沒選上的課;課表是已經敲定的那份。混成同一顆按鈕會讓
          「我到底排了什麼」變得說不清楚。
        -->
        <button
          class="btn btn-xs btn-ghost"
          :class="{ 'text-primary': inPreference(c.course_id) }"
          @click="togglePreference(toPreference(c))"
          :title="inPreference(c.course_id) ? '從志願序移除' : '加進志願序'"
        >
          <Icon
            :icon="
              inPreference(c.course_id) ? 'mingcute:star-fill' : 'mingcute:star-line'
            "
            class="h-4 w-4"
          />
          志願序
        </button>
        <button class="btn btn-xs btn-ghost" @click="openDetail(c.course_id)">
          <Icon icon="mingcute:document-line" class="h-4 w-4" />
          詳細
        </button>
      </div>
    </div>

    <p v-if="message" class="text-xs opacity-70 leading-relaxed">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import { useCourseDetail } from "../composables/useCourseDetail";
import { useSchedule } from "../composables/useSchedule";
import {
  usePreference,
  type PreferenceCourse,
} from "../composables/usePreference";

/**
 * 聊天結果下方的「加入課表」候選卡片。
 *
 * 課程資料來自後端 SSE 側通道(main.py 攔 on_tool_end),13 位 course_id 沒有
 * 經過 LLM 轉述,所以不會有抄錯/捏造的問題——這正是不讓模型把 id 印在表格裡的原因。
 * 加課走既有的 useSchedule().addCourse(),衝堂替換與學分計算全由後端 scheduler 決定。
 */
defineProps<{ courses: CourseCandidate[] }>();

// 點課名或「詳細」打開課程卡片(全頁共用一張,掛在 App.vue)
const { open: openDetail } = useCourseDetail();

// courses / loading / lastMessage 是 useSchedule 的模組級共享狀態:
// 這裡按下加入,右側課表面板會同步更新,不必另外通知。
const {
  courses: scheduled,
  loading,
  lastMessage,
  addCourse,
} = useSchedule();

// 志願序清單同樣是模組級共享狀態:這裡加進去的課,面板的「志願序」直接就看得到。
const { has: inPreference, toggle: togglePreference } = usePreference();

/** 候選課 → 志願序卡片。兩邊只有 credits 的型別不同(這裡是字串)。 */
const toPreference = (c: CourseCandidate): PreferenceCourse => ({
  course_id: c.course_id,
  name: c.name,
  time: c.time,
  teacher: c.teacher,
  credits: c.credits,
});

// lastMessage 是全域共享的,直接顯示會讓每則訊息下方都跳出同一句;
// 只在自己這張卡片按下加入後才複製一份留在本地。
const message = ref("");

const inSchedule = (id: string) =>
  scheduled.value.some((c) => c.course_id === id);

const add = async (id: string) => {
  await addCourse(id);
  message.value = lastMessage.value;
};
</script>
