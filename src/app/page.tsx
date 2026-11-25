'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Globe, TrendingUp, Inbox, Search, Filter, 
  MessageSquare, Mail, Phone, Calendar, ExternalLink, 
  Plus, Check, Copy, Trash2, Edit3, Shield, LogOut, 
  RefreshCw, CheckCircle2, Clock, AlertCircle, ChevronDown, 
  Download, ArrowUpRight
} from 'lucide-react';
import { Lead, Site, LeadStatus } from '@/lib/types';

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
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leads' | 'sites' | 'settings'>('leads');

  // Modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isNewSiteModalOpen, setIsNewSiteModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      const [leadsRes, sitesRes, statsRes] = await Promise.all([
        fetch(`/api/v1/leads?siteId=${selectedSite}&status=${selectedStatus}&search=${encodeURIComponent(searchQuery)}`),
        fetch('/api/v1/sites'),
        fetch('/api/v1/stats'),
      ]);

      const leadsData = await leadsRes.json();
      const sitesData = await sitesRes.json();
      const statsData = await statsRes.json();

      if (leadsData.success) setLeads(leadsData.leads);
      if (sitesData.success) setSites(sitesData.sites);
      if (statsData.success) setStats(statsData.stats);
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

  // Create Site
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteDomain) return;
    try {
      const res = await fetch('/api/v1/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName, domain: newSiteDomain }),
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
            <p className="text-teal-200/70 text-sm mt-1">Multi-Site Customer & Inquiries Central</p>
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
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-teal-500/20 mt-2"
            >
              Sign In to Central CRM
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Secure admin portal for all connected websites & digital assets
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-slate-950 shadow-md shadow-teal-500/30">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
                OmniCRM
              </span>
              <span className="text-xs text-teal-400 ml-2 font-mono bg-teal-950/80 border border-teal-800/80 px-2 py-0.5 rounded-full">
                Multi-Site Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-3 py-1.5 rounded-full">
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
            <Shield className="w-4 h-4" />
            Alerts & Ingestion API
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
                    <option value="all">All Connected Sites</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
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
                    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
                    const waText = encodeURIComponent(`Hi ${lead.customerName}, this is regarding your submission on ${lead.siteName}!`);
                    const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

                    return (
                      <div
                        key={lead.id}
                        className="p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-slate-900">{lead.customerName}</span>
                            
                            {/* Website Origin Badge */}
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                              <Globe className="w-3 h-3" />
                              {lead.siteName}
                            </span>

                            {/* Submission Type */}
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                              {lead.type}
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
        {/* TAB 2: CONNECTED WEBSITES & INTEGRATION */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Connected Websites</h2>
                <p className="text-sm text-slate-500">Each website uses its dedicated API key to send leads directly to this central CRM.</p>
              </div>
              <button
                onClick={() => setIsNewSiteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Connect New Website
              </button>
            </div>

            {/* Sites Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {sites.map((site) => (
                <div key={site.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{site.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{site.domain}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                      {site.leadCount || 0} Submissions
                    </span>
                  </div>

                  <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Site Ingestion API Key:</span>
                      <button
                        onClick={() => copyToClipboard(site.apiKey)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      >
                        {copiedKey === site.apiKey ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Key
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-xs font-mono text-slate-800 break-all select-all block">
                      {site.apiKey}
                    </code>
                  </div>

                  <div className="text-xs text-slate-400">
                    Connected on: {new Date(site.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Integration Snippet Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-teal-300">How to Connect Any Website</h3>
                  <p className="text-sm text-slate-400">Add this simple snippet to any form submission on Wix, WordPress, or custom sites:</p>
                </div>
              </div>

              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-teal-300 overflow-x-auto">
{`// Example: Put this inside your Wix form or frontend submit handler:
await fetch('http://localhost:3001/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-site-api-key': 'YOUR_COPIED_SITE_API_KEY'
  },
  body: JSON.stringify({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    type: 'Pitch Deck', // or 'Event Registration', 'Contact'
    details: formData   // Any custom fields you want to track
  })
});`}
              </pre>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: NOTIFICATIONS & SETTINGS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Notification & Alert Settings</h2>
              <p className="text-sm text-slate-500">Configure where automated alerts are dispatched when new leads arrive.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Primary Admin Email
                </label>
                <input
                  type="email"
                  defaultValue="kuhelibusinessstudio@gmail.com"
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium"
                />
                <span className="text-xs text-slate-400 mt-1 block">Receives instant email alerts for all connected sites.</span>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                  Primary Admin WhatsApp
                </label>
                <input
                  type="text"
                  defaultValue="+918287416406"
                  readOnly
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium"
                />
                <span className="text-xs text-slate-400 mt-1 block">Used for 1-click WhatsApp alerts and webhook dispatches.</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL: VIEW LEAD FULL DETAILS */}
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
      {/* MODAL: CONNECT NEW WEBSITE */}
      {/* ---------------------------------------------------- */}
      {isNewSiteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Connect a New Website</h3>
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
    </div>
  );
}
