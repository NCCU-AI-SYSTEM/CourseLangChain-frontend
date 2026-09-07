<template>
  <div class="modal modal-open" @click.self="emits('close')">
    <div class="modal-box max-w-lg flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-lg grow">排志願序</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="emits('close')">
          <Icon icon="mingcute:close-line" class="h-4 w-4" />
        </button>
      </div>

      <div class="tabs tabs-boxed tabs-sm self-start">
        <button
          class="tab"
          :class="{ 'tab-active': view === 'swipe' }"
          @click="view = 'swipe'"
        >
          滑卡 <span v-if="pending.length" class="ml-1 badge badge-sm">{{ pending.length }}</span>
        </button>
        <button
          class="tab"
          :class="{ 'tab-active': view === 'list' }"
          @click="view = 'list'"
        >
          志願序 <span v-if="entries.length" class="ml-1 badge badge-sm">{{ entries.length }}</span>
        </button>
      </div>

      <!-- ── 滑卡 ─────────────────────────────────────────────────────── -->
      <template v-if="view === 'swipe'">
        <p v-if="!deck.length" class="text-sm opacity-70 py-8 text-center leading-relaxed">
          還沒有可以排的課。<br />
          先把課加進右側課表,或在聊天結果的課程卡片上按
          <Icon icon="mingcute:star-line" class="h-4 w-4 inline align-text-bottom" />
          把課挑進來。
        </p>

        <template v-else-if="top">
          <!--
            卡片堆。只實際渲染最上面兩張:下面那張純粹是「後面還有」的視覺提示,
            全部渲染會讓 30 張課的堆疊每次拖曳都重排整個 DOM。
          -->
          <div class="relative h-56 select-none">
            <div
              v-if="pending.length > 1"
              class="absolute inset-x-2 top-2 bottom-0 bg-base-200 rounded-xl"
            />
            <div
              class="absolute inset-0 bg-base-100 border border-base-300 rounded-xl p-4 flex flex-col gap-2 cursor-grab active:cursor-grabbing touch-none shadow"
              :style="cardStyle"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerEnd"
              @pointercancel="onPointerEnd"
            >
              <p class="font-bold text-base leading-snug">{{ top.name }}</p>
              <p class="text-sm opacity-70">
                {{ top.time || "時間未定" }} ・ {{ top.credits || "?" }} 學分
              </p>
              <p class="text-sm opacity-50">{{ top.teacher || "－" }}</p>
              <p class="text-xs opacity-40 mt-auto">{{ top.course_id }}</p>

              <!-- 拖曳中的即時判讀:方向講清楚,不必等放開才知道會發生什麼 -->
              <span
                v-if="hint"
                class="absolute top-3 right-3 badge"
                :class="hint === 'keep' ? 'badge-primary' : 'badge-ghost'"
              >
                {{ hint === "keep" ? "要選" : "略過" }}
              </span>
            </div>
          </div>

          <p class="text-xs opacity-60 text-center">
            右滑要選、左滑略過(也可以用 ← → 或下面的按鈕)・還剩 {{ pending.length }} 張
          </p>

          <div class="flex gap-2 justify-center items-center">
            <button class="btn btn-sm" @click="commit(-1)" :disabled="!!leaving">
              <Icon icon="mingcute:close-line" class="h-4 w-4" />
              略過
            </button>
            <button
              class="btn btn-sm btn-ghost btn-square"
              @click="undo"
              :disabled="!history.length"
              title="上一張"
            >
              <Icon icon="mingcute:back-line" class="h-4 w-4" />
            </button>
            <button class="btn btn-sm btn-primary" @click="commit(1)" :disabled="!!leaving">
              <Icon icon="mingcute:check-line" class="h-4 w-4" />
              要選
            </button>
          </div>
        </template>

        <div v-else class="py-8 text-center flex flex-col gap-3">
          <p class="text-sm opacity-70">
            全部滑完了,選了 {{ entries.length }} 門課。
          </p>
          <button class="btn btn-sm btn-primary self-center" @click="view = 'list'">
            看志願序
          </button>
          <button class="btn btn-xs btn-ghost self-center" @click="restart">
            重滑一次
          </button>
        </div>
      </template>

      <!-- ── 志願序清單 ───────────────────────────────────────────────── -->
      <template v-else>
        <p v-if="!entries.length" class="text-sm opacity-70 py-8 text-center">
          還沒選任何課。回「滑卡」右滑幾張吧。
        </p>

        <template v-else>
          <p class="text-xs opacity-60 leading-relaxed">
            {{ entries.length }} 門課,編號以 100 均分(間距 {{ step }})——
            數字拉開是為了日後想插一門新的課進中間時,不必把後面整串重編。
          </p>

          <ul class="flex flex-col gap-1 max-h-72 overflow-auto">
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
                @click="drop(e.course_id)"
                title="移除"
              >
                <Icon icon="mingcute:close-line" class="h-4 w-4" />
              </button>
            </li>
          </ul>

          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-sm" @click="copy">
              <Icon icon="mingcute:copy-line" class="h-4 w-4" />
              {{ copied ? "已複製" : "複製清單" }}
            </button>
            <button class="btn btn-sm btn-ghost" @click="restart">重滑一次</button>
          </div>
          <p v-if="copyError" class="text-xs opacity-70">{{ copyError }}</p>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { MAX_ORDER, usePreference } from "../composables/usePreference";

/**
 * 滑卡建志願序。
 *
 * 牌堆 = 右側課表的課 + 使用者從聊天候選課挑進來的課(見 usePreference)。
 * 右滑收進志願序、左滑略過;**收進去的先後順序就是志願序順序**,滑完可以再微調。
 *
 * 編號規則在 usePreference.orderNumber:n 門課把 1~100 均分,間距 floor(100/n)。
 * 這裡只負責互動,數字一律問 composable,不在畫面上自己算一套。
 */
const emits = defineEmits<{ (e: "close"): void }>();

const {
  deck,
  entries,
  remaining,
  keep,
  move,
  drop,
  clearOrder,
  asText,
} = usePreference();

const view = ref<"swipe" | "list">("swipe");
// 本輪左滑掉的課。刻意只留在元件裡不進 sessionStorage:
// 「略過」是這一輪的決定,重開面板時本來就該讓使用者重新看一次。
const skipped = ref<string[]>([]);
// 每一步做了什麼,供「上一張」回復(滑錯一張不必整輪重來)
const history = ref<{ course_id: string; action: "keep" | "skip" }[]>([]);

const pending = computed(() => remaining(skipped.value));
const top = computed(() => pending.value[0] ?? null);

const step = computed(() =>
  Math.max(1, Math.floor(MAX_ORDER / Math.max(1, entries.value.length)))
);

// --- 拖曳 -----------------------------------------------------------------
// 用 Pointer Events 而非 mouse/touch 各寫一套:滑鼠、觸控、觸控筆共用同一條路徑,
// 且 setPointerCapture 讓手指滑出卡片邊界後仍收得到 move/up(不然卡片會卡在半路)。
const COMMIT_PX = 90; // 超過這個位移才算數,避免點一下就被判成滑動

const dragX = ref(0);
const dragging = ref(false);
const leaving = ref<0 | 1 | -1>(0);
let startX = 0;
let activePointer = -1;

const hint = computed(() => {
  if (Math.abs(dragX.value) < COMMIT_PX) return "";
  return dragX.value > 0 ? "keep" : "skip";
});

const cardStyle = computed(() => {
  const x = leaving.value ? leaving.value * 700 : dragX.value;
  return {
    transform: `translateX(${x}px) rotate(${x / 25}deg)`,
    opacity: leaving.value ? 0 : 1,
    // 拖曳中不能有 transition,否則卡片會追不上手指
    transition: dragging.value ? "none" : "transform 180ms ease-out, opacity 180ms ease-out",
  };
});

const onPointerDown = (e: PointerEvent) => {
  if (leaving.value) return;
  dragging.value = true;
  startX = e.clientX;
  activePointer = e.pointerId;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPointerMove = (e: PointerEvent) => {
  if (!dragging.value || e.pointerId !== activePointer) return;
  dragX.value = e.clientX - startX;
};

const onPointerEnd = (e: PointerEvent) => {
  if (!dragging.value || e.pointerId !== activePointer) return;
  dragging.value = false;
  activePointer = -1;
  if (Math.abs(dragX.value) >= COMMIT_PX) commit(dragX.value > 0 ? 1 : -1);
  else dragX.value = 0; // 沒滑夠遠 → 彈回原位
};

/** 定案一張卡:先讓它飛出畫面,動畫結束再換下一張(否則會瞬間跳掉)。 */
const commit = (dir: 1 | -1) => {
  const card = top.value;
  if (!card || leaving.value) return;
  dragging.value = false;
  leaving.value = dir;
  window.setTimeout(() => {
    if (dir === 1) {
      keep(card.course_id);
      history.value = [...history.value, { course_id: card.course_id, action: "keep" }];
    } else {
      skipped.value = [...skipped.value, card.course_id];
      history.value = [...history.value, { course_id: card.course_id, action: "skip" }];
    }
    dragX.value = 0;
    leaving.value = 0;
  }, 180);
};

const undo = () => {
  const last = history.value[history.value.length - 1];
  if (!last) return;
  history.value = history.value.slice(0, -1);
  if (last.action === "keep") drop(last.course_id);
  else skipped.value = skipped.value.filter((id) => id !== last.course_id);
};

const restart = () => {
  clearOrder();
  skipped.value = [];
  history.value = [];
  dragX.value = 0;
  leaving.value = 0;
  view.value = "swipe";
};

// --- 複製 -----------------------------------------------------------------
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

// --- 鍵盤 -----------------------------------------------------------------
const onKey = (e: KeyboardEvent) => {
  if (view.value !== "swipe" || !top.value) return;
  if (e.key === "ArrowRight") commit(1);
  else if (e.key === "ArrowLeft") commit(-1);
  else if (e.key === "Escape") emits("close");
};

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>
