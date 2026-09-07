<template>
  <div class="mt-3 flex flex-col gap-2">
    <div class="flex items-center gap-2 flex-wrap">
      <p class="text-xs opacity-70 grow">推薦課表,可直接套用到右側課表:</p>
      <label class="cursor-pointer flex items-center gap-1">
        <input type="checkbox" class="checkbox checkbox-xs" v-model="keepExisting" />
        <span class="text-xs opacity-70">保留現有課程</span>
      </label>
    </div>

    <div
      v-for="p in plans"
      :key="p.index"
      class="bg-base-100 text-base-content rounded-lg p-2 flex flex-col gap-2"
    >
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm grow">方案 {{ p.index }}</span>
        <span class="badge badge-sm">{{ p.total_credits }} 學分</span>
        <span class="badge badge-ghost badge-sm">{{ p.days || "時間未定" }}</span>
      </div>

      <ul class="flex flex-col gap-1">
        <li
          v-for="c in p.courses"
          :key="c.course_id"
          class="text-xs flex gap-2 items-baseline"
        >
          <span class="opacity-60 shrink-0 w-12">{{ c.time || "未定" }}</span>
          <span class="truncate grow" :title="c.name">{{ c.name }}</span>
          <span class="opacity-50 shrink-0 truncate max-w-[6rem]">
            {{ c.teacher || "－" }}
          </span>
        </li>
      </ul>

      <button
        class="btn btn-xs"
        :class="isApplied(p) ? 'btn-ghost' : 'btn-primary'"
        :disabled="loading || isApplied(p)"
        @click="applyOne(p)"
      >
        <Icon
          :icon="isApplied(p) ? 'mingcute:check-line' : 'mingcute:add-line'"
          class="h-4 w-4"
        />
        {{ buttonLabel(p) }}
      </button>
    </div>

    <p v-if="message" class="text-xs opacity-70 leading-relaxed">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import { useSchedule } from "../composables/useSchedule";

/**
 * 聊天結果下方的「套用推薦課表」卡片。
 *
 * 資料來自後端 SSE 側通道的 plans 事件(main.py 攔 schedule_tool 的 on_tool_end)。
 * 方案編號與回覆文字裡的「方案 N」一致,course_id 沒有經過 LLM 轉述 ——
 * 與 CourseCandidates.vue 的單門加課同一個原則,只是這裡一次送整組。
 *
 * 為什麼衝堂替換不在這裡判斷:方案內部已由後端 scheduler 保證兩兩不衝堂,
 * 而與「課表原有課程」的衝突由 /api/schedule/apply 照既有規則處理。前端算一次
 * 就會有第二套規則,遲早跟後端走鐘。
 */
defineProps<{ plans: SchedulePlan[] }>();

// courses / loading / lastMessage 是 useSchedule 的模組級共享狀態:
// 這裡套用後右側課表面板會同步更新,不必另外通知。
const { courses: scheduled, loading, lastMessage, applyPlan } = useSchedule();

/**
 * 預設是「整張課表換成這個方案」。
 * 勾起來才變成疊加 —— 使用者手動加過課、想留著時用。
 */
const keepExisting = ref(false);

// lastMessage 是全域共享的,直接顯示會讓每則訊息下方都跳出同一句;
// 只在自己這組卡片按下套用後才複製一份留在本地。
const message = ref("");

/** 方案裡每一門都已在課表上 = 這個方案已經套用過(空方案不算)。 */
const isApplied = (plan: SchedulePlan) =>
  plan.courses.length > 0 &&
  plan.courses.every((c) =>
    scheduled.value.some((s) => s.course_id === c.course_id)
  );

const buttonLabel = (plan: SchedulePlan) => {
  if (isApplied(plan)) return "已在課表";
  return keepExisting.value ? "加進課表" : "套用此方案";
};

const applyOne = async (plan: SchedulePlan) => {
  await applyPlan(
    plan.courses.map((c) => c.course_id),
    !keepExisting.value
  );
  message.value = lastMessage.value;
};
</script>
