<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

// Props
interface Props {
  success: boolean;
  message?: string;
  participant?: {
    username: string;
    eventUrl: string;
    registeredAt: string;
  };
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  (e: 'reset'): void;
}>();

// State
const visible = ref(false);
let resetTimer: number | null = null;

watch(
  () => props.success,
  (newVal) => {
    if (newVal) {
      showSuccess();
    }
  }
);

function showSuccess() {
  visible.value = true;
  
  // 3 秒後にリセット
  resetTimer = setTimeout(() => {
    visible.value = false;
    emit('reset');
  }, 3000);
}

onUnmounted(() => {
  if (resetTimer) {
    clearTimeout(resetTimer);
  }
});
</script>

<template>
  <div v-if="visible" class="result-display success">
    <div class="icon">✓</div>
    <div class="message">
      <h3>登録完了!</h3>
      <p v-if="participant">
        {{ participant.username }} さんの参加登録が完了しました。
      </p>
      <p v-else>{{ message || '参加登録が完了しました。' }}</p>
    </div>
  </div>
</template>

<style scoped>
.result-display {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px 40px;
  border-radius: 10px;
  color: white;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
}

.result-display.success {
  background-color: #28a745;
}

.result-display.error {
  background-color: #dc3545;
}

.result-display.loading {
  background-color: #007bff;
}

.icon {
  font-size: 3rem;
  margin-bottom: 10px;
}

.message {
  margin-top: 10px;
}

h3 {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
}

p {
  margin: 0;
  font-size: 1rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
