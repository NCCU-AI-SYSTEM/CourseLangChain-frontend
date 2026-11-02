/**
 * 課程卡片文字處理的測試(純邏輯,不需要瀏覽器)。
 *
 * 跑法(與其他 *.test.ts 同一套):
 *   npx tsx src/utils/courseText.test.ts
 */
import { creditsText, paragraphs, SECTIONS, subjectCode } from "./courseText";

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
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("[段落切分]");
check(same(paragraphs("第一週 導論|第二週 迴歸| "), ["第一週 導論", "第二週 迴歸"]),
  "依「|」切開並去掉空白段落");
check(same(paragraphs("期中 40%\n期末 60%"), ["期中 40%", "期末 60%"]), "換行也會切開");
check(same(paragraphs(null), []) && same(paragraphs(""), []), "沒有內容回空陣列");

console.log("[科目代號與學分]");
check(subjectCode("1151044M01001") === "044M01001", "13 碼取後 9 碼(可含字母)");
check(subjectCode("044M01001") === "044M01001", "不是 13 碼就原樣回傳");
check(creditsText(3.0) === "3 學分" && creditsText("2") === "2 學分", "3.0 顯示成 3 學分");
check(creditsText(null) === "" && creditsText("") === "", "沒有學分資料回空字串");

console.log("[段落設定]");
check(new Set(SECTIONS.map((s) => s.key)).size === SECTIONS.length, "段落 key 不重複");

console.log(`\n結果:${pass} passed, ${fail} failed`);
if (fail) throw new Error(`${fail} 項測試失敗`);
