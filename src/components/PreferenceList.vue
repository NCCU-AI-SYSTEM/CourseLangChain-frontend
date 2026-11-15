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
          填的數字只決定先後,選課系統會重新編成第 1、2、3…志願;
          右邊的選上機率依此計算,資料來自官方分發結果(只有通識與體育)。
        </p>

        <ul class="flex flex-col gap-1 max-h-80 overflow-auto">
          <li
            v-for="(e, i) in entries"
            :key="e.course_id"
            class="bg-base-200 rounded-lg p-2 flex gap-2 items-center"
          >
            <span class="badge badge-primary badge-sm shrink-0 w-10">{{ e.order }}</span>
            <div class="grow min-w-0">
              <button
                class="text-sm truncate block w-full text-left hover:underline underline-offset-2"
                :title="`${e.name}(點擊看課程大綱)`"
                @click="openDetail(e.course_id)"
              >
                {{ e.name }}
              </button>
              <p class="text-xs opacity-50 truncate">
                {{ e.time || "時間未定" }} ・ {{ e.teacher || "－" }}
              </p>
            </div>
            <span
              v-if="badges[i]"
              class="badge badge-sm shrink-0 whitespace-nowrap"
              :class="TONE_CLASS[badges[i]!.tone]"
              :title="badges[i]!.title"
            >
              第 {{ i + 1 }} 志願 {{ badges[i]!.text }}
            </span>
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

        <!-- 建議排序:期望選上門數最大的排法。只給建議,使用者按「套用」才會動清單 -->
        <div v-if="suggestion" class="bg-base-200 rounded-lg p-3 text-sm flex flex-col gap-2">
          <template v-if="applied">
            <p>
              <Icon icon="mingcute:check-line" class="h-4 w-4 inline align-text-bottom" />
              已套用建議排序,期望選上約 <b>{{ fmt(suggestion.after) }}</b> 門。
            </p>
          </template>
          <template v-else-if="suggestion.changed">
            <p>
              目前排法期望選上 <b>{{ fmt(suggestion.before) }}</b> 門 → 建議排法
              <b>{{ fmt(suggestion.after) }}</b> 門
            </p>
            <ol class="list-decimal pl-5 leading-relaxed">
              <li v-for="id in suggestion.order" :key="id">
                {{ nameOf(id) }}
                <span v-if="suggestion.pinned.includes(id)" class="opacity-60">(無官方資料,位置不動)</span>
              </li>
            </ol>
            <p class="text-xs opacity-70 leading-relaxed">
              體育最多算 1 門(選上一門後,後面的體育不分發),通識逐門相加。
              建議只看選上機率,不知道你比較想上哪一門;最想上的課被往後移的話,套用後可以再手動調回來。
              <template v-if="!suggestion.exact">課程較多,這是近似的排法。</template>
            </p>
            <div class="flex gap-2">
              <button class="btn btn-xs btn-primary" @click="reorder(suggestion.order)">套用建議</button>
              <button class="btn btn-xs btn-ghost" @click="suggestion = null">保留原順序</button>
            </div>
          </template>
          <p v-else>目前的排法已經是期望選上門數最高的排法(約 {{ fmt(suggestion.before) }} 門)。</p>
        </div>
        <p v-if="suggestError" class="text-xs opacity-70">{{ suggestError }}</p>

        <div class="flex gap-2 flex-wrap items-center">
          <button
            class="btn btn-sm btn-primary"
            :disabled="suggesting"
            @click="suggest"
            title="依選上機率,算出期望選上門數最多的排法"
          >
            <Icon icon="mingcute:list-ordered-line" class="h-4 w-4" />
            {{ suggesting ? "計算中…" : "建議排序" }}
          </button>
          <button class="btn btn-sm" @click="copy">
            <Icon icon="mingcute:copy-line" class="h-4 w-4" />
            {{ copied ? "已複製" : "複製清單" }}
          </button>
          <button class="btn btn-sm btn-ghost" @click="clear">清空</button>
        </div>
        <p v-if="copyError" class="text-xs opacity-70">{{ copyError }}</p>
        <p v-if="chanceError" class="text-xs opacity-70">{{ chanceError }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import {
  MAX_ORDER,
  chanceBadge,
  fetchOrderSuggestion,
  usePreference,
  usePreferenceChances,
  type ChanceTone,
  type OrderSuggestion,
} from "../composables/usePreference";
import { useCourseDetail } from "../composables/useCourseDetail";

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

const { entries, addMany, remove, move, clear, reorder, scheduleNotInList, asText } =
  usePreference();
const { open: openDetail } = useCourseDetail();
const { chances, error: chanceError } = usePreferenceChances();

// class 名稱要完整寫出來:Tailwind 只認得原始碼裡字面出現的 class,`badge-${tone}` 會在 build 時被刪掉
const TONE_CLASS: Record<ChanceTone, string> = {
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  // badge-ghost 的底色和每一列的 bg-base-200 一樣,看起來像沒有徽章;改用外框
  ghost: "badge-outline opacity-70",
};

/** 每一列的機率徽章;第 i 列 = 第 i+1 志願(選課系統會把填的數字重新編號)。 */
const badges = computed(() =>
  entries.value.map((e, i) => chanceBadge(chances.value[e.course_id], i + 1))
);

const step = computed(() =>
  Math.max(1, Math.floor(MAX_ORDER / Math.max(1, entries.value.length)))
);

// ── 建議排序 ──
const suggestion = ref<OrderSuggestion | null>(null);
const suggesting = ref(false);
const suggestError = ref("");
const applied = ref(false);

const fmt = (x: number) => x.toFixed(2);
const nameOf = (id: string) => entries.value.find((e) => e.course_id === id)?.name ?? id;

const suggest = async () => {
  suggesting.value = true;
  suggestError.value = "";
  applied.value = false;
  try {
    suggestion.value = await fetchOrderSuggestion(entries.value);
  } catch {
    suggestion.value = null;
    suggestError.value = "建議排序暫時無法取得(後端沒有回應)";
  } finally {
    suggesting.value = false;
  }
};

// 清單變成建議的順序 = 剛按了套用;變成別的順序(手動調整、加刪課)= 建議作廢
watch(
  () => entries.value.map((e) => e.course_id).join(","),
  (ids) => {
    if (!suggestion.value) return;
    const same = ids === suggestion.value.order.join(",");
    applied.value = same && suggestion.value.changed;
    if (!same) suggestion.value = null;
  }
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
