<template>
  <div class="modal modal-open" @click.self="emits('close')">
    <div class="modal-box max-w-lg flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-lg grow">志願序</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="emits('close')">
          <Icon icon="mingcute:close-line" class="h-4 w-4" />
        </button>
      </div>

      <!-- 把課表整批帶進來。帶進來之後就是普通項目,可以個別刪掉 -->
      <button
        v-if="scheduleNotInList.length"
        class="btn btn-sm btn-outline"
        @click="addMany(scheduleNotInList)"
      >
        <Icon icon="mingcute:add-line" class="h-4 w-4" />
        加入課表裡的 {{ scheduleNotInList.length }} 門課
      </button>

      <p v-if="!entries.length" class="text-sm opacity-70 py-6 text-center leading-relaxed">
        還沒有任何志願。<br />
        用上面的按鈕把課表帶進來,或在聊天結果的課程卡片上按
        <Icon icon="mingcute:star-line" class="h-4 w-4 inline align-text-bottom" />
        加進來。
      </p>

      <template v-else>
        <p class="text-xs opacity-60 leading-relaxed">
          {{ entries.length }} 門課,編號以 100 均分(間距 {{ step }})——
          數字拉開是為了日後想在中間插一門新的課時,不必把後面整串重編。
        </p>

        <ul class="flex flex-col gap-1 max-h-80 overflow-auto">
          <li
            v-for="(e, i) in entries"
            :key="e.course_id"
            class="bg-base-200 rounded-lg p-2 flex gap-2 items-center"
          >
            <span class="badge badge-primary badge-sm shrink-0 w-10">{{ e.order }}</span>
            <div class="grow min-w-0">
              <p class="text-sm truncate" :title="e.name">{{ e.name }}</p>
              <p class="text-xs opacity-50 truncate">
                {{ e.time || "時間未定" }} ・ {{ e.teacher || "－" }}
              </p>
            </div>
            <button
              class="btn btn-ghost btn-xs btn-square shrink-0"
              :disabled="i === 0"
              @click="move(e.course_id, -1)"
              title="往前"
            >
              <Icon icon="mingcute:up-line" class="h-4 w-4" />
            </button>
            <button
              class="btn btn-ghost btn-xs btn-square shrink-0"
              :disabled="i === entries.length - 1"
              @click="move(e.course_id, 1)"
              title="往後"
            >
              <Icon icon="mingcute:down-line" class="h-4 w-4" />
            </button>
            <button
              class="btn btn-ghost btn-xs btn-square shrink-0"
              @click="remove(e.course_id)"
              title="從志願序移除"
            >
              <Icon icon="mingcute:close-line" class="h-4 w-4" />
            </button>
          </li>
        </ul>

        <div class="flex gap-2 flex-wrap items-center">
          <button class="btn btn-sm" @click="copy">
            <Icon icon="mingcute:copy-line" class="h-4 w-4" />
            {{ copied ? "已複製" : "複製清單" }}
          </button>
          <button class="btn btn-sm btn-ghost" @click="clear">清空</button>
        </div>
        <p v-if="copyError" class="text-xs opacity-70">{{ copyError }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { MAX_ORDER, usePreference } from "../composables/usePreference";

/**
 * 志願序表單。
 *
 * 加課有兩條路:聊天候選卡片上的星號、以及這裡的「加入課表裡的 N 門課」。
 * **兩者都是明確動作**,清單裡不會有使用者沒點過的東西 —— 所以每一列都刪得掉。
 *
 * 編號規則在 usePreference.orderNumber(n 門課把 1~100 均分),
 * 這裡只負責互動與呈現,數字一律問 composable,不在畫面上自己算一套。
 */
const emits = defineEmits<{ (e: "close"): void }>();

const { entries, addMany, remove, move, clear, scheduleNotInList, asText } =
  usePreference();

const step = computed(() =>
  Math.max(1, Math.floor(MAX_ORDER / Math.max(1, entries.value.length)))
);

const copied = ref(false);
const copyError = ref("");

const copy = async () => {
  copyError.value = "";
  try {
    // navigator.clipboard 需要安全上下文(https / localhost);http 的區網位址會沒有
    await navigator.clipboard.writeText(asText());
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 2000);
  } catch {
    copyError.value = "這個瀏覽器不允許自動複製,請手動選取上面的清單。";
  }
};

const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") emits("close");
};

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>
