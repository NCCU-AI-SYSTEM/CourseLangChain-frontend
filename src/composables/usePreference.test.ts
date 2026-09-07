/**
 * 志願序編號規則測試(純函數,不需要瀏覽器)。
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

const { MAX_ORDER, orderNumber } = await import("./usePreference");

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
  check(
    s.every((v) => Number.isInteger(v)),
    `${n} 門:編號都是整數`
  );
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

console.log(`\n結果:${pass} passed, ${fail} failed`);
// 用 throw 而非 process.exit:一樣會讓退出碼非零,又不必為了型別引入 @types/node
// (這支會被 vue-tsc 一起檢查)
if (fail) throw new Error(`${fail} 項未通過`);

// 這支檔案只有動態 import,沒有靜態 import/export ——
// 沒有這行的話 TS 不把它當模組,頂層 await 會被判成錯誤(TS1375)。
export {};
