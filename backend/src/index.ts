import { Hono } from 'hono'
import { handleRegistration } from './handlers/registration'
import { handleHealthCheck, handleAdminLogs } from './handlers/admin'
import { Env } from './types'

const app = new Hono<Env>()

// CORS ヘッダー設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Preflight リクエスト処理
app.options('*', (c) => {
  return c.text(null, 204, corsHeaders)
})

// ルーティング
app.post('/api/registration/register', async (c) => {
  const response = await handleRegistration(c.req.raw, c.env)
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...corsHeaders,
    },
  })
})

app.get('/api/health', async (c) => {
  const response = await handleHealthCheck(c.req.raw, c.env)
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...corsHeaders,
    },
  })
})

app.get('/admin/logs', async (c) => {
  const response = await handleAdminLogs(c.req.raw, c.env)
  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...corsHeaders,
    },
  })
})

// 404 ハンドラー
app.all('*', (c) => {
  return c.json(
    {
      success: false,
      error: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    404,
    corsHeaders
  )
})

export default app
