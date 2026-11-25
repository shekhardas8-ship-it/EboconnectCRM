import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  dispatchLeadAutomations,
  sendBrevoEmail,
  sendOpenwaWhatsApp,
  sendMetaWhatsAppCloudApi,
} from './src/lib/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4004;

// Enable CORS for all websites and webhook sources
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-site-api-key'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// DATABASE HELPERS
// ----------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'crm.json');

const DEFAULT_SETTINGS = {
  adminEmail: 'kuhelibusinessstudio@gmail.com',
  adminWhatsApp: '+918287416406',
  webhookUrl: '',
  whatsappProvider: 'meta_cloud', // 'meta_cloud' or 'openwa'
  metaWhatsApp: {
    enabled: true,
    phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
    accessToken: process.env.META_WA_ACCESS_TOKEN || '',
    wabaId: process.env.META_WA_WABA_ID || '',
    notifyAdmin: true,
    autoReplyCustomer: true,
    templateName: '',
  },
  brevo: {
    enabled: true,
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'kuhelibusinessstudio@gmail.com',
    senderName: 'Central CRM Alert',
    notifyAdmin: true,
    autoReplyCustomer: true,
    adminSubject: '',
    customerSubject: '',
  },
  openwa: {
    enabled: false,
    serverUrl: process.env.OPENWA_SERVER_URL || 'http://localhost:8085',
    apiKey: process.env.OPENWA_API_KEY || '',
    session: 'default',
    notifyAdmin: true,
    autoReplyCustomer: true,
  },
};

const INITIAL_DB = {
  sites: [
    {
      id: 'site_scaleroute',
      name: 'ScaleRoute (Wix)',
      domain: 'scaleroute.in',
      apiKey: 'sr_live_key_wix_9982',
      colorTag: 'teal',
      createdAt: new Date().toISOString(),
      leadCount: 2,
    },
    {
      id: 'site_growth',
      name: 'WeGrow India Campaign',
      domain: 'wegrowindia.com',
      apiKey: 'wg_live_key_grow_4120',
      colorTag: 'indigo',
      createdAt: new Date().toISOString(),
      leadCount: 1,
    },
  ],
  leads: [],
  settings: DEFAULT_SETTINGS,
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDB() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    saveDB(INITIAL_DB);
    return INITIAL_DB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw);

    // Ensure sites array exists
    if (!Array.isArray(db.sites)) db.sites = [];
    if (!Array.isArray(db.leads)) db.leads = [];

    // Merge default settings
    db.settings = {
      ...DEFAULT_SETTINGS,
      ...(db.settings || {}),
      whatsappProvider: db.settings?.whatsappProvider || DEFAULT_SETTINGS.whatsappProvider,
      metaWhatsApp: {
        ...DEFAULT_SETTINGS.metaWhatsApp,
        ...(db.settings?.metaWhatsApp || {}),
      },
      brevo: {
        ...DEFAULT_SETTINGS.brevo,
        ...(db.settings?.brevo || {}),
      },
      openwa: {
        ...DEFAULT_SETTINGS.openwa,
        ...(db.settings?.openwa || {}),
      },
    };

    return db;
  } catch (err) {
    saveDB(INITIAL_DB);
    return INITIAL_DB;
  }
}

function saveDB(db) {
  ensureDir(DATA_DIR);
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

// ----------------------------------------------------
// MULTI-SITE LEAD INGESTION HANDLER
// ----------------------------------------------------
async function handleIngestLead(req, res, explicitApiKey = null) {
  try {
    const apiKey =
      explicitApiKey ||
      req.headers['x-site-api-key'] ||
      (req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '') ||
      req.body?.apiKey ||
      req.query?.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing site API key. Pass via x-site-api-key header, authorization Bearer, apiKey body/query param, or URL /api/v1/webhook/:apiKey',
      });
    }

    const db = getDB();
    const site = db.sites.find((s) => s.apiKey === String(apiKey).trim());
    if (!site) {
      return res.status(401).json({
        success: false,
        error: `Unauthorized: No connected website found for API key "${apiKey}". Please verify in Central CRM sites tab.`,
      });
    }

    const body = req.body || {};

    // Smart field extraction: supports standard forms, Elementor, CF7, Wix, Webflow, Typeform, etc.
    const customerName =
      body.name ||
      body.customerName ||
      body.fullName ||
      body.full_name ||
      body['your-name'] ||
      body.first_name ||
      body.fname ||
      body.founderName ||
      body.investorName ||
      body.applicantName ||
      'Website Visitor';

    const email =
      body.email ||
      body['your-email'] ||
      body.user_email ||
      body.customerEmail ||
      body.founderEmail ||
      body.mail ||
      '';

    const phone =
      body.phone ||
      body['your-phone'] ||
      body.mobile ||
      body.mobileNumber ||
      body.tel ||
      body.telephone ||
      body.phoneNumber ||
      body.founderPhone ||
      body.whatsapp ||
      '';

    const type =
      body.type ||
      body.submissionType ||
      body.form_name ||
      body.formId ||
      body.subject ||
      body.service ||
      body['form-title'] ||
      'Website Form Inquiry';

    const sourceUrl =
      body.sourceUrl ||
      body.sourcePage ||
      body.pageUrl ||
      body.url ||
      req.headers['referer'] ||
      `https://${site.domain}`;

    const {
      apiKey: _,
      name: __,
      customerName: ___,
      fullName: ____,
      full_name: _____,
      'your-name': ______,
      first_name: _______,
      fname: ________,
      email: _________,
      'your-email': __________,
      user_email: ___________,
      phone: ____________,
      'your-phone': _____________,
      mobile: ______________,
      mobileNumber: _______________,
      tel: ________________,
      type: _________________,
      submissionType: __________________,
      ...restPayload
    } = body;

    const payload = body.details || body.payload || restPayload;

    const newLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      siteId: site.id,
      siteName: site.name,
      customerName: String(customerName).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      type: String(type).trim(),
      status: 'New',
      sourceUrl,
      payload,
      notes: [],
      notifications: {
        email: { admin: { sent: false }, customer: { sent: false } },
        whatsapp: { admin: { sent: false }, customer: { sent: false } },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately store lead in Central CRM & update site counters
    db.leads.unshift(newLead);
    site.leadCount = (site.leadCount || 0) + 1;
    site.lastLeadAt = new Date().toISOString();
    saveDB(db);

    // 2. Respond promptly to caller
    res.status(201).json({
      success: true,
      message: `Lead successfully recorded into Central CRM from "${site.name}". Automations triggered.`,
      leadId: newLead.id,
      siteId: site.id,
      siteName: site.name,
    });

    // 3. Automatically push Brevo Email & OpenWA WhatsApp in background
    dispatchLeadAutomations(newLead, db.settings, site)
      .then((notificationResults) => {
        try {
          const freshDb = getDB();
          const target = freshDb.leads.find((l) => l.id === newLead.id);
          if (target) {
            target.notifications = notificationResults;
            target.updatedAt = new Date().toISOString();
            saveDB(freshDb);
          }
          console.log(`[Auto-Push] Completed automations for Lead ID: ${newLead.id} (${site.name})`);
        } catch (e) {
          console.error('[Auto-Push] Error updating lead notifications record:', e);
        }
      })
      .catch((err) => {
        console.error('[Auto-Push] Automation dispatch error:', err);
      });
  } catch (err) {
    console.error('Error ingesting lead:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// 1. Ingest Lead from any connected site via standard endpoint
app.post('/api/v1/leads', (req, res) => handleIngestLead(req, res));

// 2. Direct Webhook Ingestion URL per site (Zero-Configuration for Zapier, Webflow, Typeform, Elementor)
app.post('/api/v1/webhook/:apiKey', (req, res) => handleIngestLead(req, res, req.params.apiKey));
app.get('/api/v1/webhook/:apiKey', (req, res) => {
  const db = getDB();
  const site = db.sites.find((s) => s.apiKey === String(req.params.apiKey).trim());
  if (!site) {
    return res.status(404).json({ success: false, error: 'Invalid site API key' });
  }
  res.json({
    success: true,
    status: 'Webhook endpoint active and ready to receive submissions',
    site: { id: site.id, name: site.name, domain: site.domain },
  });
});

// 3. Universal Tracker JavaScript (Zero-Code 1-Line Embed for any Website)
app.get('/api/v1/tracker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
/**
 * OmniCRM Universal Multi-Site Form Tracker
 * Automatically captures all form inquiries and feeds into Central CRM.
 */
(function() {
  var script = document.currentScript || document.querySelector('script[data-site-key]');
  var siteKey = script ? script.getAttribute('data-site-key') : '';
  var serverUrl = script ? (new URL(script.src)).origin : window.location.origin;

  if (!siteKey) {
    console.warn('[Central CRM] Tracker script loaded without data-site-key attribute.');
    return;
  }

  window.OmniCRM = {
    siteKey: siteKey,
    serverUrl: serverUrl,
    captureLead: function(data) {
      return fetch(serverUrl + '/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-api-key': siteKey
        },
        body: JSON.stringify(data),
        keepalive: true
      }).then(function(res) {
        return res.json();
      }).catch(function(err) {
        console.error('[Central CRM] Ingestion error:', err);
      });
    }
  };

  // Automatically listen to all form submissions on the website
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || form.nodeName !== 'FORM') return;

    try {
      var formData = new FormData(form);
      var details = {};
      formData.forEach(function(val, key) {
        if (typeof val === 'string' && val.length < 5000) {
          details[key] = val;
        }
      });

      var name = details.name || details.customerName || details.fullName || details.full_name || details['your-name'] || details.first_name || details.fname || '';
      var email = details.email || details['your-email'] || details.user_email || details.mail || '';
      var phone = details.phone || details['your-phone'] || details.mobile || details.tel || details.whatsapp || '';
      var type = form.getAttribute('data-lead-type') || form.id || form.name || 'Website Form Inquiry';

      if (email || phone || name) {
        window.OmniCRM.captureLead({
          name: name || 'Website Visitor',
          email: email,
          phone: phone,
          type: type,
          sourceUrl: window.location.href,
          details: details
        });
      }
    } catch(err) {
      console.warn('[Central CRM Tracker]', err);
    }
  }, true);

  console.log('[Central CRM] Multi-site lead capture active for site:', siteKey);
})();
  `);
});

// 4. Get Leads with filters
app.get('/api/v1/leads', (req, res) => {
  try {
    const db = getDB();
    const { siteId, status, search } = req.query;
    let list = db.leads;

    if (siteId && siteId !== 'all') {
      list = list.filter((l) => l.siteId === siteId);
    }
    if (status && status !== 'all') {
      list = list.filter((l) => l.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(
        (l) =>
          (l.customerName || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.phone || '').includes(q) ||
          (l.siteName || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, leads: list });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
});

// 5. Update Lead Status / Add Note
app.patch('/api/v1/leads/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, author } = req.body;
    const db = getDB();
    const lead = db.leads.find((l) => l.id === id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (status) lead.status = status;
    if (note && note.trim()) {
      if (!lead.notes) lead.notes = [];
      lead.notes.push({
        id: `note_${Date.now()}`,
        text: note.trim(),
        createdAt: new Date().toISOString(),
        author: author || 'Admin',
      });
    }

    lead.updatedAt = new Date().toISOString();
    saveDB(db);
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

// 6. Delete Lead
app.delete('/api/v1/leads/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const idx = db.leads.findIndex((l) => l.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const lead = db.leads[idx];
    db.leads.splice(idx, 1);

    const site = db.sites.find((s) => s.id === lead.siteId);
    if (site && site.leadCount > 0) site.leadCount -= 1;

    saveDB(db);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
});

// 7. Resend Notifications for a specific Lead (1-Click Manual Trigger)
app.post('/api/v1/leads/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const lead = db.leads.find((l) => l.id === id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const site = db.sites.find((s) => s.id === lead.siteId);
    const results = await dispatchLeadAutomations(lead, db.settings, site);

    lead.notifications = results;
    lead.updatedAt = new Date().toISOString();
    saveDB(db);

    res.json({
      success: true,
      message: 'Notifications re-dispatched successfully.',
      notifications: results,
      lead,
    });
  } catch (err) {
    console.error('Error resending lead notifications:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to resend notifications' });
  }
});

// ----------------------------------------------------
// SITES MANAGEMENT (CRUD + BATCH ADD)
// ----------------------------------------------------

// 8. Get All Sites
app.get('/api/v1/sites', (req, res) => {
  try {
    const db = getDB();
    res.json({ success: true, sites: db.sites });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch sites' });
  }
});

// 9. Create Single Site + Generate API Key
app.post('/api/v1/sites', (req, res) => {
  try {
    const { name, domain, colorTag, description } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ success: false, error: 'Name and domain are required' });
    }

    const db = getDB();
    const id = `site_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const apiKey = `omni_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    
    // Clean domain
    const cleanDomain = String(domain).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

    const newSite = {
      id,
      name: String(name).trim(),
      domain: cleanDomain,
      apiKey,
      colorTag: colorTag || 'teal',
      description: description || '',
      createdAt: new Date().toISOString(),
      leadCount: 0,
    };

    db.sites.push(newSite);
    saveDB(db);

    res.status(201).json({ success: true, site: newSite });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create site' });
  }
});

// 10. Batch Create Multiple Sites at Once
app.post('/api/v1/sites/batch', (req, res) => {
  try {
    const { sites } = req.body;
    if (!Array.isArray(sites) || sites.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of sites is required' });
    }

    const db = getDB();
    const colorPalette = ['teal', 'indigo', 'blue', 'purple', 'emerald', 'amber', 'rose', 'cyan'];
    const addedSites = [];

    for (let i = 0; i < sites.length; i++) {
      const item = sites[i];
      if (!item.name || !item.domain) continue;

      const cleanDomain = String(item.domain).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      const id = `site_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const apiKey = `omni_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      const colorTag = item.colorTag || colorPalette[i % colorPalette.length];

      const newSite = {
        id,
        name: String(item.name).trim(),
        domain: cleanDomain,
        apiKey,
        colorTag,
        description: item.description || '',
        createdAt: new Date().toISOString(),
        leadCount: 0,
      };

      db.sites.push(newSite);
      addedSites.push(newSite);
    }

    saveDB(db);

    res.status(201).json({
      success: true,
      message: `Successfully connected ${addedSites.length} websites to Central CRM`,
      sites: addedSites,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to batch add sites' });
  }
});

// 11. Update Site Details or Regenerate API Key
app.patch('/api/v1/sites/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain, colorTag, description, regenerateKey } = req.body;

    const db = getDB();
    const site = db.sites.find((s) => s.id === id);
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    if (name) site.name = String(name).trim();
    if (domain) site.domain = String(domain).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (colorTag) site.colorTag = colorTag;
    if (description !== undefined) site.description = description;
    if (regenerateKey) {
      site.apiKey = `omni_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    }

    saveDB(db);
    res.json({ success: true, site });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update site' });
  }
});

// 12. Delete Site
app.delete('/api/v1/sites/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const idx = db.sites.findIndex((s) => s.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const removedSite = db.sites.splice(idx, 1)[0];
    saveDB(db);

    res.json({ success: true, message: `Site "${removedSite.name}" removed from CRM.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete site' });
  }
});

// ----------------------------------------------------
// STATS & SETTINGS
// ----------------------------------------------------

// 13. Stats
app.get('/api/v1/stats', (req, res) => {
  try {
    const db = getDB();
    const totalLeads = db.leads.length;
    const newLeads = db.leads.filter((l) => l.status === 'New').length;
    const contactedLeads = db.leads.filter((l) => l.status === 'Contacted').length;
    const qualifiedLeads = db.leads.filter((l) => l.status === 'Qualified' || l.status === 'Closed').length;
    const conversionRate = totalLeads > 0 ? Math.round(((contactedLeads + qualifiedLeads) / totalLeads) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        qualifiedLeads,
        conversionRate,
        activeSites: db.sites.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// 14. Get Settings
app.get('/api/v1/settings', (req, res) => {
  try {
    const db = getDB();
    res.json({ success: true, settings: db.settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// 15. Update Settings
app.post('/api/v1/settings', (req, res) => {
  try {
    const db = getDB();
    const newSettings = req.body;

    db.settings = {
      ...db.settings,
      ...newSettings,
      whatsappProvider: newSettings.whatsappProvider || db.settings.whatsappProvider || 'meta_cloud',
      metaWhatsApp: {
        ...db.settings.metaWhatsApp,
        ...(newSettings.metaWhatsApp || {}),
      },
      brevo: {
        ...db.settings.brevo,
        ...(newSettings.brevo || {}),
      },
      openwa: {
        ...db.settings.openwa,
        ...(newSettings.openwa || {}),
      },
    };

    saveDB(db);
    res.json({ success: true, message: 'Settings saved successfully', settings: db.settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// 16. Test Brevo Email Delivery
app.post('/api/v1/notifications/test-brevo', async (req, res) => {
  try {
    const db = getDB();
    const { apiKey, senderEmail, senderName, toEmail } = req.body;

    const testApiKey = apiKey || db.settings.brevo?.apiKey;
    const testSenderEmail = senderEmail || db.settings.brevo?.senderEmail;
    const testSenderName = senderName || db.settings.brevo?.senderName || 'Central CRM Test';
    const testToEmail = toEmail || db.settings.adminEmail;

    if (!testApiKey) {
      return res.status(400).json({ success: false, error: 'Brevo API Key is missing. Please provide or save it.' });
    }
    if (!testSenderEmail) {
      return res.status(400).json({ success: false, error: 'Brevo Sender Email is missing.' });
    }
    if (!testToEmail) {
      return res.status(400).json({ success: false, error: 'Recipient test email address is required.' });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 24px; border: 1px solid #14b8a6; border-radius: 12px; background: #f0fdfa; max-width: 500px;">
        <h2 style="color: #0d9488; margin-top: 0;">🎉 Brevo Email Integration Test Successful!</h2>
        <p style="color: #334155; line-height: 1.5;">This test confirms that your <strong>Brevo (Sendinblue)</strong> API is configured and connected correctly to Central CRM.</p>
        <p style="color: #64748b; font-size: 13px;">Tested at: ${new Date().toLocaleString()}</p>
        <hr style="border: none; border-top: 1px solid #ccfbf1; margin: 16px 0;" />
        <p style="font-size: 12px; color: #0d9488; font-weight: bold;">Central CRM Automated Dispatch</p>
      </div>
    `;

    const result = await sendBrevoEmail({
      apiKey: testApiKey,
      senderEmail: testSenderEmail,
      senderName: testSenderName,
      toEmail: testToEmail,
      toName: 'Admin Tester',
      subject: '✅ Brevo Test Connection - Central CRM',
      htmlContent,
    });

    if (result.success) {
      res.json({ success: true, message: `Test email successfully dispatched to ${testToEmail}`, details: result });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Test Meta WhatsApp Cloud API Delivery
app.post('/api/v1/notifications/test-meta-whatsapp', async (req, res) => {
  try {
    const db = getDB();
    const { phoneNumberId, accessToken, toPhone, message } = req.body;

    const testPhoneId = phoneNumberId || db.settings.metaWhatsApp?.phoneNumberId;
    const testToken = accessToken || db.settings.metaWhatsApp?.accessToken;
    const testToPhone = toPhone || db.settings.adminWhatsApp;
    const testMsg =
      message ||
      `🎉 *Central CRM Meta Cloud API Test*\n\nWhatsApp Cloud API is connected and working!\n\nTime: ${new Date().toLocaleTimeString()}`;

    if (!testPhoneId) {
      return res.status(400).json({ success: false, error: 'Meta WhatsApp Phone Number ID is required.' });
    }
    if (!testToken) {
      return res.status(400).json({ success: false, error: 'Meta WhatsApp Access Token is required.' });
    }
    if (!testToPhone) {
      return res.status(400).json({ success: false, error: 'Recipient WhatsApp phone number is required.' });
    }

    const result = await sendMetaWhatsAppCloudApi({
      phoneNumberId: testPhoneId,
      accessToken: testToken,
      toPhone: testToPhone,
      message: testMsg,
    });

    if (result.success) {
      res.json({
        success: true,
        message: `WhatsApp test successfully dispatched via Meta Cloud API to ${testToPhone}`,
        details: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Test OpenWA WhatsApp Delivery
app.post('/api/v1/notifications/test-openwa', async (req, res) => {
  try {
    const db = getDB();
    const { serverUrl, apiKey, toPhone, message } = req.body;

    const testServerUrl = serverUrl || db.settings.openwa?.serverUrl || 'http://localhost:8085';
    const testApiKey = apiKey || db.settings.openwa?.apiKey;
    const testToPhone = toPhone || db.settings.adminWhatsApp;
    const testMsg =
      message ||
      `🎉 *Central CRM OpenWA Test*\n\nWhatsApp integration is active and communicating with OpenWA Server at: ${testServerUrl}\n\nTime: ${new Date().toLocaleTimeString()}`;

    if (!testToPhone) {
      return res.status(400).json({ success: false, error: 'Recipient WhatsApp phone number is required.' });
    }

    const result = await sendOpenwaWhatsApp({
      serverUrl: testServerUrl,
      apiKey: testApiKey,
      toPhone: testToPhone,
      message: testMsg,
    });

    if (result.success) {
      res.json({
        success: true,
        message: `WhatsApp message successfully dispatched via OpenWA to ${testToPhone}`,
        details: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        serverUrl: testServerUrl,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Admin Login Auth
app.post('/api/auth', (req, res) => {
  const { email, password } = req.body;
  if (
    email?.trim().toLowerCase() === 'kuhelibusinessstudio@gmail.com' &&
    password === 'B12welcome@'
  ) {
    return res.json({
      success: true,
      token: `crm_token_${Date.now()}`,
      user: { email: 'kuhelibusinessstudio@gmail.com', name: 'Admin' },
    });
  }
  res.status(401).json({ success: false, error: 'Invalid admin credentials' });
});

// Serve Vite's built static files if dist folder exists
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Central CRM Ingestion & Notification Server running at http://localhost:${PORT}`);
  console.log(`🌐 Multi-Site Ingestion API: Ready`);
  console.log(`📧 Brevo Email Engine: Ready`);
  console.log(`💬 OpenWA WhatsApp Engine: Ready`);
});
