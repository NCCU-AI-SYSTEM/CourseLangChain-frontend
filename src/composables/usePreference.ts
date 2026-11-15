import axios from "axios";
import { computed, ref, watch } from "vue";
import { useSchedule, type ScheduleCourse } from "./useSchedule";

/**
 * 志願序清單 —— 政大選課要為每門課填一個志願序數字的那份表單。
 *
 * 刻意只活在前端(sessionStorage),不進後端 session:
 * 後端那份 session_schedule 記的是「使用者實際敲定的課表」,兩者語意不同 ——
 * 志願序是選課系統要填的**申請順序**,可以包含最後沒選上的課,也可以不含課表裡
 * 已經確定的課。混在一起會讓 agent 的「我的課表」變得語意不明。
 * 與 useSession 一樣用 sessionStorage:分頁關掉就消失,與後端 in-memory 的取捨一致。
 *
 * **清單裡的每一筆都是使用者明確加進來的**,沒有任何自動納入。
 * (早期版本讓課表的課自動進清單,結果那些課刪不掉 —— 刪完下次開又被推導回來。
 *  想把課表帶進來就按面板上那顆「加入課表裡的 N 門課」,進來之後就是普通項目,可刪。)
 */
const STORAGE_KEY = "course-preference-order";

/** 志願序的一門課(課表與聊天候選課的最小公分母)。 */
export interface PreferenceCourse {
  course_id: string;
  name: string;
  time: string;
  teacher: string;
  /** 課表來源是 number、聊天候選來源是 string,一律轉成字串只做顯示 */
  credits: string;
}

/** 清單的一列:課程 + 要填進選課系統的那個數字。 */
export interface PreferenceEntry extends PreferenceCourse {
  order: number;
}

/** 選課系統的志願序上限。 */
export const MAX_ORDER = 100;

/**
 * 把「清單第幾列」換算成要填的志願序數字。
 *
 * n 門課就把 1~100 均分:間距 = floor(100 / n),第 i 個(從 0 起算)是 (i+1) * 間距。
 * 例:3 門 → 33 / 66 / 99;5 門 → 20 / 40 / 60 / 80 / 100。
 *
 * 為什麼不直接填 1、2、3:選課系統看的是**相對順序**,把數字拉開之後,日後想在
 * 兩門課中間插一門新的,不必把後面整串重編。
 *
 * n > 100 時間距會被 floor 成 0,那樣所有課會拿到同一個號碼 —— 所以間距至少是 1,
 * 並在 MAX_ORDER 封頂(超過 100 門的部分只能並列 100,實務上不會發生)。
 */
export function orderNumber(index: number, total: number): number {
  const step = Math.max(1, Math.floor(MAX_ORDER / Math.max(1, total)));
  return Math.min(MAX_ORDER, (index + 1) * step);
}

function load(): PreferenceCourse[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PreferenceCourse[]) : [];
  } catch {
    // 存壞了(手動改過、舊版格式)就當作沒有,不要讓整個面板掛掉
    return [];
  }
}

// 志願序本體:保序的課程清單。編號不存,一律由 orderNumber 現算 ——
// 存下來的話刪一筆就得整串重寫,而且會有「存的數字與畫面不符」的機會。
const list = ref<PreferenceCourse[]>(load());

watch(list, (v) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // 無痕模式 / 停用網站資料時寫不進去。清單在這個分頁裡照常運作,只是重整後不留。
  }
});

/** 課表項目 → 志願序項目。兩邊只有 credits 的型別不同。 */
export function scheduleToPreference(c: ScheduleCourse): PreferenceCourse {
  return {
    course_id: c.course_id,
    name: c.name,
    time: c.time,
    teacher: c.teacher,
    credits: String(c.credits ?? ""),
  };
}

export function usePreference() {
  const { courses: scheduled } = useSchedule();

  const has = (courseId: string) =>
    list.value.some((c) => c.course_id === courseId);

  /** 已排定的志願序(帶編號)。編號隨清單長度與順序即時重算。 */
  const entries = computed<PreferenceEntry[]>(() =>
    list.value.map((c, i) => ({ ...c, order: orderNumber(i, list.value.length) }))
  );

  /** 加一門到清單最後(已在清單裡就不動,重複呼叫無副作用)。 */
  const add = (course: PreferenceCourse) => {
    if (has(course.course_id)) return;
    list.value = [...list.value, course];
  };

  /** 一次加多門(例如把整份課表帶進來);已在清單裡的自動略過。 */
  const addMany = (courses: PreferenceCourse[]) => {
    const fresh = courses.filter(
      (c, i) =>
        !has(c.course_id) &&
        courses.findIndex((o) => o.course_id === c.course_id) === i
    );
    if (fresh.length) list.value = [...list.value, ...fresh];
    return fresh.length;
  };

  const remove = (courseId: string) => {
    list.value = list.value.filter((c) => c.course_id !== courseId);
  };

  const toggle = (course: PreferenceCourse) => {
    if (has(course.course_id)) remove(course.course_id);
    else add(course);
  };

  /** 把某一列往前 / 往後挪一格。編號是算出來的,挪完自然跟著換。 */
  const move = (courseId: string, delta: number) => {
    const next = [...list.value];
    const from = next.findIndex((c) => c.course_id === courseId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    list.value = next;
  };

  const clear = () => {
    list.value = [];
  };

  /** 依課號清單重排(套用建議排序用)。 */
  const reorder = (ids: string[]) => {
    list.value = reorderByIds(list.value, ids);
  };

  /** 開新對話時一併清掉:課表與候選課都換了,舊志願序沒有意義。 */
  const resetLocal = clear;

  /** 課表裡還沒進志願序的課,供「加入課表裡的 N 門課」那顆按鈕使用。 */
  const scheduleNotInList = computed(() =>
    scheduled.value
      .filter((c) => !has(c.course_id))
      .map(scheduleToPreference)
  );

  /** 複製到選課系統用的純文字(一行一門:志願序 課名 時間 課號)。 */
  const asText = () =>
    entries.value
      .map((e) => `${e.order}\t${e.name}\t${e.time || "時間未定"}\t${e.course_id}`)
      .join("\n");

  return {
    entries,
    has,
    add,
    addMany,
    remove,
    toggle,
    move,
    clear,
    reorder,
    resetLocal,
    scheduleNotInList,
    asText,
  };
}

/**
 * 依課號清單重排。ids 裡沒有的課(例如查詢期間使用者又加了一門)接在最後,不會被弄丟;
 * ids 裡有、清單沒有的課號直接略過。
 */
export function reorderByIds<T extends { course_id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((c) => [c.course_id, c]));
  const ordered = ids.map((id) => byId.get(id)).filter((c): c is T => c !== undefined);
  const seen = new Set(ordered.map((c) => c.course_id));
  return [...ordered, ...items.filter((c) => !seen.has(c.course_id))];
}

// ── 選上機率(後端 /api/preference/chances,官方分發結果的存活分析) ──────────

/** 查詢一門課的機率。rank 是清單裡的名次(第幾志願),不是畫面上的 33/66/99。 */
export interface ChanceRequest {
  course_id: string;
  time: string;
  rank: number;
}

/** 後端回的一筆。沒有官方歷史的課(必修、選修、新開的班次)只有 available: false。 */
export interface PreferenceChance {
  course_id: string;
  rank: number;
  available: boolean;
  probability?: number;
  label?: string;
  terms?: number;
  full_terms?: number;
  strictest?: number | null;
  validated?: boolean;
}

export type ChanceTone = "success" | "warning" | "error" | "ghost";

/**
 * 清單 → 機率查詢。
 *
 * 政大會把填的數字重新編成第 1、2、3…志願(填的數字只決定先後),
 * 所以機率要看「第幾列」;33/66/99 只是方便日後插入,和選上機率無關。
 */
export function chanceRequests(entries: PreferenceCourse[]): ChanceRequest[] {
  return entries.map((e, i) => ({ course_id: e.course_id, time: e.time, rank: i + 1 }));
}

/**
 * 機率 → 徽章。顏色界線與後端 preference_survival.describe 一致(0.7「很有機會」、0.4「一半一半」)。
 * 還沒查到、或查到的是別的名次(剛調整過順序)時回 null,畫面先不顯示,避免閃出舊名次的數字。
 */
export function chanceBadge(
  c: PreferenceChance | undefined,
  rank: number
): { text: string; tone: ChanceTone; title: string } | null {
  if (!c || c.rank !== rank) return null;
  if (!c.available || c.probability === undefined) {
    return {
      text: "無官方資料",
      tone: "ghost",
      title: "官方分發結果只涵蓋通識與體育；必修、選修與新開的班次資料不足，不提供預測",
    };
  }
  const p = c.probability;
  const tone: ChanceTone = p >= 0.7 ? "success" : p >= 0.4 ? "warning" : "error";
  const note = c.validated === false ? "（第 10 志願以後的估計沒有經過驗證）" : "";
  return {
    text: `約 ${Math.round(p * 100)}%`,
    tone,
    title:
      `排第 ${rank} 志願：${c.label ?? ""}。依這個班次 ${c.terms ?? 0} 個學期的官方分發結果` +
      `（${c.full_terms ?? 0} 個學期額滿）估計${note}`,
  };
}

/** 後端 /api/preference/optimize 的結果。 */
export interface OrderSuggestion {
  order: string[]; // 建議順序的課號
  before: number; // 目前順序的期望選上門數
  after: number; // 建議順序的期望選上門數
  changed: boolean;
  exact: boolean;
  pinned: string[]; // 沒有官方資料、位置不動的課號
}

/**
 * 請後端算「期望選上門數最大」的排法:通識逐門相加、體育最多算一門。
 * 只是建議 —— 清單的順序也代表「最想上哪一門」,那是機率看不到的。
 */
export async function fetchOrderSuggestion(entries: PreferenceCourse[]): Promise<OrderSuggestion> {
  const items = entries.map((e) => ({ course_id: e.course_id, time: e.time }));
  const res = await axios.post("/api/preference/optimize", { items });
  return res.data as OrderSuggestion;
}

/**
 * 志願序清單每一列的選上機率。清單一變(加、刪、調順序)就重查。
 *
 * 只給志願序面板用:放在 usePreference 裡的話,任何用到 usePreference 的地方(包括測試)
 * 都會發出網路請求。watch 跟著呼叫它的元件建立與銷毀,面板打開才會查。
 */
export function usePreferenceChances() {
  const { entries } = usePreference();
  const chances = ref<Record<string, PreferenceChance>>({});
  const error = ref("");
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const refresh = async (items: ChanceRequest[]) => {
    const mine = ++seq;
    if (!items.length) {
      chances.value = {};
      return;
    }
    try {
      const res = await axios.post("/api/preference/chances", { items });
      if (mine !== seq) return; // 已經有更新的請求,丟掉這個比較舊的結果
      const next: Record<string, PreferenceChance> = {};
      for (const c of (res.data.items ?? []) as PreferenceChance[]) next[c.course_id] = c;
      chances.value = next;
      error.value = "";
    } catch {
      if (mine === seq) error.value = "選上機率暫時無法取得（後端沒有回應）";
    }
  };

  watch(
    () => chanceRequests(entries.value),
    (items) => {
      clearTimeout(timer);
      // 連續按上下移時只查最後一次
      timer = setTimeout(() => refresh(items), 200);
    },
    { immediate: true, deep: true }
  );

  return { chances, error };
}
