<template>
  <div class="app">
    <header class="header">
      <h1>QRコード受付システム</h1>
      <p class="subtitle">Connpass イベント参加者登録</p>
    </header>

    <main class="content">
      <div v-if="!result && !isLoading && !error" class="scanner-container">
        <QRScanner
          :api-key="config.apiKey"
          :base-url="config.baseUrl"
          :event-url="config.eventUrl"
          @qr-code-detected="handleQrCodeDetected"
          @error="handleCloseError"
        />
        <p class="instructions">
          カメラで QRコードをスキャンしてください
        </p>
      </div>

      <ResultDisplay
        v-if="result && result.success"
        :success="true"
        :message="result.message"
        :participant="result.data?.participant"
        @reset="handleReset"
      />

      <ErrorMessage
        v-if="error"
        :code="error.code"
        :message="error.message"
        :show="!!error"
        @retry="handleRetry"
        @close="handleCloseError"
      />

      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>登録処理中...</p>
      </div>
    </main>

    <footer class="footer">
      <p>© 2026 GDG Event Reception System</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #f5f5f5;
}

.header {
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  text-align: center;
}

.header h1 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
}

.subtitle {
  margin: 0;
  font-size: 1rem;
  opacity: 0.9;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  position: relative;
}

.scanner-container {
  text-align: center;
}

.instructions {
  margin-top: 15px;
  color: #666;
  font-size: 0.95rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 1000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.footer {
  padding: 15px;
  text-align: center;
  color: #666;
  font-size: 0.85rem;
  background-color: #fff;
  border-top: 1px solid #ddd;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .header h1 {
    font-size: 1.5rem;
  }
  
  .content {
    padding: 10px;
  }
}
</style>
