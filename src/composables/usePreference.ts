import { computed, ref, watch } from "vue";
import { useSchedule, type ScheduleCourse } from "./useSchedule";

/**
 * 志願序草稿 —— 政大選課的「每門課填一個志願序數字」那份清單。
 *
 * 刻意只活在前端(sessionStorage),不進後端 session:
 * 後端那份 session_schedule 記的是「使用者實際敲定的課表」,兩者語意不同 ——
 * 志願序是選課系統要填的**申請順序**,可以包含最後沒選上的課,也可以不含課表裡
 * 已經確定的課。混在一起會讓 agent 的「我的課表」變得語意不明。
 * 與 useSession 一樣用 sessionStorage:分頁關掉就消失,與後端 in-memory 的取捨一致。
 */
const POOL_KEY = "course-preference-pool";
const ORDER_KEY = "course-preference-order";

/** 志願序卡片用的課程資料(課表與聊天候選課的最小公分母)。 */
export interface PreferenceCourse {
  course_id: string;
  name: string;
  time: string;
  teacher: string;
  /** 課表來源是 number、聊天候選來源是 string,一律轉成字串只做顯示 */
  credits: string;
}

/** 志願序的一列:課程 + 要填進選課系統的那個數字。 */
export interface PreferenceEntry extends PreferenceCourse {
  order: number;
}

/** 選課系統的志願序上限。 */
export const MAX_ORDER = 100;

/**
 * 把「第幾張卡」換算成要填的志願序數字。
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

function load<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // 存壞了(手動改過、舊版格式)就當作沒有,不要讓整個面板掛掉
    return fallback;
  }
}

// 使用者從聊天候選課裡挑進來的「想排志願序的課」。
// 課表裡的課會自動納入,不需要挑,所以這裡只存聊天來的。
const pool = ref<PreferenceCourse[]>(load(POOL_KEY, []));
// 滑完卡之後的志願序,存 course_id 保序;課程細節每次從 deck 現查,
// 避免課名/時間在 sessionStorage 裡放到過期。
const order = ref<string[]>(load(ORDER_KEY, []));

watch(pool, (v) => sessionStorage.setItem(POOL_KEY, JSON.stringify(v)), { deep: true });
watch(order, (v) => sessionStorage.setItem(ORDER_KEY, JSON.stringify(v)), { deep: true });

function fromSchedule(c: ScheduleCourse): PreferenceCourse {
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

  /**
   * 要滑的牌堆:課表裡的課 + 使用者從聊天挑進來的課,依 course_id 去重。
   * 課表優先 —— 同一門課兩邊都有時,以課表那份的資料為準(它一定是後端剛撈的)。
   */
  const deck = computed<PreferenceCourse[]>(() => {
    const seen = new Set<string>();
    const out: PreferenceCourse[] = [];
    for (const c of scheduled.value.map(fromSchedule)) {
      if (seen.has(c.course_id)) continue;
      seen.add(c.course_id);
      out.push(c);
    }
    for (const c of pool.value) {
      if (seen.has(c.course_id)) continue;
      seen.add(c.course_id);
      out.push(c);
    }
    return out;
  });

  const inPool = (courseId: string) =>
    pool.value.some((c) => c.course_id === courseId);

  /** 把聊天候選課丟進志願序牌堆(重複加入無副作用)。 */
  const addToPool = (course: PreferenceCourse) => {
    if (inPool(course.course_id)) return;
    pool.value = [...pool.value, course];
  };

  const removeFromPool = (courseId: string) => {
    pool.value = pool.value.filter((c) => c.course_id !== courseId);
    order.value = order.value.filter((id) => id !== courseId);
  };

  const togglePool = (course: PreferenceCourse) => {
    if (inPool(course.course_id)) removeFromPool(course.course_id);
    else addToPool(course);
  };

  /**
   * 已排定的志願序(帶編號)。
   *
   * 以 order 為順序、deck 為資料來源:牌堆裡消失的課(例如課表移除了)會自動掉出去,
   * 不會留下一筆連課名都查不到的孤兒。
   */
  const entries = computed<PreferenceEntry[]>(() => {
    const byId = new Map(deck.value.map((c) => [c.course_id, c]));
    const alive = order.value.filter((id) => byId.has(id));
    return alive.map((id, i) => ({
      ...(byId.get(id) as PreferenceCourse),
      order: orderNumber(i, alive.length),
    }));
  });

  /** 還沒被滑過的課(牌堆扣掉已收進志願序的、以及本輪略過的)。 */
  const remaining = (skipped: string[]) =>
    deck.value.filter(
      (c) => !order.value.includes(c.course_id) && !skipped.includes(c.course_id)
    );

  /** 右滑:收進志願序(接在最後)。 */
  const keep = (courseId: string) => {
    if (order.value.includes(courseId)) return;
    order.value = [...order.value, courseId];
  };

  /** 把某一列往前 / 往後挪一格,用來微調滑完之後的順序。 */
  const move = (courseId: string, delta: number) => {
    const list = [...order.value];
    const from = list.indexOf(courseId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    order.value = list;
  };

  const drop = (courseId: string) => {
    order.value = order.value.filter((id) => id !== courseId);
  };

  const clearOrder = () => {
    order.value = [];
  };

  /** 開新對話時一併清掉:牌堆與課表都換了,舊志願序沒有意義。 */
  const resetLocal = () => {
    pool.value = [];
    order.value = [];
  };

  /** 複製到選課系統用的純文字(一行一門:志願序 課名 時間 課號)。 */
  const asText = () =>
    entries.value
      .map((e) => `${e.order}\t${e.name}\t${e.time || "時間未定"}\t${e.course_id}`)
      .join("\n");

  return {
    deck,
    pool,
    entries,
    inPool,
    addToPool,
    removeFromPool,
    togglePool,
    remaining,
    keep,
    move,
    drop,
    clearOrder,
    resetLocal,
    asText,
  };
}
