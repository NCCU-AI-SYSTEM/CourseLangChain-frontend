import { ref } from "vue";

// 模組級共享:導覽列的「使用說明」與首頁的「完整說明」連結開的是同一個視窗
const isOpen = ref(false);

export function useHelpGuide() {
  return {
    isOpen,
    open: () => (isOpen.value = true),
    close: () => (isOpen.value = false),
  };
}
