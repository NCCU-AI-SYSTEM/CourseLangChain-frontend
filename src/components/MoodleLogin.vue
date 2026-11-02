<template>
  <!-- 後端沒啟用 Moodle 就完全不顯示:不給使用者一個按了只會失敗的按鈕 -->
  <template v-if="status.enabled">
    <button class="btn btn-sm btn-ghost gap-1" @click="open" title="連結 Moodle 查作業與成績">
      <Icon icon="mingcute:book-5-line" class="h-5 w-5" />
      <span class="hidden sm:inline">
        {{ status.connected ? "Moodle 已連結" : "連結 Moodle" }}
      </span>
      <span v-if="status.connected" class="badge badge-success badge-xs"></span>
    </button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-md text-left flex flex-col gap-3">
        <h3 class="text-lg font-bold">連結 Moodle</h3>

        <template v-if="!status.connected">
          <p class="text-sm opacity-80 leading-relaxed">
            用你的 <span class="font-mono">iNCCU</span> 帳號(學號 + 入口網站密碼)連結,
            就能問「我這週有哪些作業還沒交」「這門課我拿幾分」。
          </p>

          <form class="flex flex-col gap-2" @submit.prevent="submit">
            <input
              v-model="username"
              class="input input-bordered input-sm"
              placeholder="學號"
              autocomplete="username"
              :disabled="busy"
            />
            <input
              v-model="password"
              type="password"
              class="input input-bordered input-sm"
              placeholder="iNCCU 密碼"
              autocomplete="current-password"
              :disabled="busy"
            />
            <button
              class="btn btn-sm btn-primary"
              type="submit"
              :disabled="busy || !username || !password"
            >
              <span v-if="busy" class="loading loading-spinner loading-xs"></span>
              連結
            </button>
          </form>

          <p class="text-xs text-warning leading-relaxed">
            <Icon icon="mingcute:alert-line" class="h-3 w-3 inline align-text-bottom" />
            密碼連續打錯 5 次,學校會鎖住帳號 15 分鐘。這裡錯 3 次就會先擋下來。
          </p>
        </template>

        <template v-else>
          <p class="text-sm">
            已連結:<span class="font-mono">{{ status.username }}</span>
          </p>
          <p v-if="status.message" class="text-sm opacity-80">{{ status.message }}</p>
          <button class="btn btn-ghost btn-sm w-fit" @click="logout()">
            <Icon icon="mingcute:exit-line" class="h-4 w-4" />
            中斷連結
          </button>
        </template>

        <p v-if="error" class="text-sm text-error">{{ error }}</p>

        <!-- 隱私聲明:連結前後都顯示 -->
        <p class="text-xs opacity-60 leading-relaxed border-t border-base-300 pt-2">
          <Icon icon="mingcute:lock-line" class="h-3 w-3 inline align-text-bottom" />
          密碼<span class="font-medium">不會存在這台瀏覽器</span>,也不會寫進資料庫或 log。
          它只留在這段對話的後端記憶體裡,用來替你登入 Moodle 查資料;按「中斷連結」、
          開新對話或後端重啟就消失。助理本身看不到你的密碼,也不該要求你在對話裡輸入密碼。
        </p>

        <div class="modal-action">
          <button class="btn btn-sm" @click="close">關閉</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useMoodle } from "../composables/useMoodle";

const { status, busy, error, refresh, login, logout } = useMoodle();

const dialog = ref<HTMLDialogElement | null>(null);
const username = ref("");
const password = ref("");

const open = () => dialog.value?.showModal();
const close = () => dialog.value?.close();

const submit = async () => {
  const ok = await login(username.value.trim(), password.value);
  // 不論成敗都立刻清掉密碼,不留在記憶體與 DOM 裡
  password.value = "";
  if (ok) username.value = "";
};

onMounted(refresh);
</script>
