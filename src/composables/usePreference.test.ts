/**
 * 志願序清單測試(純邏輯,不需要瀏覽器)。
 *
 * 跑法(專案沒有測試框架,與 useTimetableLayout.test.ts 同一套):
 *   npx tsx src/composables/usePreference.test.ts
 */

/*
 * usePreference → useSchedule → useSession 這條 import 鏈在模組載入時就會讀
 * sessionStorage,Node 裡沒有這個東西。先補一個最小替身,再用動態 import 載入被測
 * 模組(靜態 import 會被提升到檔案最前面,補得再早也來不及)。
 */
const store = new Map<string, string>();
(globalThis as any).sessionStorage ??= {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { MAX_ORDER, orderNumber, usePreference, chanceRequests, chanceBadge, reorderByIds } =
  await import("./usePreference");

let pass = 0;
let fail = 0;

function check(cond: boolean, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.log(`  ✗ FAIL: ${msg}`);
  }
}

/** n 門課的完整編號序列。 */
const seq = (n: number) =>
  Array.from({ length: n }, (_, i) => orderNumber(i, n));

console.log("[orderNumber 均分 1~100]");
check(
  JSON.stringify(seq(3)) === JSON.stringify([33, 66, 99]),
  `3 門 → 33/66/99(實際 ${seq(3)})`
);
check(
  JSON.stringify(seq(5)) === JSON.stringify([20, 40, 60, 80, 100]),
  `5 門 → 20/40/60/80/100(實際 ${seq(5)})`
);
check(JSON.stringify(seq(1)) === JSON.stringify([100]), "1 門 → 100");

console.log("[不變條件]");
for (const n of [1, 2, 3, 4, 7, 9, 12, 30, 99, 100, 137]) {
  const s = seq(n);
  check(s.length === n, `${n} 門:編號數量正確`);
  check(
    s.every((v) => v >= 1 && v <= MAX_ORDER),
    `${n} 門:全部落在 1~${MAX_ORDER}(最大 ${Math.max(...s)})`
  );
  check(
    s.every((v, i) => i === 0 || v >= s[i - 1]),
    `${n} 門:編號不遞減`
  );
  check(s.every((v) => Number.isInteger(v)), `${n} 門:編號都是整數`);
  // 100 門以內每個編號都該是唯一的;超過 100 門必然要並列,這是選課系統的硬上限
  if (n <= MAX_ORDER) {
    check(new Set(s).size === n, `${n} 門:編號兩兩不同`);
  }
}

console.log("[間距 = floor(100/n)]");
for (const n of [3, 6, 7, 13]) {
  const step = Math.floor(MAX_ORDER / n);
  const s = seq(n);
  check(
    s.every((v, i) => i === 0 || v - s[i - 1] === step),
    `${n} 門:每一個都是上一個 + ${step}`
  );
}

// ---------------------------------------------------------------------------
// 清單操作。usePreference 的狀態是模組級共享的,所以每組測試前先 clear()。
// ---------------------------------------------------------------------------
const course = (id: string, name: string) => ({
  course_id: id,
  name,
  time: "一234",
  teacher: "王老師",
  credits: "3",
});

const A = course("1151000000001", "甲課");
const B = course("1151000000002", "乙課");
const C = course("1151000000003", "丙課");

const { entries, has, add, addMany, remove, toggle, move, clear } = usePreference();
const ids = () => entries.value.map((e) => e.course_id);
const orders = () => entries.value.map((e) => e.order);

console.log("[加入 / 移除]");
clear();
check(entries.value.length === 0, "clear 後是空的");
add(A);
add(B);
check(JSON.stringify(ids()) === JSON.stringify([A.course_id, B.course_id]), "依加入順序保序");
add(A);
check(entries.value.length === 2, "重複加入同一門不會變兩筆");
check(has(A.course_id) && !has(C.course_id), "has 判斷正確");
remove(A.course_id);
check(JSON.stringify(ids()) === JSON.stringify([B.course_id]), "移除指定的那門");
remove("不存在的id");
check(entries.value.length === 1, "移除不存在的 id 沒有副作用");

console.log("[toggle]");
clear();
toggle(A);
check(has(A.course_id), "toggle 未在清單 → 加入");
toggle(A);
check(!has(A.course_id), "toggle 已在清單 → 移除");

console.log("[addMany]");
clear();
add(A);
const added = addMany([A, B, C, B]);
check(added === 2, `已在清單的與重複的都跳過(實際加入 ${added} 門)`);
check(
  JSON.stringify(ids()) === JSON.stringify([A.course_id, B.course_id, C.course_id]),
  "接在既有清單後面且不重複"
);

console.log("[排序與編號重算]");
clear();
addMany([A, B, C]);
check(JSON.stringify(orders()) === JSON.stringify([33, 66, 99]), "3 門的編號是 33/66/99");
move(C.course_id, -1);
check(
  JSON.stringify(ids()) === JSON.stringify([A.course_id, C.course_id, B.course_id]),
  "往前挪一格"
);
check(JSON.stringify(orders()) === JSON.stringify([33, 66, 99]), "挪動後編號跟著換到新位置");
move(A.course_id, -1);
check(ids()[0] === A.course_id, "已在第一列再往前 → 不動");
move(B.course_id, 1);
check(ids()[2] === B.course_id, "已在最後一列再往後 → 不動");
remove(C.course_id);
check(JSON.stringify(orders()) === JSON.stringify([50, 100]), "刪一門後編號從 33/66/99 重算成 50/100");
clear();

console.log("[選上機率:看第幾列,不看 33/66/99]");
const timed = (id: string, time: string) => ({ course_id: id, name: id, time, teacher: "", credits: "1" });
const reqs = chanceRequests([timed("X", "五34"), timed("Y", "二12"), timed("Z", "")]);
check(JSON.stringify(reqs.map((r) => r.rank)) === "[1,2,3]", "rank 是清單名次 1、2、3(選課系統會重新編號)");
check(reqs[0].course_id === "X" && reqs[0].time === "五34", "帶課號與時段(班次以這兩個識別)");

const ok = { course_id: "X", rank: 2, available: true, probability: 0.754, label: "很有機會", terms: 4, full_terms: 4, validated: true };
const b = chanceBadge(ok, 2);
check(b?.text === "約 75%" && b.tone === "success", "75% 顯示成「約 75%」、綠色");
check(b?.title.includes("4 個學期") ?? false, "滑鼠提示說明依據");
check(chanceBadge({ ...ok, probability: 0.43 }, 2)?.tone === "warning", "0.4~0.7 黃色");
check(chanceBadge({ ...ok, probability: 0.1 }, 2)?.tone === "error", "0.4 以下紅色");
check(chanceBadge(ok, 3) === null, "查到的名次和現在的名次不同(剛調整順序)→ 先不顯示");
check(chanceBadge(undefined, 1) === null, "還沒查到 → 不顯示");
const none = chanceBadge({ course_id: "M", rank: 1, available: false }, 1);
check(none?.text === "無官方資料" && none.tone === "ghost", "必修等沒有官方資料的課:不給數字");
check(chanceBadge({ ...ok, rank: 12, validated: false }, 12)?.title.includes("沒有經過驗證") ?? false,
  "第 10 志願以後註明未驗證");

console.log("[套用建議排序]");
const abc = [timed("A", ""), timed("B", ""), timed("C", "")];
const ids2 = (xs: { course_id: string }[]) => xs.map((x) => x.course_id).join("");
check(ids2(reorderByIds(abc, ["C", "A", "B"])) === "CAB", "依建議的課號順序重排");
check(ids2(reorderByIds(abc, ["C", "A"])) === "CAB", "建議裡沒有的課(查詢期間新加的)接在最後,不會弄丟");
check(ids2(reorderByIds(abc, ["X", "B", "A", "C"])) === "BAC", "清單裡已經沒有的課號略過");

console.log(`\n結果:${pass} passed, ${fail} failed`);
// 用 throw 而非 process.exit:一樣會讓退出碼非零,又不必為了型別引入 @types/node
// (這支會被 vue-tsc 一起檢查)
if (fail) throw new Error(`${fail} 項未通過`);

// 這支檔案只有動態 import,沒有靜態 import/export ——
// 沒有這行的話 TS 不把它當模組,頂層 await 會被判成錯誤(TS1375)。
export {};
