import { supabase } from "@/integrations/supabase/client";
import { debugLog, debugWarn } from "@/lib/debugMode";

interface DispatchParams {
  triggerEvent: string;
  clientName: string;
  clientPhone: string;
  clientId?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientType?: string;
  clientGender?: string;
  vehicleId?: string;
  vehicleDescription?: string;
  extraReplacements?: Record<string, string>;
  dispatchedBy?: string;
}

/**
 * Auto-dispatch WhatsApp message based on a trigger event template.
 * Looks up active whatsapp_templates matching the trigger, replaces placeholders, sends via Z-API.
 */
export async function dispatchWhatsAppTemplate(params: DispatchParams): Promise<boolean> {
  const {
    triggerEvent,
    clientName,
    clientPhone,
    clientId,
    clientEmail,
    clientDocument,
    clientType,
    clientGender,
    vehicleId,
    vehicleDescription,
    extraReplacements,
    dispatchedBy = "Sistema",
  } = params;

  if (!clientPhone) {
    debugWarn("[WhatsApp Auto] No phone number, skipping dispatch for:", triggerEvent);
    return false;
  }

  try {
    debugLog("[WhatsApp Auto] 🚀 Iniciando dispatch para trigger:", triggerEvent, "phone:", clientPhone);
    
    const { data: templates, error: tplError } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("trigger_event", triggerEvent)
      .eq("is_active", true)
      .limit(1);

    debugLog("[WhatsApp Auto] Templates encontrados:", templates?.length, "erro:", tplError?.message);

    const template = templates?.[0];
    if (!template) {
      debugLog("[WhatsApp Auto] ❌ Nenhum template ativo para trigger:", triggerEvent);
      return false;
    }

    // Build message replacing placeholders
    const firstName = (clientName || "").split(" ")[0];
    const isFemale = clientGender === "feminino";
    const welcomeWord = isFemale ? "Bem-vinda" : "Bem-vindo";
    const greetingWord = isFemale ? "Olá" : "Olá";

    let msg = template.message_body || "";
    msg = msg.replace(/\{\{nome_cliente\}\}/g, firstName);
    msg = msg.replace(/\{\{nome_completo\}\}/g, clientName || "");
    msg = msg.replace(/\{\{primeiro_nome\}\}/g, firstName);
    msg = msg.replace(/\{\{boas_vindas\}\}/g, welcomeWord);
    msg = msg.replace(/Bem-vindo\(a\)/g, welcomeWord);
    msg = msg.replace(/\{\{telefone_cliente\}\}/g, clientPhone || "");
    msg = msg.replace(/\{\{email_cliente\}\}/g, clientEmail || "");
    msg = msg.replace(/\{\{documento_cliente\}\}/g, clientDocument || "");
    msg = msg.replace(/\{\{tipo_cliente\}\}/g, clientType || "");

    // Extra replacements
    if (extraReplacements) {
      for (const [key, value] of Object.entries(extraReplacements)) {
        msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }
    }

    const cleanPhone = clientPhone.replace(/\D/g, "");

    const sendMsg = async () => {
      try {
        await supabase.functions.invoke("zapi-proxy", {
          body: { action: "send-text", payload: { phone: cleanPhone, message: msg } },
        });
        debugLog(`[WhatsApp Auto] Mensagem "${triggerEvent}" enviada para ${cleanPhone}`);
        // Log dispatch
        await supabase.from("whatsapp_dispatch_logs" as any).insert({
          template_id: template.id,
          template_name: template.name,
          trigger_event: template.trigger_event,
          client_name: clientName,
          client_phone: clientPhone,
          client_id: clientId || null,
          vehicle_id: vehicleId || null,
          vehicle_description: vehicleDescription || null,
          message_sent: msg,
          status: "enviado",
          dispatched_by: dispatchedBy,
        });
        return true;
      } catch (sendErr: any) {
        console.error(`[WhatsApp Auto] Erro ao enviar "${triggerEvent}":`, sendErr.message);
        await supabase.from("whatsapp_dispatch_logs" as any).insert({
          template_id: template.id,
          template_name: template.name,
          trigger_event: template.trigger_event,
          client_name: clientName,
          client_phone: clientPhone,
          client_id: clientId || null,
          vehicle_id: vehicleId || null,
          vehicle_description: vehicleDescription || null,
          message_sent: msg,
          status: "erro",
          error_message: sendErr.message,
          dispatched_by: dispatchedBy,
        });
        return false;
      }
    };

    if (template.delay_minutes && template.delay_minutes > 0) {
      setTimeout(sendMsg, template.delay_minutes * 60 * 1000);
      console.log(`[WhatsApp Auto] Mensagem "${triggerEvent}" agendada em ${template.delay_minutes} min`);
      return true;
    } else {
      return await sendMsg();
    }
  } catch (err: any) {
    console.error("[WhatsApp Auto] Erro geral:", err.message);
    return false;
  }
}
