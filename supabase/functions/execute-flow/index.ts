import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Z-API Helper ───
async function sendViaZapi(phone: string, action: string, payload: Record<string, unknown>) {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID") || "";
  const token = Deno.env.get("ZAPI_TOKEN") || "";
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
  
  if (!instanceId || !token) {
    console.log("[execute-flow] Z-API credentials not configured, skipping WhatsApp send");
    return null;
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/${action}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": clientToken },
      body: JSON.stringify({ phone, ...payload }),
    });
    const data = await resp.json();
    console.log(`[execute-flow] Z-API ${action} → ${resp.status}`, JSON.stringify(data).slice(0, 200));
    return data;
  } catch (err: any) {
    console.error(`[execute-flow] Z-API ${action} error:`, err.message);
    return null;
  }
}

interface FlowContext {
  conversation_id: string;
  phone: string;
  contact_name: string;
  customer_id?: string;
  last_message: { text: string; type: string; timestamp: string };
  pipeline_stage: string;
  tags: string[];
  assigned_to: string | null;
  variables: Record<string, string>;
}

interface ExecutionStep {
  node_id: string;
  node_type: string;
  label: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  actions_applied: string[];
  timestamp: string;
  duration_ms: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { conversation_id, trigger_type, trigger_data, flow_id } = await req.json();

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build flow context
    const context: FlowContext = {
      conversation_id: conv.id,
      phone: conv.phone,
      contact_name: conv.contact_name,
      customer_id: conv.client_id || undefined,
      last_message: {
        text: trigger_data?.message_text || conv.last_message_preview || "",
        type: trigger_data?.message_type || "text",
        timestamp: new Date().toISOString(),
      },
      pipeline_stage: conv.stage,
      tags: conv.tags || [],
      assigned_to: conv.assigned_to,
      variables: {
        "cliente.nome": conv.contact_name,
        "cliente.telefone": conv.phone,
        "conversa.id": conv.id,
        "mensagem.texto": trigger_data?.message_text || conv.last_message_preview || "",
        "etapa.funil": conv.stage,
      },
    };

    // Find active flow to execute
    let targetFlowId = flow_id;
    if (!targetFlowId) {
      // Find first active flow matching trigger type
      const { data: activeFlows } = await supabase
        .from("flows")
        .select("id")
        .eq("status", "ativo")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!activeFlows?.length) {
        return new Response(JSON.stringify({
          status: "no_active_flow",
          message: "Nenhum fluxo ativo encontrado",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      targetFlowId = activeFlows[0].id;
    }

    // Load flow nodes & edges
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("flow_nodes").select("*").eq("flow_id", targetFlowId),
      supabase.from("flow_edges").select("*").eq("flow_id", targetFlowId),
    ]);

    const nodes = nodesRes.data || [];
    const edges = edgesRes.data || [];

    if (nodes.length === 0) {
      return new Response(JSON.stringify({ status: "empty_flow", message: "Fluxo sem blocos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find trigger node (no incoming edges)
    const targetNodeIds = new Set(edges.map((e: any) => e.target_node_id));
    const triggerNode = nodes.find((n: any) => !targetNodeIds.has(n.node_id)) || nodes[0];

    // Create execution log
    const { data: execLog } = await supabase.from("flow_execution_logs").insert({
      flow_id: targetFlowId,
      conversation_id,
      status: "running",
      is_simulation: false,
      trigger_type: trigger_type || "new_message",
      trigger_data: trigger_data || {},
      variables_snapshot: context.variables,
    }).select().single();

    const logId = execLog?.id;
    const executionSteps: ExecutionStep[] = [];
    const actionsApplied: string[] = [];
    let shouldPause = false;
    let errorMessage: string | null = null;

    // Walk the flow
    const visited = new Set<string>();
    let current: any = triggerNode;

    while (current && !visited.has(current.node_id) && !shouldPause) {
      visited.add(current.node_id);
      const stepStart = Date.now();
      const config = (current.config || {}) as Record<string, any>;
      const stepActions: string[] = [];
      const output: Record<string, unknown> = {};

      try {
        // ─── Execute node by type ───
        switch (true) {
          // TRIGGERS - just pass through
          case current.node_type.startsWith("trigger_"):
            output.triggered = true;
            output.trigger_type = trigger_type;
            break;

          // SEND TEXT
          case current.node_type === "send_text": {
            const msg = interpolate(String(config.message || ""), context.variables);
            if (msg) {
              // Send via Z-API to WhatsApp
              await sendViaZapi(context.phone, "send-text", { message: msg });

              await supabase.from("conversation_messages").insert({
              direction: "outgoing",
                conversation_id,
                sender_type: "sistema",
                message_type: "text",
                content: msg,
                status: "sent",
              });
              await supabase.from("conversations").update({
                last_message_preview: msg,
                last_message_at: new Date().toISOString(),
              }).eq("id", conversation_id);
              
              output.message_sent = msg;
              stepActions.push(`send_message: "${msg.slice(0, 60)}..."`);
            }
            break;
          }

          // SEND TEMPLATE
          case current.node_type === "send_template": {
            output.template_name = config.template_name;
            output.note = "Templates require WhatsApp Cloud API integration";
            stepActions.push(`template: ${config.template_name}`);
            break;
          }

          // SEND MEDIA
          case current.node_type === "send_media": {
            const caption = interpolate(String(config.caption || ""), context.variables);
            const mediaType = config.media_type || "image";
            const mediaUrl = config.media_url || "";

            // Send via Z-API
            if (mediaUrl) {
              if (mediaType === "image") {
                await sendViaZapi(context.phone, "send-image", { image: mediaUrl, caption: caption || undefined });
              } else if (mediaType === "audio") {
                await sendViaZapi(context.phone, "send-audio", { audio: mediaUrl });
              } else if (mediaType === "video") {
                await sendViaZapi(context.phone, "send-video", { video: mediaUrl, caption: caption || undefined });
              } else if (mediaType === "document") {
                await sendViaZapi(context.phone, "send-document", { document: mediaUrl, fileName: config.file_name || "documento" });
              }
            }

            await supabase.from("conversation_messages").insert({
              direction: "outgoing",
              conversation_id,
              sender_type: "sistema",
              message_type: mediaType,
              content: caption || null,
              media_url: mediaUrl || null,
              status: "sent",
            });
            output.media_sent = true;
            stepActions.push(`send_media: ${mediaType}`);
            break;
          }

          // QUESTIONS
          case current.node_type === "question_text":
          case current.node_type === "question_buttons": {
            const question = interpolate(String(config.question || ""), context.variables);
            if (question) {
              // Send via Z-API
              await sendViaZapi(context.phone, "send-text", { message: question });
              await supabase.from("conversation_messages").insert({
              direction: "outgoing",
                conversation_id,
                sender_type: "sistema",
                message_type: "text",
                content: question,
                status: "sent",
              });
              await supabase.from("conversations").update({
                last_message_preview: question,
                last_message_at: new Date().toISOString(),
              }).eq("id", conversation_id);
              output.question_asked = question;
              stepActions.push(`ask: "${question.slice(0, 60)}"`);
            }
            if (config.save_to_variable) {
              context.variables[config.save_to_variable] = context.last_message.text;
              output.saved_variable = { [config.save_to_variable]: context.last_message.text };
            }
            break;
          }

          // CONDITION IF/ELSE
          case current.node_type === "condition_if_else": {
            const condResult = evaluateCondition(config, context);
            output.condition_result = condResult;
            output.condition_type = config.condition_type;
            output.value_checked = config.value;

            // Find edge based on condition result
            const yesEdge = edges.find((e: any) =>
              e.source_node_id === current.node_id && e.source_handle === "yes"
            );
            const noEdge = edges.find((e: any) =>
              e.source_node_id === current.node_id && e.source_handle === "no"
            );

            const nextEdge = condResult ? yesEdge : noEdge;
            if (nextEdge) {
              const nextNode = nodes.find((n: any) => n.node_id === nextEdge.target_node_id);
              
              executionSteps.push({
                node_id: current.node_id,
                node_type: current.node_type,
                label: current.label || current.node_type,
                input: { ...context.variables },
                output,
                actions_applied: stepActions,
                timestamp: new Date().toISOString(),
                duration_ms: Date.now() - stepStart,
              });

              current = nextNode;
              continue; // Skip the normal edge resolution below
            }
            break;
          }

          // ACTION: APPLY TAG
          case current.node_type === "action_apply_tag": {
            const tag = String(config.tag_name || "");
            if (tag) {
              const action = config.action || "apply";
              if (action === "apply") {
                const newTags = [...new Set([...context.tags, tag])];
                await supabase.from("conversations").update({ tags: newTags }).eq("id", conversation_id);
                context.tags = newTags;
                stepActions.push(`tag_applied: ${tag}`);
              } else {
                const newTags = context.tags.filter((t: string) => t !== tag);
                await supabase.from("conversations").update({ tags: newTags }).eq("id", conversation_id);
                context.tags = newTags;
                stepActions.push(`tag_removed: ${tag}`);
              }
              output.tags = context.tags;
            }
            break;
          }

          // ACTION: CHANGE STAGE
          case current.node_type === "action_change_stage": {
            const stage = String(config.target_stage || "");
            if (stage) {
              await supabase.from("conversations").update({ stage }).eq("id", conversation_id);
              context.pipeline_stage = stage;
              context.variables["etapa.funil"] = stage;
              output.stage_changed_to = stage;
              stepActions.push(`stage_changed: ${stage}`);
              
              // Audit log
              await supabase.from("livechat_audit_logs").insert({
                conversation_id,
                action: "stage_change",
                details: { from: conv.stage, to: stage, by: "flow_engine" },
              });
            }
            break;
          }

          // ACTION: ASSIGN
          case current.node_type === "action_assign": {
            output.assign_type = config.assign_type;
            if (config.assign_type === "specific" && config.user_id) {
              await supabase.from("conversations").update({ assigned_to: config.user_id }).eq("id", conversation_id);
              stepActions.push(`assigned_to: ${config.user_id}`);
            } else {
              output.note = "Round-robin/least_busy requires livechat_users configuration";
            }
            break;
          }

          // ACTION: CREATE LEAD
          case current.node_type === "action_create_lead": {
            const name = context.variables[config.name_var] || context.contact_name;
            const phone = context.variables[config.phone_var] || context.phone;
            const { data: newClient } = await supabase.from("clients").insert({
              full_name: name,
              phone,
              lead_source: config.lead_source || "flow_builder",
              status: "lead",
            }).select().single();
            
            if (newClient) {
              await supabase.from("conversations").update({ client_id: newClient.id }).eq("id", conversation_id);
              output.lead_created = { id: newClient.id, name, phone };
              stepActions.push(`lead_created: ${name}`);
            }
            break;
          }

          // ACTION: CREATE TASK
          case current.node_type === "action_create_task": {
            output.task_created = {
              title: config.title,
              description: config.description,
              due_hours: config.due_hours,
            };
            stepActions.push(`task: ${config.title}`);
            break;
          }

          // ACTION: LINK VEHICLE
          case current.node_type === "action_link_vehicle": {
            const vehicleId = context.variables[config.vehicle_var];
            if (vehicleId) {
              output.vehicle_linked = vehicleId;
              stepActions.push(`vehicle_linked: ${vehicleId}`);
            }
            break;
          }

          // AI AGENT
          case current.node_type === "ai_agent": {
            const systemPrompt = interpolate(String(config.system_prompt || "Você é o Lucas, um vendedor de 23 anos da FEBEAL Motors, uma concessionária de veículos premium no Brasil. Responda SEMPRE em português brasileiro, de forma educada, prestativa e profissional. Nunca responda em inglês. Mantenha o tom acolhedor e consultivo. Se não souber algo sobre um veículo, diga que vai verificar com a equipe."), context.variables);
            const userMessage = context.last_message.text;
            
            try {
              const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
              if (lovableApiKey) {
                const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${lovableApiKey}`,
                  },
                  body: JSON.stringify({
                    model: config.model || "google/gemini-2.5-flash",
                    messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: userMessage },
                    ],
                    temperature: Number(config.temperature) || 0.7,
                    max_tokens: 500,
                  }),
                });

                if (aiResp.ok) {
                  const aiData = await aiResp.json();
                  const aiText = aiData.choices?.[0]?.message?.content || "";
                  
                  if (config.save_response_to) {
                    context.variables[config.save_response_to] = aiText;
                  }

                  // Send AI response via Z-API + DB
                  await sendViaZapi(context.phone, "send-text", { message: aiText });
                  await supabase.from("conversation_messages").insert({
              direction: "outgoing",
                    conversation_id,
                    sender_type: "sistema",
                    message_type: "text",
                    content: aiText,
                    status: "sent",
                  });
                  await supabase.from("conversations").update({
                    last_message_preview: aiText.slice(0, 100),
                    last_message_at: new Date().toISOString(),
                  }).eq("id", conversation_id);

                  output.ai_response = aiText;
                  stepActions.push(`ai_response: "${aiText.slice(0, 60)}..."`);
                } else {
                  output.ai_error = `API returned ${aiResp.status}`;
                }
              } else {
                output.ai_error = "LOVABLE_API_KEY not configured";
              }
            } catch (aiErr: any) {
              output.ai_error = aiErr.message;
            }
            break;
          }

          // HANDOFF: PAUSE
          case current.node_type === "handoff_pause": {
            shouldPause = true;
            output.paused = true;
            output.reason = config.reason;
            output.resume_on = config.resume_on;
            stepActions.push("automation_paused");
            
            await supabase.from("messages").insert({
              conversation_id,
              sender_type: "sistema",
              message_type: "text",
              text: `⏸️ Automação pausada: ${config.reason || "Handoff humano"}`,
              status: "sent",
            });
            break;
          }

          // HANDOFF: TRANSFER
          case current.node_type === "handoff_transfer": {
            shouldPause = true;
            const handoffMsg = interpolate(String(config.message || "Transferindo para atendente..."), context.variables);
            await supabase.from("messages").insert({
              conversation_id,
              sender_type: "sistema",
              message_type: "text",
              text: `🔄 ${handoffMsg}`,
              status: "sent",
            });
            output.transferred = true;
            output.transfer_to = config.transfer_to;
            stepActions.push(`handoff: ${config.transfer_to}`);
            break;
          }

          // HANDOFF: NOTIFY
          case current.node_type === "handoff_notify": {
            output.notification_sent = true;
            output.channel = config.notify_channel;
            stepActions.push(`notify: ${config.notify_channel}`);
            break;
          }

          // UTIL: DELAY
          case current.node_type === "util_delay": {
            const delaySec = Math.min(Number(config.delay_seconds) || 1, 10); // max 10s in edge fn
            await new Promise(r => setTimeout(r, delaySec * 1000));
            output.delayed_seconds = delaySec;
            break;
          }

          // UTIL: WEBHOOK
          case current.node_type === "util_webhook": {
            if (config.url) {
              try {
                const webhookBody = config.body_template
                  ? JSON.parse(interpolate(JSON.stringify(config.body_template), context.variables))
                  : context;
                const webhookResp = await fetch(config.url, {
                  method: config.method || "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(config.headers ? JSON.parse(String(config.headers)) : {}),
                  },
                  body: config.method === "GET" ? undefined : JSON.stringify(webhookBody),
                });
                const respText = await webhookResp.text();
                output.webhook_status = webhookResp.status;
                output.webhook_response = respText.slice(0, 500);
                if (config.save_response_to) {
                  context.variables[config.save_response_to] = respText;
                }
                stepActions.push(`webhook: ${config.url} → ${webhookResp.status}`);
              } catch (whErr: any) {
                output.webhook_error = whErr.message;
              }
            }
            break;
          }

          default:
            output.executed = true;
            output.note = `Node type "${current.node_type}" executed (pass-through)`;
        }
      } catch (nodeErr: any) {
        output.error = nodeErr.message;
        errorMessage = `Error at node ${current.node_id} (${current.node_type}): ${nodeErr.message}`;
      }

      actionsApplied.push(...stepActions);
      executionSteps.push({
        node_id: current.node_id,
        node_type: current.node_type,
        label: current.label || current.node_type,
        input: { ...context.variables },
        output,
        actions_applied: stepActions,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - stepStart,
      });

      if (errorMessage) break;

      // Find next node via default edge
      const outEdge = edges.find((e: any) => e.source_node_id === current.node_id && (!e.source_handle || e.source_handle === "out"));
      if (outEdge) {
        current = nodes.find((n: any) => n.node_id === outEdge.target_node_id) || null;
      } else {
        current = null;
      }
    }

    // Update execution log
    const finalStatus = errorMessage ? "error" : shouldPause ? "paused" : "completed";
    if (logId) {
      await supabase.from("flow_execution_logs").update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        execution_path: executionSteps,
        variables_snapshot: context.variables,
        error_message: errorMessage,
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({
      status: finalStatus,
      flow_id: targetFlowId,
      conversation_id,
      steps: executionSteps.length,
      actions_applied: actionsApplied,
      execution_log_id: logId,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ───

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] || `{{${key.trim()}}}`);
}

function evaluateCondition(config: Record<string, any>, context: FlowContext): boolean {
  const value = String(config.value || "").toLowerCase();
  const operator = config.operator || "contains";

  let subject = "";
  switch (config.condition_type) {
    case "keyword":
      subject = context.last_message.text.toLowerCase();
      break;
    case "tag_contains":
      return context.tags.some(t => t.toLowerCase().includes(value));
    case "stage_is":
      subject = context.pipeline_stage;
      break;
    case "variable":
      subject = String(context.variables[config.variable_name || ""] || "").toLowerCase();
      break;
    default:
      subject = context.last_message.text.toLowerCase();
  }

  switch (operator) {
    case "eq": return subject === value;
    case "contains": return subject.includes(value);
    case "gt": return Number(subject) > Number(value);
    case "lt": return Number(subject) < Number(value);
    case "exists": return !!subject && subject !== "";
    default: return subject.includes(value);
  }
}
