/**
 * Automated Notification Engine for Central CRM
 * Integrates:
 * 1. Brevo (formerly Sendinblue) for Transactional Emails
 * 2. Meta WhatsApp Cloud API (Official, Serverless, 1000 free/month)
 * 3. OpenWA (@open-wa/wa-automate / REST API) for self-hosted WhatsApp Web
 */

// ----------------------------------------------------
// PHONE NUMBER NORMALIZATION FOR WHATSAPP
// ----------------------------------------------------
export function normalizeWhatsAppNumber(rawPhone) {
  if (!rawPhone) return null;
  // Strip non-digit characters
  let digits = String(rawPhone).replace(/\D/g, '');

  // Handle Indian local 10-digit numbers without country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.substring(1)}`;
  }

  if (digits.length < 8) return null;

  return {
    digits,
    chatId: `${digits}@c.us`,
  };
}

// ----------------------------------------------------
// 1. BREVO EMAIL ENGINE
// ----------------------------------------------------
export async function sendBrevoEmail({
  apiKey,
  senderName,
  senderEmail,
  toEmail,
  toName,
  subject,
  htmlContent,
}) {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'Brevo API key is not configured.' };
  }
  if (!senderEmail || !senderEmail.trim()) {
    return { success: false, error: 'Brevo sender email is not configured.' };
  }
  if (!toEmail || !toEmail.trim()) {
    return { success: false, error: 'Recipient email address is missing.' };
  }

  const payload = {
    sender: {
      name: senderName || 'Central CRM',
      email: senderEmail.trim(),
    },
    to: [
      {
        email: toEmail.trim(),
        name: toName || toEmail.trim(),
      },
    ],
    subject: subject || 'New Notification from Central CRM',
    htmlContent,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey.trim(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, messageId: data.messageId || 'queued' };
    } else {
      const errMsg = data.message || `Brevo API returned HTTP status ${res.status}`;
      return { success: false, error: errMsg };
    }
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Brevo API request timed out (12s)' : err.message,
    };
  }
}

// ----------------------------------------------------
// 2. META WHATSAPP CLOUD API ENGINE (OFFICIAL & SERVERLESS)
// ----------------------------------------------------
export async function sendMetaWhatsAppCloudApi({
  phoneNumberId,
  accessToken,
  toPhone,
  message,
  templateName,
  templateLanguage = 'en_US',
}) {
  const norm = normalizeWhatsAppNumber(toPhone);
  if (!norm) {
    return { success: false, error: `Invalid or missing phone number: "${toPhone}"` };
  }
  if (!phoneNumberId || !phoneNumberId.trim()) {
    return { success: false, error: 'Meta WhatsApp Phone Number ID is missing.' };
  }
  if (!accessToken || !accessToken.trim()) {
    return { success: false, error: 'Meta WhatsApp Access Token is missing.' };
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}/messages`;

  let payload;
  if (templateName && templateName.trim()) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: norm.digits,
      type: 'template',
      template: {
        name: templateName.trim(),
        language: { code: templateLanguage },
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: norm.digits,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.trim()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id,
        recipient: norm.digits,
        provider: 'meta_cloud',
      };
    } else {
      const errMsg =
        data.error?.message ||
        data.error?.error_user_msg ||
        `Meta Cloud API returned HTTP status ${res.status}`;
      return {
        success: false,
        error: errMsg,
        code: data.error?.code,
        provider: 'meta_cloud',
      };
    }
  } catch (err) {
    clearTimeout(timeout);
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Meta Cloud API request timed out (12s)' : err.message,
      provider: 'meta_cloud',
    };
  }
}

// ----------------------------------------------------
// 3. OPENWA WHATSAPP ENGINE (SELF-HOSTED)
// ----------------------------------------------------
export async function sendOpenwaWhatsApp({
  serverUrl = 'http://localhost:8085',
  apiKey,
  session,
  toPhone,
  message,
}) {
  const norm = normalizeWhatsAppNumber(toPhone);
  if (!norm) {
    return { success: false, error: `Invalid or missing phone number: "${toPhone}"` };
  }

  if (!serverUrl || !serverUrl.trim()) {
    return { success: false, error: 'OpenWA Server URL is not configured.' };
  }

  let baseUrl = serverUrl.trim();
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    headers['api-key'] = apiKey.trim();
  }
  if (session && session.trim()) {
    headers['x-session'] = session.trim();
  }

  const body = JSON.stringify({
    chatId: norm.chatId,
    to: norm.chatId,
    phone: norm.digits,
    content: message,
    text: message,
    message: message,
    args: {
      to: norm.chatId,
      content: message,
    },
  });

  const endpointsToTry = [
    `${baseUrl}/api/sendText`,
    `${baseUrl}/sendText`,
    `${baseUrl}/messages/text`,
  ];

  let lastError = null;

  for (const endpoint of endpointsToTry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 404) continue;

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false && data.error === undefined) {
        return { success: true, response: data, endpoint, provider: 'openwa' };
      } else {
        lastError = data.message || data.error || `HTTP ${res.status} from ${endpoint}`;
      }
    } catch (err) {
      clearTimeout(timeout);
      lastError = err.name === 'AbortError' ? `Timeout connecting to ${endpoint}` : err.message;
    }
  }

  return {
    success: false,
    error: lastError || `Could not connect to OpenWA at ${baseUrl}. Ensure OpenWA server is running.`,
    provider: 'openwa',
  };
}

// ----------------------------------------------------
// 4. TEMPLATE BUILDERS
// ----------------------------------------------------

export function buildAdminLeadEmailHtml(lead, site) {
  const payloadRows = Object.entries(lead.payload || {})
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; width: 35%; text-transform: capitalize;">
          ${k.replace(/([A-Z])/g, ' $1')}
        </td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; word-break: break-word;">
          ${typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 28px; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .content { padding: 24px; }
    .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    .btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">🌐 ${site?.name || lead.siteName || 'Central CRM'}</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🚀 New Lead Connected!</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">A new submission has been captured into your Central CRM.</p>
    </div>
    <div class="content">
      <div class="highlight-box">
        <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 16px;">${lead.customerName}</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #15803d;">
          <strong>📞 Phone:</strong> <a href="tel:${lead.phone}" style="color: #15803d; text-decoration: underline;">${lead.phone || 'N/A'}</a>
          ${lead.phone ? `&nbsp;|&nbsp;<a href="https://wa.me/${lead.phone.replace(/\D/g, '')}" style="color: #047857; font-weight: 600;" target="_blank">Chat on WhatsApp</a>` : ''}
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #15803d;">
          <strong>📧 Email:</strong> <a href="mailto:${lead.email}" style="color: #15803d;">${lead.email || 'N/A'}</a>
        </p>
        <p style="margin: 4px 0; font-size: 14px; color: #15803d;">
          <strong>📋 Form Type:</strong> ${lead.type}
        </p>
        ${lead.sourceUrl ? `<p style="margin: 4px 0; font-size: 12px; color: #4b5563;"><strong>🔗 Source URL:</strong> ${lead.sourceUrl}</p>` : ''}
      </div>

      <h4 style="margin: 16px 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Submitted Details</h4>
      <table class="data-table">
        <tbody>
          ${payloadRows || '<tr><td colspan="2" style="padding: 10px; color: #94a3b8; font-style: italic;">No additional fields provided.</td></tr>'}
        </tbody>
      </table>

      <div style="text-align: center;">
        <a href="http://localhost:4004" class="btn" target="_blank">Open Central CRM Dashboard →</a>
      </div>
    </div>
    <div class="footer">
      Automated Lead Notification Powered by Central CRM &amp; Brevo • ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
  `;
}

export function buildCustomerAutoReplyEmailHtml(lead, site, senderName) {
  const brandName = site?.name || senderName || 'Our Team';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; color: #ffffff; text-align: center; }
    .content { padding: 28px; font-size: 15px; line-height: 1.6; }
    .badge { display: inline-block; background: #0d9488; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 20px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">${brandName}</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">We received your submission!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${lead.customerName}</strong>,</p>
      <p>Thank you for connecting with us! We have successfully received your <strong>${lead.type}</strong> submission.</p>
      <p>Our team is currently reviewing your details and will get back to you as soon as possible.</p>
      <div style="background: #f1f5f9; border-radius: 10px; padding: 14px; margin: 20px 0; font-size: 13px;">
        <strong>Reference ID:</strong> ${lead.id}<br>
        <strong>Submission Type:</strong> ${lead.type}<br>
        <strong>Registered Email:</strong> ${lead.email || 'N/A'}<br>
        <strong>Phone:</strong> ${lead.phone || 'N/A'}
      </div>
      <p>If you have any questions in the meantime, feel free to reply directly to this email.</p>
      <p style="margin-top: 24px;">Warm regards,<br><strong>${brandName} Team</strong></p>
    </div>
    <div class="footer">
      Sent with ❤️ from ${brandName}
    </div>
  </div>
</body>
</html>
  `;
}

export function buildAdminLeadWhatsAppMessage(lead, site) {
  const payloadLines = Object.entries(lead.payload || {})
    .slice(0, 6)
    .map(([k, v]) => `• *${k.replace(/([A-Z])/g, ' $1')}:* ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');

  return `🔔 *NEW LEAD CAPTURED*
━━━━━━━━━━━━━━━━━━━━
🌐 *Website:* ${site?.name || lead.siteName}
👤 *Name:* ${lead.customerName}
📞 *Phone:* ${lead.phone || 'N/A'}
📧 *Email:* ${lead.email || 'N/A'}
📋 *Type:* ${lead.type}
⏰ *Time:* ${new Date().toLocaleTimeString()}
${payloadLines ? `\n📝 *Details:*\n${payloadLines}` : ''}
━━━━━━━━━━━━━━━━━━━━
🚀 _Central CRM Auto-Alert_`;
}

export function buildCustomerWhatsAppMessage(lead, site) {
  const brandName = site?.name || 'Our Team';
  return `Hello *${lead.customerName}*,

Thank you for reaching out to *${brandName}*! 👋

We have successfully received your *${lead.type}* submission. Our team is already reviewing your request and will connect with you shortly.

If you have any urgent questions or details to share, feel free to reply directly to this message.

Best regards,
*${brandName} Team* 🚀`;
}

// ----------------------------------------------------
// 5. UNIFIED WHATSAPP DISPATCH HELPER
// ----------------------------------------------------
export async function sendWhatsAppMessage({ settings, toPhone, message }) {
  const provider = settings?.whatsappProvider || (settings?.metaWhatsApp?.accessToken ? 'meta_cloud' : 'openwa');

  if (provider === 'meta_cloud') {
    const meta = settings?.metaWhatsApp || {};
    return await sendMetaWhatsAppCloudApi({
      phoneNumberId: meta.phoneNumberId,
      accessToken: meta.accessToken,
      toPhone,
      message,
      templateName: meta.templateName,
    });
  } else {
    const openwa = settings?.openwa || {};
    return await sendOpenwaWhatsApp({
      serverUrl: openwa.serverUrl,
      apiKey: openwa.apiKey,
      session: openwa.session,
      toPhone,
      message,
    });
  }
}

// ----------------------------------------------------
// 6. AUTOMATED DISPATCH ORCHESTRATOR
// ----------------------------------------------------
export async function dispatchLeadAutomations(lead, settings, site) {
  const results = {
    email: {
      admin: { sent: false },
      customer: { sent: false },
    },
    whatsapp: {
      admin: { sent: false },
      customer: { sent: false },
    },
  };

  const brevo = settings?.brevo || {};
  const provider = settings?.whatsappProvider || (settings?.metaWhatsApp?.accessToken ? 'meta_cloud' : 'openwa');
  const waConfig = provider === 'meta_cloud' ? settings?.metaWhatsApp : settings?.openwa;

  // --- A. BREVO EMAILS ---
  if (brevo.enabled && brevo.apiKey) {
    // 1. Admin Email Alert
    if (brevo.notifyAdmin !== false && settings.adminEmail) {
      try {
        const subject =
          brevo.adminSubject ||
          `🔔 New Lead: ${lead.customerName} (${site?.name || lead.siteName})`;
        const html = buildAdminLeadEmailHtml(lead, site);
        const res = await sendBrevoEmail({
          apiKey: brevo.apiKey,
          senderName: brevo.senderName || 'Central CRM Alert',
          senderEmail: brevo.senderEmail,
          toEmail: settings.adminEmail,
          toName: 'Admin',
          subject,
          htmlContent: html,
        });

        results.email.admin = {
          sent: res.success,
          at: new Date().toISOString(),
          recipient: settings.adminEmail,
          error: res.error,
        };

        if (res.success) {
          console.log(`[Brevo] ✅ Admin alert email sent to ${settings.adminEmail}`);
        } else {
          console.warn(`[Brevo] ⚠️ Failed sending admin email: ${res.error}`);
        }
      } catch (e) {
        results.email.admin = { sent: false, error: e.message, at: new Date().toISOString() };
      }
    }

    // 2. Customer Confirmation Email
    if (brevo.autoReplyCustomer !== false && lead.email) {
      try {
        const subject =
          brevo.customerSubject ||
          `Thank you for contacting ${site?.name || 'us'}!`;
        const html = buildCustomerAutoReplyEmailHtml(lead, site, brevo.senderName);
        const res = await sendBrevoEmail({
          apiKey: brevo.apiKey,
          senderName: brevo.senderName || site?.name || 'Central CRM',
          senderEmail: brevo.senderEmail,
          toEmail: lead.email,
          toName: lead.customerName,
          subject,
          htmlContent: html,
        });

        results.email.customer = {
          sent: res.success,
          at: new Date().toISOString(),
          recipient: lead.email,
          error: res.error,
        };

        if (res.success) {
          console.log(`[Brevo] ✅ Customer confirmation email sent to ${lead.email}`);
        } else {
          console.warn(`[Brevo] ⚠️ Failed sending customer email: ${res.error}`);
        }
      } catch (e) {
        results.email.customer = { sent: false, error: e.message, at: new Date().toISOString() };
      }
    }
  }

  // --- B. WHATSAPP (META CLOUD API OR OPENWA) ---
  if (waConfig?.enabled !== false) {
    // 1. Admin WhatsApp Alert
    if (waConfig?.notifyAdmin !== false && settings.adminWhatsApp) {
      try {
        const message = buildAdminLeadWhatsAppMessage(lead, site);
        const res = await sendWhatsAppMessage({
          settings,
          toPhone: settings.adminWhatsApp,
          message,
        });

        results.whatsapp.admin = {
          sent: res.success,
          at: new Date().toISOString(),
          recipient: settings.adminWhatsApp,
          provider: res.provider || provider,
          messageId: res.messageId,
          error: res.error,
        };

        if (res.success) {
          console.log(`[WhatsApp - ${provider.toUpperCase()}] ✅ Admin WhatsApp alert sent to ${settings.adminWhatsApp}`);
        } else {
          console.warn(`[WhatsApp - ${provider.toUpperCase()}] ⚠️ Failed sending admin WhatsApp: ${res.error}`);
        }
      } catch (e) {
        results.whatsapp.admin = { sent: false, error: e.message, at: new Date().toISOString(), provider };
      }
    }

    // 2. Customer Welcome WhatsApp
    if (waConfig?.autoReplyCustomer !== false && lead.phone) {
      try {
        const message = buildCustomerWhatsAppMessage(lead, site);
        const res = await sendWhatsAppMessage({
          settings,
          toPhone: lead.phone,
          message,
        });

        results.whatsapp.customer = {
          sent: res.success,
          at: new Date().toISOString(),
          recipient: lead.phone,
          provider: res.provider || provider,
          messageId: res.messageId,
          error: res.error,
        };

        if (res.success) {
          console.log(`[WhatsApp - ${provider.toUpperCase()}] ✅ Customer WhatsApp greeting sent to ${lead.phone}`);
        } else {
          console.warn(`[WhatsApp - ${provider.toUpperCase()}] ⚠️ Failed sending customer WhatsApp: ${res.error}`);
        }
      } catch (e) {
        results.whatsapp.customer = { sent: false, error: e.message, at: new Date().toISOString(), provider };
      }
    }
  }

  return results;
}
