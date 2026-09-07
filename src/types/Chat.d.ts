interface ChatMessage {
  input: string
  output: string;
  time: Date;
}

/**
 * 後端 SSE 側通道送來的候選課程(payload: { type: "courses", courses: [...] })。
 *
 * course_id 直接取自 query_courses_tool 的輸出、不經 LLM 轉述,所以可以安心
 * 拿去打 /api/schedule;credits 是原樣帶回的字串("3"、"3.0"),只用於顯示。
 */
interface CourseCandidate {
  course_id: string;
  name: string;
  time: string;
  teacher: string;
  credits: string;
}

/**
 * 後端 SSE 側通道送來的排課方案(payload: { type: "plans", plans: [...] })。
 *
 * index 與回覆文字裡的「方案 N」是同一個編號 —— 後端由同一份 ranked 產出兩種表示
 * (tools/scheduler.py 的 format_schedules_markdown 與 plans_to_dicts 成對),
 * 所以使用者讀到的方案 2 和按鈕套用的必定是同一組。
 *
 * credits 是數字(不同於 CourseCandidate 的字串)—— 這裡的來源是 CourseSlot.credits,
 * 已經是 float,不是資料庫原樣帶回的文字。
 */
interface PlanCourse {
  course_id: string;
  name: string;
  time: string;
  teacher: string;
  credits: number;
}

interface SchedulePlan {
  index: number;
  total_credits: number;
  /** 這份方案用到的星期,如 "一三五";全部時間未定時是空字串 */
  days: string;
  courses: PlanCourse[];
}