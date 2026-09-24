<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps<{
  apiKey: string;
  baseUrl: string;
  eventUrl: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'qr-code-detected', qrCodeData: string): void;
  (e: 'error', message: string): void;
}>();

// Refs
const videoElement = ref<HTMLVideoElement | null>(null);
const result = ref<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
const animationId = ref<number | null>(null);
const stream = ref<MediaStream | null>(null);

// QRコード検出処理
async function startScanning() {
  if (!videoElement.value) return;

  const video = videoElement.value;
  
  try {
    const streamInstance = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    stream.value = streamInstance;
    video.srcObject = streamInstance;
    
    startScanningLoop(video);
  } catch (error) {
    console.error('Camera access error:', error);
    emit('error', 'カメラにアクセスできません。ブラウザの設定を確認してください。');
  }
}

function startScanningLoop(video: HTMLVideoElement) {
  if (!videoElement.value || !video) return;

  const videoEl = videoElement.value;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  function scan() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // ここで jsQR を使用
      // (jsQR のインポートは QRScanner の使用側で行う)
      
      animationId.value = requestAnimationFrame(scan);
    }
  }

  scan();
}

onMounted(() => {
  startScanning();
});

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value);
  }
  
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
});
</script>

<template>
  <div class="qr-scanner">
    <video ref="videoElement" autoplay playsinline muted></video>
    
    <div v-if="result" class="result" :class="result.type">
      <p>{{ result.message }}</p>
    </div>
  </div>
</template>

<style scoped>
.qr-scanner {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

video {
  width: 100%;
  height: auto;
  border: 2px solid #ccc;
  border-radius: 8px;
}

.result {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  text-align: center;
}

.result.success {
  background-color: #28a745;
}

.result.error {
  background-color: #dc3545;
}

.result.loading {
  background-color: #007bff;
}
</style>
