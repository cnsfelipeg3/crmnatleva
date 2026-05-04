// Message Watchdog
// Marks messages as 'failed' (failure_reason='silent_timeout') when stuck >10min
// without delivery confirmation. Invoked every 5min by pg_cron.
// Protected by X-Watchdog-Token shared secret (timing-safe compare).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-watchdog-token',
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const expected = Deno.env.get('WATCHDOG_SHARED_SECRET') ?? ''
  const provided = req.headers.get('X-Watchdog-Token') ?? ''
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const startedAt = new Date().toISOString()
  let convCount = 0
  let msgCount = 0
  let convMediaCount = 0
  let msgMediaCount = 0
  let errorMsg: string | null = null

  try {
    const { data: c, error: ce } = await supabase.rpc('watchdog_mark_silent_timeouts', {
      p_table: 'conversation_messages',
    })
    if (ce) throw new Error(`conversation_messages: ${ce.message}`)
    convCount = (c as number) ?? 0

    const { data: m, error: me } = await supabase.rpc('watchdog_mark_silent_timeouts', {
      p_table: 'messages',
    })
    if (me) throw new Error(`messages: ${me.message}`)
    msgCount = (m as number) ?? 0

    const { data: cm, error: cme } = await supabase.rpc('watchdog_mark_stuck_media', {
      p_table: 'conversation_messages',
    })
    if (cme) throw new Error(`media conversation_messages: ${cme.message}`)
    convMediaCount = (cm as number) ?? 0

    const { data: mm, error: mme } = await supabase.rpc('watchdog_mark_stuck_media', {
      p_table: 'messages',
    })
    if (mme) throw new Error(`media messages: ${mme.message}`)
    msgMediaCount = (mm as number) ?? 0
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e)
  }

  await supabase.from('watchdog_runs').insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    marked_count_conversation_messages: convCount,
    marked_count_messages: msgCount,
    marked_media_conversation_messages: convMediaCount,
    marked_media_messages: msgMediaCount,
    error: errorMsg,
  })

  return new Response(
    JSON.stringify({
      ok: !errorMsg,
      marked_count_conversation_messages: convCount,
      marked_count_messages: msgCount,
      marked_media_conversation_messages: convMediaCount,
      marked_media_messages: msgMediaCount,
      error: errorMsg,
    }),
    {
      status: errorMsg ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
