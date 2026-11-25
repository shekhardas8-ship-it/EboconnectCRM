export type LeadStatus = 'New' | 'In Review' | 'Contacted' | 'Qualified' | 'Closed' | 'Archived';

export interface Site {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  createdAt: string;
  colorTag: string;
  leadCount: number;
  description?: string;
  lastLeadAt?: string;
}

export interface LeadNotificationChannelStatus {
  sent: boolean;
  at?: string;
  error?: string;
  recipient?: string;
  provider?: string;
  messageId?: string;
}

export interface LeadNotifications {
  email?: {
    admin?: LeadNotificationChannelStatus;
    customer?: LeadNotificationChannelStatus;
  };
  whatsapp?: {
    admin?: LeadNotificationChannelStatus;
    customer?: LeadNotificationChannelStatus;
  };
}

export interface Lead {
  id: string;
  siteId: string;
  siteName: string;
  customerName: string;
  email: string;
  phone: string;
  type: string;
  status: LeadStatus;
  sourceUrl?: string;
  payload: Record<string, any>;
  notes: Array<{
    id: string;
    text: string;
    createdAt: string;
    author: string;
  }>;
  notifications?: LeadNotifications;
  createdAt: string;
  updatedAt: string;
}

export interface BrevoConfig {
  enabled: boolean;
  apiKey: string;
  senderEmail: string;
  senderName: string;
  notifyAdmin: boolean;
  autoReplyCustomer: boolean;
  adminSubject?: string;
  customerSubject?: string;
}

export interface MetaWhatsAppConfig {
  enabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  wabaId?: string;
  notifyAdmin: boolean;
  autoReplyCustomer: boolean;
  templateName?: string;
}

export interface OpenWAConfig {
  enabled: boolean;
  serverUrl: string; // e.g. http://localhost:8085
  apiKey?: string;
  session?: string;
  notifyAdmin: boolean;
  autoReplyCustomer: boolean;
  adminTemplate?: string;
  customerTemplate?: string;
}

export interface CRMSettings {
  adminEmail: string;
  adminWhatsApp: string;
  webhookUrl?: string;
  whatsappProvider: 'meta_cloud' | 'openwa';
  metaWhatsApp: MetaWhatsAppConfig;
  openwa: OpenWAConfig;
  brevo: BrevoConfig;
}

export interface CRMDatabase {
  sites: Site[];
  leads: Lead[];
  settings: CRMSettings;
}
