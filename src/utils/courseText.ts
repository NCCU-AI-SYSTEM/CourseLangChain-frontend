/**
 * 課程卡片的文字處理(純函數,可在 Node 裡測)。
 */

/** 卡片上的大綱段落,順序就是顯示順序。標籤與後端分塊(chunk.py)的欄位名一致。 */
export const SECTIONS = [
  { key: "objective", label: "課程目標", icon: "mingcute:target-line", open: true },
  { key: "syllabus", label: "課程簡介", icon: "mingcute:document-line", open: true },
  { key: "evaluation", label: "評量方式", icon: "mingcute:chart-bar-line", open: true },
  { key: "schedule", label: "每週進度", icon: "mingcute:calendar-2-line", open: false },
  { key: "textbook", label: "指定書目", icon: "mingcute:book-6-line", open: false },
  { key: "teaching_approach", label: "教學方式", icon: "mingcute:presentation-1-line", open: false },
  { key: "ai_policy", label: "AI 使用規範", icon: "mingcute:ai-line", open: false },
  { key: "info", label: "異動資訊", icon: "mingcute:notification-line", open: false },
  { key: "note", label: "備註", icon: "mingcute:information-line", open: false },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

/**
 * 把一段大綱拆成段落。
 *
 * 爬蟲把同一欄的多個小節用「|」接在一起(換行反而很少見),直接顯示會變成一整坨。
 * 這裡依「|」與換行切開,去掉空白段落。
 */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\||\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 13 碼課號的後 9 碼:全校課程查詢與選課系統上看到的科目代號。 */
export function subjectCode(courseId: string): string {
  return courseId.length === 13 ? courseId.slice(4) : courseId;
}

/** 學分顯示:3.0 → "3 學分";沒有資料 → ""。 */
export function creditsText(credits: number | string | null | undefined): string {
  if (credits === null || credits === undefined || credits === "") return "";
  const n = Number(credits);
  return Number.isFinite(n) ? `${n} 學分` : `${credits} 學分`;
}
