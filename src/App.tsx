import { useState, useEffect } from 'react';
import { 
  Users, Globe, TrendingUp, Inbox, Search, Filter, 
  MessageSquare, Mail, Phone, Calendar, ExternalLink, 
  Plus, Check, Copy, Trash2, Edit3, Shield, LogOut, 
  RefreshCw, CheckCircle2, Clock, AlertCircle, ChevronDown, 
  Download, ArrowUpRight, Send, Smartphone, Zap, Eye, EyeOff, Bell,
  Layers, Code, Terminal, FileText
} from 'lucide-react';
import { Lead, Site, LeadStatus, CRMSettings } from '@/lib/types';

export default function CRMPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // CRM Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<CRMSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leads' | 'sites' | 'settings'>('leads');

  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  
  // Single Site Modal
  const [isNewSiteModalOpen, setIsNewSiteModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSiteColor, setNewSiteColor] = useState('teal');

  // Bulk / Multiple Sites Modal
  const [isBulkSiteModalOpen, setIsBulkSiteModalOpen] = useState(false);
  const [bulkSitesText, setBulkSitesText] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Site Integration Code Modal
  const [selectedIntegrationSite, setSelectedIntegrationSite] = useState<Site | null>(null);
  const [integrationMethod, setIntegrationMethod] = useState<'tracker' | 'webhook' | 'wix' | 'fetch'>('tracker');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Settings & Automation states
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [testWaLoading, setTestWaLoading] = useState(false);
  const [testWaResult, setTestWaResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [testMetaWaLoading, setTestMetaWaLoading] = useState(false);
  const [testMetaWaResult, setTestMetaWaResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Check initial login token
  useEffect(() => {
    const token = localStorage.getItem('omni_crm_session');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, sitesRes, statsRes, settingsRes] = await Promise.all([
        fetch(`/api/v1/leads?siteId=${selectedSite}&status=${selectedStatus}&search=${encodeURIComponent(searchQuery)}`),
        fetch('/api/v1/sites'),
        fetch('/api/v1/stats'),
        fetch('/api/v1/settings'),
      ]);

      const leadsData = await leadsRes.json();
      const sitesData = await sitesRes.json();
      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();

      if (leadsData.success) setLeads(leadsData.leads);
      if (sitesData.success) setSites(sitesData.sites);
      if (statsData.success) setStats(statsData.stats);
      if (settingsData.success) setSettings(settingsData.settings);
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, selectedSite, selectedStatus, searchQuery]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('omni_crm_session', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch {
      setLoginError('Login request failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omni_crm_session');
    setIsAuthenticated(false);
  };

  // Status Change
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        if (selectedLead?.id === leadId) setSelectedLead(data.lead);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Add Note
  const handleAddNote = async (leadId: string) => {
    if (!newNoteText.trim()) return;
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNoteText.trim(), author: 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        setSelectedLead(data.lead);
        setNewNoteText('');
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        if (selectedLead?.id === leadId) setSelectedLead(null);
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  // Create Single Site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteDomain) return;
    try {
      const res = await fetch('/api/v1/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName, domain: newSiteDomain, colorTag: newSiteColor }),
      });
      const data = await res.json();
      if (data.success) {
        setSites((prev) => [...prev, data.site]);
        setIsNewSiteModalOpen(false);
        setNewSiteName('');
        setNewSiteDomain('');
        fetchData();
      }
    } catch (err) {
      console.error('Error adding site:', err);
    }
  };

  // Batch Create Multiple Sites
  const handleBatchCreateSites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSitesText.trim()) return;

    // Parse lines: Name, Domain OR Name - Domain
    const lines = bulkSitesText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsedSites: Array<{ name: string; domain: string }> = [];

    for (const line of lines) {
      const parts = line.includes(',') ? line.split(',') : line.split('-');
      if (parts.length >= 2) {
        parsedSites.push({
          name: parts[0].trim(),
          domain: parts[1].trim(),
        });
      } else if (line.includes('.')) {
        // e.g. mysite.com -> Name: mysite.com, Domain: mysite.com
        parsedSites.push({
          name: line.trim(),
          domain: line.trim(),
        });
      }
    }

    if (parsedSites.length === 0) {
      alert('Please enter at least one site in the format: Site Name, domain.com');
      return;
    }

    try {
      setBulkSubmitting(true);
      const res = await fetch('/api/v1/sites/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites: parsedSites }),
      });
      const data = await res.json();
      if (data.success) {
        setSites((prev) => [...prev, ...data.sites]);
        setIsBulkSiteModalOpen(false);
        setBulkSitesText('');
        fetchData();
        alert(`🎉 Successfully connected ${data.sites.length} websites to Central CRM!`);
      } else {
        alert(`Error: ${data.error || 'Failed to add sites'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Delete Site
  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`Are you sure you want to remove "${siteName}" from Central CRM?`)) return;
    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSites((prev) => prev.filter((s) => s.id !== siteId));
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting site:', err);
    }
  };

  // Regenerate Site API Key
  const handleRegenerateKey = async (siteId: string) => {
    if (!confirm('Regenerating this key will invalidate the previous key. Continue?')) return;
    try {
      const res = await fetch(`/api/v1/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateKey: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSites((prev) => prev.map((s) => (s.id === siteId ? data.site : s)));
        if (selectedIntegrationSite?.id === siteId) {
          setSelectedIntegrationSite(data.site);
        }
      }
    } catch (err) {
      console.error('Error regenerating key:', err);
    }
  };

  // Jump to leads filtered by site
  const handleFilterBySite = (siteId: string) => {
    setSelectedSite(siteId);
    setActiveTab('leads');
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSaveSuccessMsg('Automated push settings saved successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Brevo Email
  const handleTestBrevo = async () => {
    if (!settings?.brevo?.apiKey) {
      setTestEmailResult({ success: false, msg: 'Please enter your Brevo API Key first.' });
      return;
    }
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/v1/notifications/test-brevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.brevo.apiKey,
          senderEmail: settings.brevo.senderEmail,
          senderName: settings.brevo.senderName,
          toEmail: settings.adminEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ success: true, msg: `Test email sent to ${settings.adminEmail}!` });
      } else {
        setTestEmailResult({ success: false, msg: data.error || 'Failed to dispatch test email' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, msg: err.message || 'Connection failed' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  // Test Meta WhatsApp Cloud API
  const handleTestMetaWhatsApp = async () => {
    if (!settings?.metaWhatsApp?.phoneNumberId || !settings?.metaWhatsApp?.accessToken) {
      setTestMetaWaResult({ success: false, msg: 'Please enter both Phone Number ID and Access Token.' });
      return;
    }
    setTestMetaWaLoading(true);
    setTestMetaWaResult(null);
    try {
      const res = await fetch('/api/v1/notifications/test-meta-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: settings.metaWhatsApp.phoneNumberId,
          accessToken: settings.metaWhatsApp.accessToken,
          toPhone: settings.adminWhatsApp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestMetaWaResult({
          success: true,
          msg: `WhatsApp test message dispatched to ${settings.adminWhatsApp} via Meta Cloud API!`,
        });
      } else {
        setTestMetaWaResult({
          success: false,
          msg: data.error || 'Failed to dispatch test message via Meta Cloud API',
        });
      }
    } catch (err: any) {
      setTestMetaWaResult({ success: false, msg: err.message || 'Connection failed' });
    } finally {
      setTestMetaWaLoading(false);
    }
  };

  // Test OpenWA WhatsApp
  const handleTestOpenWA = async () => {
    if (!settings?.adminWhatsApp) {
      setTestWaResult({ success: false, msg: 'Please specify Primary Admin WhatsApp number.' });
      return;
    }
    setTestWaLoading(true);
    setTestWaResult(null);
    try {
      const res = await fetch('/api/v1/notifications/test-openwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: settings.openwa.serverUrl,
          apiKey: settings.openwa.apiKey,
          toPhone: settings.adminWhatsApp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestWaResult({ success: true, msg: `WhatsApp test dispatched to ${settings.adminWhatsApp} via OpenWA!` });
      } else {
        setTestWaResult({
          success: false,
          msg: data.error || `Could not connect to OpenWA at ${settings.openwa.serverUrl}. Ensure "npm run openwa" is running.`,
        });
      }
    } catch (err: any) {
      setTestWaResult({ success: false, msg: err.message || 'Connection failed' });
    } finally {
      setTestWaLoading(false);
    }
  };

  // Resend Notifications for a specific Lead
  const handleResendNotifications = async (leadId: string) => {
    setResendingId(leadId);
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/resend`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
        if (selectedLead?.id === leadId) setSelectedLead(data.lead);
        alert('✅ WhatsApp and Email notifications re-pushed successfully!');
      } else {
        alert(`⚠️ Resend result: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      alert(`⚠️ Resend failed: ${err.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportToCSV = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Website', 'Name', 'Email', 'Phone', 'Type', 'Status', 'Date'];
    const rows = leads.map((l) => [
      l.id,
      `"${l.siteName}"`,
      `"${l.customerName}"`,
      l.email,
      l.phone,
      `"${l.type}"`,
      l.status,
      new Date(l.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-teal-500/30 rounded-2xl p-8 backdrop-blur shadow-2xl text-white">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center text-slate-950 mb-4 shadow-lg shadow-teal-500/20">
              <Globe className="w-9 h-9" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">OmniCRM</h1>
            <p className="text-teal-200/70 text-sm mt-1">Multi-Site Customer &amp; Inquiries Central</p>
          </div>

          {loginError && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs uppercase font-semibold text-teal-300/80 tracking-wider block mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="kuhelibusinessstudio@gmail.com"
                required
                className="w-full bg-slate-800/80 border border-teal-500/30 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-semibold text-teal-300/80 tracking-wider block mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-800/80 border border-teal-500/30 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-teal-500/25 mt-2"
            >
              Sign In to Central CRM
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            Default Admin: kuhelibusinessstudio@gmail.com
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                OmniCRM Central
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">
                  Multi-Site Hub
                </span>
              </h1>
              <p className="text-xs text-slate-400">Aggregating Inquiries Across All Connected Websites</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync Active
            </div>

            <button
              onClick={fetchData}
              title="Sync Data"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-slate-200">Admin Account</p>
                <p className="text-[11px] text-teal-400">kuhelibusinessstudio@gmail.com</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-red-400 hover:bg-red-950/40 border border-red-900/40 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-header Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 border-t border-slate-800/80 text-sm">
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-3 font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'leads'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Unified Submissions ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('sites')}
            className={`py-3 font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sites'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Connected Websites ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === 'settings'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Auto-Push (Brevo &amp; OpenWA)
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Submissions</span>
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{stats.totalLeads}</p>
              <p className="text-xs text-slate-500 mt-1">Aggregated from all sites</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Needs Action</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-amber-600">{stats.newLeads}</p>
              <p className="text-xs text-slate-500 mt-1">Pending first contact</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Contacted / Engaged</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-600">{stats.contactedLeads}</p>
              <p className="text-xs text-slate-500 mt-1">Under conversation</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Connected Sites</span>
                <Globe className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-600">{stats.activeSites}</p>
              <p className="text-xs text-slate-500 mt-1">Live feeding channels</p>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 1: UNIFIED LEADS LIST */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Filter & Action Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, phone, company..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Website Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-teal-500"
                  >
                    <option value="all">All Connected Sites ({sites.length})</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.leadCount || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-teal-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In Review">In Review</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                {selectedSite !== 'all' && (
                  <button
                    onClick={() => setSelectedSite('all')}
                    className="text-xs text-teal-600 hover:underline font-semibold"
                  >
                    Clear Filter
                  </button>
                )}
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Leads Table / Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                  Loading aggregated submissions...
                </div>
              ) : leads.length === 0 ? (
                <div className="py-20 text-center">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-bold text-lg">No submissions found</p>
                  <p className="text-slate-400 text-sm">Any submissions from your connected sites will immediately appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leads.map((lead) => {
                    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                    const waText = encodeURIComponent(`Hi ${lead.customerName}, this is regarding your submission on ${lead.siteName}!`);
                    const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                    const emailPushed = lead.notifications?.email?.admin?.sent;
                    const waPushed = lead.notifications?.whatsapp?.admin?.sent;

                    return (
                      <div
                        key={lead.id}
                        className="p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-slate-900">{lead.customerName}</span>
                            
                            {/* Website Origin Badge */}
                            <button
                              onClick={() => handleFilterBySite(lead.siteId)}
                              title="Filter submissions for this website"
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition"
                            >
                              <Globe className="w-3 h-3" />
                              {lead.siteName}
                            </button>

                            {/* Submission Type */}
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                              {lead.type}
                            </span>

                            {/* Automated Push Badges */}
                            <span
                              title={emailPushed ? 'Brevo Email Pushed Automatically' : 'Email Notification Pending/Not configured'}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                emailPushed
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <Mail className="w-3 h-3" />
                              {emailPushed ? 'Brevo Sent' : 'Email'}
                            </span>

                            <span
                              title={waPushed ? 'OpenWA WhatsApp Pushed Automatically' : 'WhatsApp Notification Pending/Not configured'}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                waPushed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <Smartphone className="w-3 h-3" />
                              {waPushed ? 'OpenWA Sent' : 'WA'}
                            </span>

                            {/* Company Name if present */}
                            {lead.payload?.companyName && (
                              <span className="text-xs text-slate-500 font-medium">
                                • {lead.payload.companyName}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-teal-600">
                                <Mail className="w-3.5 h-3.5" />
                                {lead.email}
                              </a>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {lead.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </span>
                          </div>
                        </div>

                        {/* Actions & Status */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Status Dropdown */}
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                              lead.status === 'New'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : lead.status === 'Contacted'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : lead.status === 'In Review'
                                ? 'bg-purple-50 text-purple-700 border-purple-300'
                                : lead.status === 'Qualified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            <option value="New">New</option>
                            <option value="In Review">In Review</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Closed">Closed</option>
                          </select>

                          {/* Quick 1-Click WhatsApp Button */}
                          {lead.phone && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              WhatsApp
                            </a>
                          )}

                          {/* Quick Email Button */}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Email
                            </a>
                          )}

                          {/* View Full Payload Modal Trigger */}
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                          >
                            View Details
                          </button>

                          {/* Delete Lead */}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: CONNECTED WEBSITES & MULTI-SITE INGESTION */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Globe className="w-6 h-6 text-teal-600" />
                  Connected Websites Manager
                </h2>
                <p className="text-sm text-slate-500">
                  Connect multiple landing pages, client portals, and e-commerce stores to collect all their inquiries into Central CRM.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkSiteModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  <Layers className="w-4 h-4 text-teal-400" />
                  Add Multiple Sites (Bulk)
                </button>

                <button
                  onClick={() => setIsNewSiteModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Connect Website
                </button>
              </div>
            </div>

            {/* Sites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sites.map((site) => (
                <div key={site.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                        <h3 className="font-bold text-lg text-slate-900">{site.name}</h3>
                      </div>
                      <a
                        href={`https://${site.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-teal-600 hover:underline flex items-center gap-1 mt-0.5 ml-4"
                      >
                        {site.domain}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200">
                        {site.leadCount || 0} Submissions
                      </span>

                      <button
                        onClick={() => handleDeleteSite(site.id, site.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                        title="Delete Website"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* API Key box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span>Website Ingestion API Key</span>
                      <button
                        onClick={() => handleRegenerateKey(site.id)}
                        className="text-[10px] text-teal-600 hover:underline font-semibold"
                      >
                        Regenerate
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs text-slate-800 font-mono font-medium truncate">
                        {site.apiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(site.apiKey)}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1 text-xs font-semibold flex-shrink-0"
                        title="Copy Key"
                      >
                        {copiedKey === site.apiKey ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === site.apiKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions for this site */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      onClick={() => handleFilterBySite(site.id)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      View All {site.leadCount || 0} Leads
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setSelectedIntegrationSite(site)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      <Code className="w-3.5 h-3.5 text-teal-400" />
                      Get Embed Code &amp; Webhook
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ingestion Methods Overview */}
            <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Code className="w-5 h-5 text-teal-400" />
                    3 Ways to Collect Information From Multiple Sites:
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect any number of websites. When any visitor submits any form on any connected site, Central CRM records it and automatically fires Brevo emails and OpenWA WhatsApp alerts!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-teal-400 block uppercase">1. Universal 1-Line Script</span>
                  <p className="text-xs text-slate-400">
                    Add 1 script tag into your website. It auto-detects any HTML, WordPress, Wix, or Webflow form submissions automatically!
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-teal-400 block uppercase">2. Direct Webhook URL</span>
                  <p className="text-xs text-slate-400">
                    Paste <code>http://localhost:4004/api/v1/webhook/:apiKey</code> directly into Elementor, Contact Form 7, Typeform, or Zapier.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-teal-400 block uppercase">3. REST API Ingestion</span>
                  <p className="text-xs text-slate-400">
                    Send clean JSON via fetch/axios from custom React, Next.js, Node.js, Python, or Wix Velo backend code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: AUTO-PUSH (BREVO & OPENWA) SETTINGS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Zap className="w-6 h-6 text-teal-600" />
                  Automated Push Dispatcher
                </h2>
                <p className="text-sm text-slate-500">
                  Instantly push WhatsApp (via <strong>OpenWA</strong>) and Transactional Emails (via <strong>Brevo</strong>) when any lead connects to Central CRM from any site.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50"
                >
                  {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save All Settings
                </button>
              </div>
            </div>

            {saveSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Notification Admin Destinations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-600" />
                Primary Admin Alert Destinations
              </h3>
              <p className="text-xs text-slate-500">
                Where should the CRM send instant notifications when any site receives a lead?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Admin Notification Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={settings.adminEmail}
                      onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                      required
                      placeholder="admin@yourcompany.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Receives lead details alert via Brevo.</span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Admin Notification WhatsApp Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={settings.adminWhatsApp}
                      onChange={(e) => setSettings({ ...settings, adminWhatsApp: e.target.value })}
                      required
                      placeholder="+918287416406"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Receives formatted WhatsApp message via OpenWA.</span>
                </div>
              </div>
            </div>

            {/* INTEGRATION 1: BREVO (BRAVO) EMAIL */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center text-blue-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Brevo (Sendinblue) Email Automation</h3>
                    <p className="text-xs text-slate-500">Official transactional email engine with 99.8% inbox delivery.</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.brevo?.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        brevo: { ...settings.brevo, enabled: e.target.checked },
                      })
                    }
                    className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500"
                  />
                  <span className="text-sm font-bold text-slate-800">
                    {settings.brevo?.enabled ? 'Automation Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Brevo API Key (v3)
                  </label>
                  <div className="relative">
                    <input
                      type={showBrevoKey ? 'text' : 'password'}
                      value={settings.brevo?.apiKey || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, apiKey: e.target.value },
                        })
                      }
                      placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBrevoKey(!showBrevoKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Get from Brevo Dashboard → SMTP &amp; API → API Keys.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Verified Sender Email
                  </label>
                  <input
                    type="email"
                    value={settings.brevo?.senderEmail || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        brevo: { ...settings.brevo, senderEmail: e.target.value },
                      })
                    }
                    placeholder="kuhelibusinessstudio@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Must be a verified sender in your Brevo account.</span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.brevo?.senderName || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        brevo: { ...settings.brevo, senderName: e.target.value },
                      })
                    }
                    placeholder="ScaleRoute Central CRM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-500 block">Automatic Email Rules</span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.brevo?.notifyAdmin !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, notifyAdmin: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">Push instant lead alert email to Admin</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.brevo?.autoReplyCustomer !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          brevo: { ...settings.brevo, autoReplyCustomer: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-700">Send branded confirmation email to Customer</span>
                  </label>
                </div>
              </div>

              {/* Test Button & Result */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestBrevo}
                  disabled={testEmailLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                >
                  {testEmailLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Test Brevo Email
                </button>

                {testEmailResult && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                      testEmailResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testEmailResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                    {testEmailResult.msg}
                  </span>
                )}
              </div>
            </div>

            {/* INTEGRATION 2: WHATSAPP AUTOMATION (META CLOUD API & OPENWA) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center text-emerald-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">WhatsApp Push Automation</h3>
                    <p className="text-xs text-slate-500">Push instant WhatsApp alerts to Admin and greetings to leads.</p>
                  </div>
                </div>

                {/* Provider Selector */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, whatsappProvider: 'meta_cloud' })}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      settings.whatsappProvider !== 'openwa'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚀 Meta Cloud API (Official)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, whatsappProvider: 'openwa' })}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      settings.whatsappProvider === 'openwa'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📱 OpenWA (Self-Hosted)
                  </button>
                </div>
              </div>

              {/* A. META WHATSAPP CLOUD API CONFIGURATION */}
              {settings.whatsappProvider !== 'openwa' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        Meta WhatsApp Cloud API Configuration
                      </span>
                      <span className="text-xs text-slate-500">
                        Official Meta Developer Platform • 1,000 free conversation sessions every month.
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.metaWhatsApp?.enabled !== false}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaWhatsApp: { ...settings.metaWhatsApp, enabled: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        {settings.metaWhatsApp?.enabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        Meta Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={settings.metaWhatsApp?.phoneNumberId || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaWhatsApp: { ...settings.metaWhatsApp, phoneNumberId: e.target.value },
                          })
                        }
                        placeholder="e.g. 104859628475928"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">From Meta App Dashboard → WhatsApp → API Setup.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        Meta Access Token (System or Temporary)
                      </label>
                      <div className="relative">
                        <input
                          type={showMetaToken ? 'text' : 'password'}
                          value={settings.metaWhatsApp?.accessToken || ''}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              metaWhatsApp: { ...settings.metaWhatsApp, accessToken: e.target.value },
                            })
                          }
                          placeholder="EAAG... (Permanent System User Token)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMetaToken(!showMetaToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">Use a permanent System User Token for 24/7 production.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        WhatsApp Business Account ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={settings.metaWhatsApp?.wabaId || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaWhatsApp: { ...settings.metaWhatsApp, wabaId: e.target.value },
                          })
                        }
                        placeholder="e.g. 109283746592019"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        Approved Template Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={settings.metaWhatsApp?.templateName || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            metaWhatsApp: { ...settings.metaWhatsApp, templateName: e.target.value },
                          })
                        }
                        placeholder="e.g. lead_acknowledgment"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Leave blank to send standard formatted text alerts.</span>
                    </div>
                  </div>

                  {/* Rules Toggles */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500 block">Automatic Meta WhatsApp Rules</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.metaWhatsApp?.notifyAdmin !== false}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              metaWhatsApp: { ...settings.metaWhatsApp, notifyAdmin: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-xs font-semibold text-slate-700">Push WhatsApp alert to Admin on every new lead</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.metaWhatsApp?.autoReplyCustomer !== false}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              metaWhatsApp: { ...settings.metaWhatsApp, autoReplyCustomer: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-xs font-semibold text-slate-700">Send automated WhatsApp greeting to Customer</span>
                      </label>
                    </div>
                  </div>

                  {/* Meta Cloud Setup Instructions */}
                  <div className="bg-blue-950 text-blue-100 border border-blue-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-blue-300">
                      <Zap className="w-4 h-4" />
                      How to get free Meta WhatsApp Cloud API credentials in 3 minutes:
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-blue-200/90 text-xs">
                      <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline font-bold text-white">developers.facebook.com</a> → <strong>Create App</strong> → Select <strong>Other / Business</strong>.</li>
                      <li>In your app dashboard, scroll down to <strong>WhatsApp</strong> and click <strong>Set up</strong>.</li>
                      <li>Copy the <strong>Phone Number ID</strong> and <strong>Temporary Access Token</strong> into the inputs above.</li>
                      <li>For production 24/7 access, create a <strong>System User</strong> in Meta Business Suite → System Users to generate a permanent token.</li>
                    </ol>
                  </div>

                  {/* Test Meta Cloud WhatsApp Button */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestMetaWhatsApp}
                      disabled={testMetaWaLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                    >
                      {testMetaWaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Test WhatsApp via Meta Cloud API
                    </button>

                    {testMetaWaResult && (
                      <span
                        className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                          testMetaWaResult.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {testMetaWaResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                        {testMetaWaResult.msg}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* B. OPENWA CONFIGURATION (ALTERNATIVE) */}
              {settings.whatsappProvider === 'openwa' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        OpenWA (Self-Hosted WhatsApp Web)
                      </span>
                      <span className="text-xs text-slate-500">
                        Autonomous local gateway via Open-WA REST server.
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.openwa?.enabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            openwa: { ...settings.openwa, enabled: e.target.checked },
                          })
                        }
                        className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        {settings.openwa?.enabled ? 'Automation Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        OpenWA Server URL
                      </label>
                      <input
                        type="text"
                        value={settings.openwa?.serverUrl || 'http://localhost:8085'}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            openwa: { ...settings.openwa, serverUrl: e.target.value },
                          })
                        }
                        placeholder="http://localhost:8085"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Local port (8085) or hosted OpenWA URL.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                        OpenWA API Key / Session Token (Optional)
                      </label>
                      <input
                        type="password"
                        value={settings.openwa?.apiKey || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            openwa: { ...settings.openwa, apiKey: e.target.value },
                          })
                        }
                        placeholder="Optional secret token"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">Leave empty if no auth header is required on OpenWA.</span>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500 block">Automatic WhatsApp Rules</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.openwa?.notifyAdmin !== false}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              openwa: { ...settings.openwa, notifyAdmin: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-xs font-semibold text-slate-700">Push WhatsApp alert to Admin on every new lead</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.openwa?.autoReplyCustomer !== false}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              openwa: { ...settings.openwa, autoReplyCustomer: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-xs font-semibold text-slate-700">Send automated WhatsApp greeting to Customer</span>
                      </label>
                    </div>
                  </div>

                  {/* How to run OpenWA Server box */}
                  <div className="bg-emerald-950 text-emerald-100 border border-emerald-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <Smartphone className="w-4 h-4" />
                      Quick-Start OpenWA Server on Port 8085:
                    </div>
                    <p className="text-emerald-200/80">
                      A built-in OpenWA service is ready in this project. You can run it in a second terminal:
                    </p>
                    <div className="flex items-center justify-between bg-emerald-900/60 p-2.5 rounded-lg font-mono text-emerald-300 text-xs border border-emerald-700">
                      <code>npm run openwa</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('npm run openwa')}
                        className="text-emerald-400 hover:text-emerald-200 font-sans text-xs underline font-semibold"
                      >
                        {copiedKey === 'npm run openwa' ? 'Copied!' : 'Copy command'}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-300/70">
                      It operates out-of-the-box in Gateway/Sandbox mode, or syncs live phone WhatsApp via <code>@open-wa/wa-automate</code>.
                    </p>
                  </div>

                  {/* Test WhatsApp Button & Result */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestOpenWA}
                      disabled={testWaLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                    >
                      {testWaLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Test WhatsApp Message
                    </button>

                    {testWaResult && (
                      <span
                        className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                          testWaResult.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {testWaResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                        {testWaResult.msg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: VIEW LEAD FULL DETAILS */}
      {/* ---------------------------------------------------- */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 mb-2 inline-block">
                  {selectedLead.siteName}
                </span>
                <h3 className="text-2xl font-bold text-slate-900">{selectedLead.customerName}</h3>
                <p className="text-xs text-slate-500">{selectedLead.type} • ID: {selectedLead.id}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">Email:</span>
                <span className="text-slate-900 font-medium">{selectedLead.email || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">Phone:</span>
                <span className="text-slate-900 font-medium font-mono">{selectedLead.phone || 'N/A'}</span>
              </div>
            </div>

            {/* Automation Dispatch Log Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs uppercase font-bold text-teal-300 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Automated Push Dispatch Log
                </span>
                <button
                  type="button"
                  onClick={() => handleResendNotifications(selectedLead.id)}
                  disabled={resendingId === selectedLead.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${resendingId === selectedLead.id ? 'animate-spin' : ''}`} />
                  Re-push Notifications
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Brevo Email Status */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-400" />
                      Brevo Email:
                    </span>
                    <span
                      className={`font-bold ${
                        selectedLead.notifications?.email?.admin?.sent
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {selectedLead.notifications?.email?.admin?.sent ? 'Dispatched' : 'Pending / Skipped'}
                    </span>
                  </div>
                  {selectedLead.notifications?.email?.admin?.recipient && (
                    <span className="text-[10px] text-slate-500 block truncate">
                      To: {selectedLead.notifications.email.admin.recipient}
                    </span>
                  )}
                  {selectedLead.notifications?.email?.admin?.error && (
                    <span className="text-[10px] text-red-400 block mt-1">
                      Error: {selectedLead.notifications.email.admin.error}
                    </span>
                  )}
                </div>

                {/* OpenWA WhatsApp Status */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-emerald-400" />
                      OpenWA WhatsApp:
                    </span>
                    <span
                      className={`font-bold ${
                        selectedLead.notifications?.whatsapp?.admin?.sent
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {selectedLead.notifications?.whatsapp?.admin?.sent ? 'Dispatched' : 'Pending / Skipped'}
                    </span>
                  </div>
                  {selectedLead.notifications?.whatsapp?.admin?.recipient && (
                    <span className="text-[10px] text-slate-500 block truncate">
                      To: {selectedLead.notifications.whatsapp.admin.recipient}
                    </span>
                  )}
                  {selectedLead.notifications?.whatsapp?.admin?.error && (
                    <span className="text-[10px] text-red-400 block mt-1">
                      Error: {selectedLead.notifications.whatsapp.admin.error}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Payload Fields */}
            <div>
              <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Submitted Form Details</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                {Object.entries(selectedLead.payload || {}).map(([key, val]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-1 border-b border-slate-200/60 last:border-0">
                    <span className="font-semibold text-slate-600 min-w-[140px] capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}:
                    </span>
                    <span className="text-slate-900 whitespace-pre-line font-medium flex-1">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h4 className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Internal Team Notes</h4>
              <div className="space-y-2 mb-3">
                {selectedLead.notes && selectedLead.notes.length > 0 ? (
                  selectedLead.notes.map((n) => (
                    <div key={n.id} className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 text-xs">
                      <p className="text-slate-800">{n.text}</p>
                      <span className="text-[10px] text-teal-700/70 block mt-1">
                        {n.author} • {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No notes added yet.</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Type an internal note..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
                />
                <button
                  onClick={() => handleAddNote(selectedLead.id)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: CONNECT SINGLE WEBSITE */}
      {/* ---------------------------------------------------- */}
      {isNewSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600" />
                Connect a New Website
              </h3>
              <button onClick={() => setIsNewSiteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1">Website Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Second Wix Store"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1">Domain URL</label>
                <input
                  type="text"
                  placeholder="e.g. mystore.com"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSiteModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Generate API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: BATCH ADD MULTIPLE SITES */}
      {/* ---------------------------------------------------- */}
      {isBulkSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  Connect Multiple Websites (Bulk)
                </h3>
                <p className="text-xs text-slate-500">Add multiple landing pages and sites in one go.</p>
              </div>
              <button onClick={() => setIsBulkSiteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchCreateSites} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1">
                  Enter Sites (1 per line)
                </label>
                <textarea
                  rows={6}
                  value={bulkSitesText}
                  onChange={(e) => setBulkSitesText(e.target.value)}
                  placeholder={`ScaleRoute Wix, scaleroute.in\nWeGrow India, wegrowindia.com\nFintech Landing, fintechleads.in\nHealthcare Campaign, healthclinic.co`}
                  required
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-teal-500 leading-relaxed"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Format: <code>Site Name, domain.com</code> on each line.
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                💡 Central CRM will automatically generate unique API keys and direct webhook ingestion URLs for all of them!
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkSiteModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm disabled:opacity-50"
                >
                  {bulkSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add All Websites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: SITE INTEGRATION CODE & EMBED OPTIONS */}
      {/* ---------------------------------------------------- */}
      {selectedIntegrationSite && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 mb-1 inline-block">
                  Site: {selectedIntegrationSite.name}
                </span>
                <h3 className="text-xl font-bold text-slate-900">How to Collect Leads From this Site</h3>
                <p className="text-xs text-slate-500">Domain: {selectedIntegrationSite.domain}</p>
              </div>
              <button onClick={() => setSelectedIntegrationSite(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Method Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setIntegrationMethod('tracker')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  integrationMethod === 'tracker'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⚡ 1-Line Universal Script (Easiest)
              </button>
              <button
                onClick={() => setIntegrationMethod('webhook')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  integrationMethod === 'webhook'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔗 Direct Webhook URL
              </button>
              <button
                onClick={() => setIntegrationMethod('wix')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  integrationMethod === 'wix'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Wix Velo
              </button>
              <button
                onClick={() => setIntegrationMethod('fetch')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  integrationMethod === 'fetch'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                JavaScript Fetch / API
              </button>
            </div>

            {/* Method Content */}
            {integrationMethod === 'tracker' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Paste this 1-line script tag into your website header or footer (WordPress, HTML, Webflow, Shopify, Wix Custom Code). It <strong>automatically listens to any form on the page</strong> and pushes the inquiry to Central CRM!
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
{`<script src="http://localhost:4004/api/v1/tracker.js" data-site-key="${selectedIntegrationSite.apiKey}"></script>`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`<script src="http://localhost:4004/api/v1/tracker.js" data-site-key="${selectedIntegrationSite.apiKey}"></script>`)}
                    className="absolute top-3 right-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copied!' : 'Copy Script'}
                  </button>
                </div>
              </div>
            )}

            {integrationMethod === 'webhook' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Use this direct Webhook URL for form builders like <strong>Elementor Forms Webhook action</strong>, <strong>Contact Form 7</strong>, <strong>Typeform</strong>, <strong>Webflow</strong>, or <strong>Zapier/Make</strong>.
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
{`http://localhost:4004/api/v1/webhook/${selectedIntegrationSite.apiKey}`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`http://localhost:4004/api/v1/webhook/${selectedIntegrationSite.apiKey}`)}
                    className="absolute top-3 right-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copied!' : 'Copy Webhook URL'}
                  </button>
                </div>
              </div>
            )}

            {integrationMethod === 'wix' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  In your Wix Velo front-end or backend page code:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
{`import { fetch } from 'wix-fetch';

export async function submitToCentralCRM(formData) {
  return await fetch('http://localhost:4004/api/v1/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-site-api-key': '${selectedIntegrationSite.apiKey}'
    },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      type: 'Pitch Deck / Inquiry',
      details: formData
    })
  });
}`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`await fetch('http://localhost:4004/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-site-api-key': '${selectedIntegrationSite.apiKey}'
  },
  body: JSON.stringify(formData)
});`)}
                    className="absolute top-3 right-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copied!' : 'Copy Snippet'}
                  </button>
                </div>
              </div>
            )}

            {integrationMethod === 'fetch' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Standard fetch request for any React, Next.js, Node.js, or HTML site:
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
{`fetch('http://localhost:4004/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-site-api-key': '${selectedIntegrationSite.apiKey}'
  },
  body: JSON.stringify({
    name: 'Customer Name',
    email: 'customer@example.com',
    phone: '+919876543210',
    type: 'Inquiry',
    sourceUrl: window.location.href,
    details: {
      message: 'Looking for consultation...',
      budget: '₹5,00,000'
    }
  })
});`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`fetch('http://localhost:4004/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-site-api-key': '${selectedIntegrationSite.apiKey}'
  },
  body: JSON.stringify({
    name: 'Customer Name',
    email: 'customer@example.com',
    phone: '+919876543210',
    type: 'Inquiry'
  })
});`)}
                    className="absolute top-3 right-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedIntegrationSite(null)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
