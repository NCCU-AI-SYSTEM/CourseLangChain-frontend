import axios from "axios";
import { ref } from "vue";
import { useSession } from "./useSession";

/**
 * Moodle 連結狀態(要問作業、成績、公告才需要)。
 *
 * 隱私:密碼**不存在瀏覽器**(不進 localStorage / sessionStorage),只在送出的那一刻
 * 存在記憶體裡;送到後端後也只留在這段 session 的記憶體,按「中斷連結」、開新對話
 * 或後端重啟就消失。後端回的狀態不含密碼,學號只露後 3 碼。
 *
 * `enabled` 是後端有沒有設定 Moodle 服務(MOODLE_MCP_URL)。false 時前端不顯示入口 ——
 * 不要給使用者一個按了只會失敗的按鈕。
 */
export interface MoodleStatus {
  enabled: boolean;
  connected: boolean;
  username?: string;
  message?: string;
}

const status = ref<MoodleStatus>({ enabled: false, connected: false });
const busy = ref(false);
const error = ref("");

export function useMoodle() {
  const { sessionId } = useSession();

  const refresh = async () => {
    try {
      const res = await axios.get("/api/moodle", {
        params: { session_id: sessionId.value },
      });
      status.value = res.data;
    } catch {
      status.value = { enabled: false, connected: false };
    }
  };

  /** 連結。後端會先實際登入一次,成功才留下帳密。 */
  const login = async (username: string, password: string) => {
    busy.value = true;
    error.value = "";
    try {
      const res = await axios.post("/api/moodle", {
        session_id: sessionId.value,
        username,
        password,
      });
      status.value = res.data;
      return true;
    } catch (err: any) {
      error.value = err?.response?.data?.detail ?? "連結失敗,請稍後再試";
      return false;
    } finally {
      busy.value = false;
    }
  };

  /**
   * 中斷連結。`session` 可指定「別的」session —— 開新對話時要清掉**上一段**的帳密,
   * 那時 sessionId 已經換掉了,後端的舊帳密會留到程序重啟才消失。
   */
  const logout = async (session?: string) => {
    const target = session ?? sessionId.value;
    // **要在 await 之前**判斷這是不是「目前這段對話」:開新對話會在這個 Promise 還沒
    // 回來之前就換掉 sessionId,等回來再比就永遠不相等,畫面會卡在「已連結」。
    const isCurrent = target === sessionId.value;
    try {
      await axios.delete("/api/moodle", { params: { session_id: target } });
    } catch {
      // 後端沒連上也要把畫面狀態清掉,不要讓使用者以為還連著
    } finally {
      if (isCurrent) resetLocal();
    }
  };

  const resetLocal = () => {
    status.value = { ...status.value, connected: false, username: undefined };
    error.value = "";
  };

  return { status, busy, error, refresh, login, logout, resetLocal };
}
