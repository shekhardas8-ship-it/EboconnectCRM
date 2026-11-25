import fs from 'fs';
import path from 'path';
import { CRMDatabase, Lead, Site, LeadStatus } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'crm.json');

const INITIAL_DB: CRMDatabase = {
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
  leads: [
    {
      id: 'lead_demo_001',
      siteId: 'site_scaleroute',
      siteName: 'ScaleRoute (Wix)',
      customerName: 'Aarav Sharma',
      email: 'aarav.sharma@aerotech.io',
      phone: '+919876543210',
      type: 'Pitch Deck',
      status: 'In Review',
      sourceUrl: 'https://scaleroute.in/pitch-upload',
      payload: {
        projectName: 'AeroTech Drone Logistics',
        companyName: 'AeroTech Pvt Ltd',
        category: 'Aviation & Logistics',
        investmentRequired: '₹50,00,000',
        stakeOffered: '10%',
        expectedReturns: '25% CAGR in 3 years',
        projectSummary: 'Autonomous last-mile drone delivery network for tier 2/3 hospitals and medical centers.',
      },
      notes: [
        {
          id: 'note_1',
          text: 'Reviewed pitch deck. High potential in logistics. Scheduled initial screening.',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          author: 'Admin',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'lead_demo_002',
      siteId: 'site_scaleroute',
      siteName: 'ScaleRoute (Wix)',
      customerName: 'Pooja Verma',
      email: 'pooja.v@venturegrowth.com',
      phone: '+919123456789',
      type: 'Investor Registration',
      status: 'New',
      sourceUrl: 'https://scaleroute.in/investors-meet',
      payload: {
        eventName: 'Start Up Summit 2026',
        investmentSector: 'CleanTech & SaaS',
        investmentAmount: '₹1,00,00,000',
        address: 'Mumbai, Maharashtra',
      },
      notes: [],
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'lead_demo_003',
      siteId: 'site_growth',
      siteName: 'WeGrow India Campaign',
      customerName: 'Vikram Patel',
      email: 'vikram@agrisolutions.co',
      phone: '+919822334455',
      type: 'Mentorship Application',
      status: 'Contacted',
      sourceUrl: 'https://wegrowindia.com/mentorship',
      payload: {
        businessStage: 'Early Revenue',
        teamSize: '8 members',
        challenge: 'Scaling sales across regional agriculture cooperatives.',
      },
      notes: [
        {
          id: 'note_2',
          text: 'Connected on WhatsApp. Shared mentor intro sheet.',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          author: 'Admin',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  settings: {
    adminEmail: 'kuhelibusinessstudio@gmail.com',
    adminWhatsApp: '+918287416406',
    webhookUrl: '',
  },
};

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDB(): CRMDatabase {
  ensureDirSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    saveDB(INITIAL_DB);
    return INITIAL_DB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as CRMDatabase;
  } catch (err) {
    console.error('Error reading CRM DB, initializing defaults:', err);
    saveDB(INITIAL_DB);
    return INITIAL_DB;
  }
}

export function saveDB(db: CRMDatabase): void {
  ensureDirSync(DATA_DIR);
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
}

// Sites
export function getSites(): Site[] {
  const db = getDB();
  return db.sites;
}

export function getSiteByApiKey(apiKey: string): Site | undefined {
  const db = getDB();
  return db.sites.find((s) => s.apiKey === apiKey.trim());
}

export function createSite(name: string, domain: string, colorTag = 'teal'): Site {
  const db = getDB();
  const id = `site_${Date.now()}`;
  const apiKey = `omni_live_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
  const site: Site = {
    id,
    name,
    domain,
    apiKey,
    colorTag,
    createdAt: new Date().toISOString(),
    leadCount: 0,
  };
  db.sites.push(site);
  saveDB(db);
  return site;
}

// Leads
export function getLeads(filters?: { siteId?: string; status?: string; search?: string }): Lead[] {
  const db = getDB();
  let list = db.leads;

  if (filters?.siteId && filters.siteId !== 'all') {
    list = list.filter((l) => l.siteId === filters.siteId);
  }

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((l) => l.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (l) =>
        l.customerName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.siteName.toLowerCase().includes(q) ||
        (l.payload?.companyName && String(l.payload.companyName).toLowerCase().includes(q))
    );
  }

  // Sort newest first
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createLead(params: {
  siteId: string;
  customerName: string;
  email: string;
  phone: string;
  type?: string;
  sourceUrl?: string;
  payload?: Record<string, any>;
}): Lead {
  const db = getDB();
  const site = db.sites.find((s) => s.id === params.siteId);

  const newLead: Lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    siteId: params.siteId,
    siteName: site ? site.name : 'Unknown Site',
    customerName: params.customerName || 'Anonymous',
    email: params.email || '',
    phone: params.phone || '',
    type: params.type || 'Form Submission',
    status: 'New',
    sourceUrl: params.sourceUrl,
    payload: params.payload || {},
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.leads.unshift(newLead);

  if (site) {
    site.leadCount = (site.leadCount || 0) + 1;
  }

  saveDB(db);
  return newLead;
}

export function updateLead(id: string, updates: { status?: LeadStatus; note?: string; author?: string }): Lead | null {
  const db = getDB();
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) return null;

  if (updates.status) {
    lead.status = updates.status;
  }

  if (updates.note && updates.note.trim()) {
    lead.notes.push({
      id: `note_${Date.now()}`,
      text: updates.note.trim(),
      createdAt: new Date().toISOString(),
      author: updates.author || 'Admin',
    });
  }

  lead.updatedAt = new Date().toISOString();
  saveDB(db);
  return lead;
}

export function deleteLead(id: string): boolean {
  const db = getDB();
  const index = db.leads.findIndex((l) => l.id === id);
  if (index === -1) return false;

  const lead = db.leads[index];
  db.leads.splice(index, 1);

  const site = db.sites.find((s) => s.id === lead.siteId);
  if (site && site.leadCount > 0) {
    site.leadCount -= 1;
  }

  saveDB(db);
  return true;
}

// Metrics
export function getStats() {
  const db = getDB();
  const totalLeads = db.leads.length;
  const newLeads = db.leads.filter((l) => l.status === 'New').length;
  const contactedLeads = db.leads.filter((l) => l.status === 'Contacted').length;
  const qualifiedLeads = db.leads.filter((l) => l.status === 'Qualified' || l.status === 'Closed').length;

  const conversionRate = totalLeads > 0 ? Math.round(((contactedLeads + qualifiedLeads) / totalLeads) * 100) : 0;

  const siteBreakdown = db.sites.map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    colorTag: s.colorTag,
    leadCount: db.leads.filter((l) => l.siteId === s.id).length,
  }));

  return {
    totalLeads,
    newLeads,
    contactedLeads,
    qualifiedLeads,
    conversionRate,
    activeSites: db.sites.length,
    siteBreakdown,
  };
}
