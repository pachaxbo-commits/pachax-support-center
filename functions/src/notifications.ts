import * as admin from "firebase-admin";

export interface CriticalIncidentNotificationPayload {
  reportId: string;
  projectId: string;
  projectName: string;
  clientCompanyId: string;
  developerCompanyId: string;
  reportedByEmail: string;
  title: string;
  criticalJustification: string;
  emergencyPhone?: string | null;
  createdAt: string;
}

export interface NotificationDispatchResult {
  emailDispatched: boolean;
  telegramDispatched: boolean;
  status: "delivered" | "pending_credentials" | "partial" | "failed";
  details: {
    telegram?: { ok: boolean; messageId?: string; error?: string };
    email?: { ok: boolean; providerId?: string; error?: string };
  };
}

/**
 * Dispatches critical incident alerts via Telegram and Email.
 * If credentials are not configured in Secret Manager / environment,
 * records the alert in Firestore `notificationQueue` without throwing or
 * fabricating false delivery.
 */
export async function dispatchCriticalIncidentAlert(
  db: admin.firestore.Firestore,
  payload: CriticalIncidentNotificationPayload
): Promise<NotificationDispatchResult> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationEmailTo = process.env.NOTIFICATION_EMAIL_TO || "soporte@pachax.bo";

  const result: NotificationDispatchResult = {
    emailDispatched: false,
    telegramDispatched: false,
    status: "pending_credentials",
    details: {},
  };

  const notificationDocRef = db.collection("notificationQueue").doc();

  // 1. Dispatch Telegram if configured
  if (telegramBotToken && telegramChatId) {
    try {
      const tgText = `🚨 *PACHAX SUPPORT CENTER — INCIDENCIA CRÍTICA*\n\n` +
        `*Proyecto:* ${escapeMarkdown(payload.projectName)} (${payload.projectId})\n` +
        `*Reporte:* \`${payload.reportId}\`\n` +
        `*Título:* ${escapeMarkdown(payload.title)}\n` +
        `*Reportado por:* ${escapeMarkdown(payload.reportedByEmail)}\n` +
        (payload.emergencyPhone ? `*Teléfono Emergencia:* \`${escapeMarkdown(payload.emergencyPhone)}\`\n` : "") +
        `\n*Justificación Crítica:*\n${escapeMarkdown(payload.criticalJustification.substring(0, 500))}\n\n` +
        `🔗 *Ver en Consola:* https://support.pachax.bo/admin/incidents/${payload.reportId}`;

      const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: tgText,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });

      const tgData = await tgRes.json() as any;
      if (tgData.ok) {
        result.telegramDispatched = true;
        result.details.telegram = { ok: true, messageId: String(tgData.result?.message_id) };
      } else {
        result.details.telegram = { ok: false, error: tgData.description || "Telegram API error" };
      }
    } catch (err: any) {
      result.details.telegram = { ok: false, error: err.message || "Failed to reach Telegram" };
    }
  } else {
    result.details.telegram = {
      ok: false,
      error: "Credenciales de Telegram (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) no configuradas en el entorno.",
    };
  }

  // 2. Dispatch Email via Resend if configured
  if (resendApiKey) {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PACHAX Support Center <alertas@support.pachax.bo>",
          to: [notificationEmailTo],
          subject: `🚨 [CRÍTICO 24/7] ${payload.title} — ${payload.projectName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: #ef4444; color: white; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 16px; text-align: center;">
                🚨 ALERTA DE INCIDENCIA CRÍTICA
              </div>
              <h2 style="color: #0f172a; margin-top: 20px;">${escapeHtml(payload.title)}</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Proyecto:</td><td style="padding: 8px 0; color: #0f172a;">${escapeHtml(payload.projectName)} (<code>${escapeHtml(payload.projectId)}</code>)</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">ID Reporte:</td><td style="padding: 8px 0; color: #0f172a;"><code>${escapeHtml(payload.reportId)}</code></td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reportado por:</td><td style="padding: 8px 0; color: #0f172a;">${escapeHtml(payload.reportedByEmail)}</td></tr>
                ${payload.emergencyPhone ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Teléfono de Contacto:</td><td style="padding: 8px 0; color: #ef4444; font-weight: bold;">${escapeHtml(payload.emergencyPhone)}</td></tr>` : ""}
              </table>
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 13px;">JUSTIFICACIÓN CRÍTICA:</p>
                <p style="margin: 6px 0 0; color: #7f1d1d; font-size: 14px; white-space: pre-wrap;">${escapeHtml(payload.criticalJustification)}</p>
              </div>
              <div style="text-align: center; margin-top: 24px;">
                <a href="https://support.pachax.bo/admin/incidents/${escapeHtml(payload.reportId)}" style="display: inline-block; background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Abrir Incidencia en Consola
                </a>
              </div>
            </div>
          `,
        }),
      });

      const emailData = await emailRes.json() as any;
      if (emailRes.ok && emailData.id) {
        result.emailDispatched = true;
        result.details.email = { ok: true, providerId: emailData.id };
      } else {
        result.details.email = { ok: false, error: emailData.message || "Email provider error" };
      }
    } catch (err: any) {
      result.details.email = { ok: false, error: err.message || "Failed to reach email provider" };
    }
  } else {
    result.details.email = {
      ok: false,
      error: "Credencial de Email (RESEND_API_KEY) no configurada en Secret Manager.",
    };
  }

  // 3. Consolidate final status
  if (result.telegramDispatched && result.emailDispatched) {
    result.status = "delivered";
  } else if (result.telegramDispatched || result.emailDispatched) {
    result.status = "partial";
  } else if (telegramBotToken || resendApiKey) {
    result.status = "failed";
  } else {
    result.status = "pending_credentials";
  }

  // 4. Record event in Firestore notificationQueue
  await notificationDocRef.set({
    reportId: payload.reportId,
    projectId: payload.projectId,
    clientCompanyId: payload.clientCompanyId,
    developerCompanyId: payload.developerCompanyId,
    type: "critical_incident_alert",
    status: result.status,
    emailDispatched: result.emailDispatched,
    telegramDispatched: result.telegramDispatched,
    details: result.details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return result;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
