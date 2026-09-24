<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { ERROR_MESSAGES, getErrorMessage, getErrorAction } from '../constants/errorMessages';

// Props
interface Props {
  code?: string;
  message?: string;
  show: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'close'): void;
}>();

// State
const visible = ref(false);
let closeTimer: number | null = null;

// Computed
const displayMessage = ref('');
const displayAction = ref('');

function updateDisplay() {
  if (props.code && ERROR_MESSAGES[props.code]) {
    displayMessage.value = getErrorMessage(props.code);
    displayAction.value = getErrorAction(props.code) || 'もう一度お試しください。';
  } else {
    displayMessage.value = props.message || 'エラーが発生しました。';
    displayAction.value = 'もう一度お試しください。';
  }
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      updateDisplay();
      visible.value = true;
      
      // 5 秒後に自動クローズ
      closeTimer = setTimeout(() => {
        visible.value = false;
        emit('close');
      }, 5000);
    }
  }
);

function handleRetry() {
  emit('retry');
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      visible.value = false;
      emit('close');
    }, 5000);
  }
}

function handleClose() {
  visible.value = false;
  emit('close');
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
}

onUnmounted(() => {
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
});
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="error-message">
      <div class="content">
        <div class="icon">✗</div>
        <div class="text">
          <h3>エラーが発生しました</h3>
          <p>{{ displayMessage }}</p>
          <p v-if="displayAction" class="action">推奨アクション: {{ displayAction }}</p>
        </div>
      </div>
      <div class="actions">
        <button @click="handleRetry" class="btn retry">リトライ</button>
        <button @click="handleClose" class="btn close">閉じる</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.error-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 500px;
  padding: 20px;
  background-color: #dc3545;
  color: white;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

.content {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 15px;
}

.icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.text {
  flex: 1;
}

h3 {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
}

p {
  margin: 5px 0;
  font-size: 0.95rem;
}

.action {
  font-weight: 600;
  color: #ffd700;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn.retry {
  background-color: #fff;
  color: #dc3545;
}

.btn.retry:hover {
  background-color: #f0f0f0;
}

.btn.close {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn.close:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

/* Animation */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
