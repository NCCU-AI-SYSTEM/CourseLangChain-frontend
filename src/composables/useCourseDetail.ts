import axios from "axios";
import { ref } from "vue";

/** GET /api/courses/{course_id} 的回傳。沒有資料的欄位一律是 null。 */
export interface CourseCard {
  course_id: string;
  name: string | null;
  name_en: string | null;
  teacher: string | null;
  time: string | null;
  classroom: string | null;
  unit: string | null;
  credits: number | string | null;
  language: string | null;
  objective: string | null;
  syllabus: string | null;
  schedule: string | null;
  evaluation: string | null;
  textbook: string | null;
  teaching_approach: string | null;
  ai_policy: string | null;
  info: string | null;
  note: string | null;
  syllabus_url: string | null;
  teacher_url: string | null;
}

// 模組級共享狀態:聊天卡片、課表面板、志願序清單點課名,打開的都是同一張卡片。
const openId = ref(""); // 空字串 = 卡片關閉
const card = ref<CourseCard | null>(null);
const loading = ref(false);
const error = ref("");
const cache = new Map<string, CourseCard>();

const load = async (id: string) => {
  error.value = "";
  const hit = cache.get(id);
  if (hit) {
    card.value = hit;
    loading.value = false;
    return;
  }
  card.value = null;
  loading.value = true;
  try {
    const res = await axios.get<CourseCard>(`/api/courses/${encodeURIComponent(id)}`);
    cache.set(id, res.data);
    // 使用者可能在等待期間改開了另一門課;只有還開著同一門時才顯示,舊的回應直接丟掉
    if (openId.value === id) card.value = res.data;
  } catch (e: any) {
    if (openId.value === id) {
      error.value = e?.response?.data?.detail ?? "讀取課程資料失敗,請稍後再試。";
    }
  } finally {
    if (openId.value === id) loading.value = false;
  }
};

export function useCourseDetail() {
  const open = (courseId: string) => {
    openId.value = courseId;
    load(courseId);
  };
  const close = () => {
    openId.value = "";
  };
  const retry = () => {
    if (openId.value) load(openId.value);
  };
  return { openId, card, loading, error, open, close, retry };
}
