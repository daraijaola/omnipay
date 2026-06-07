import React, { useState, useEffect } from 'react';
import { Plus, Copy, Check, ArrowRight, History, CreditCard, Activity, DollarSign, Target } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SUPPORTED_CHAINS, formatAddress } from '../utils/chains';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://server-0xmicheal.vercel.app';

export const MerchantDashboard: React.FC = () => {
  const [recipientAddress, setRecipientAddress] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [chain, setChain] = useState<'base' | 'polygon'>('base');
  const [amount, setAmount] = useState('10.00');
  const [description, setDescription] = useState('Consulting Fees');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setError('Please enter a valid EVM address (must start with 0x and be 42 characters)');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const selectedChain = SUPPORTED_CHAINS[chain];
      const token = selectedChain.stablecoins[0].symbol;

      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientAddress,
          chain,
          amount,
          token,
          description,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setCreatedInvoice(data);
        fetchInvoices();
      } else {
        setError(data.error || 'Failed to create invoice');
      }
    } catch (err) {
      setError('Failed to connect to backend server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCheckoutUrl = (id: string) => {
    return `${window.location.origin}?checkout=${id}`;
  };

  // Mock analytics based on fetched invoices
  const totalInvoices = invoices.length;
  const totalVolume = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const successRate = totalInvoices === 0 ? 0 : Math.round((paidCount / totalInvoices) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center">
              <img src="/logo.png" alt="OmniPay Logo" className="h-full w-full object-contain rounded-xl" />
            </div>
            OmniPay 
            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md uppercase tracking-widest mt-1">
              Pro Dashboard
            </span>
          </h1>
          <p className="text-sm text-slate-400">Manage cross-chain invoices. Accept TON, settle in EVM Stablecoins.</p>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Settled Volume</div>
            <div className="text-2xl font-bold text-white">${totalVolume}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
            <Activity className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-white">{totalInvoices}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="h-12 w-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
            <Target className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-medium mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-white">{successRate}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / Success Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 relative">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" /> Create Payment Link
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Settlement Wallet (EVM)</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="custom-input text-sm font-mono"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Target Chain</label>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value as any)}
                    className="custom-input text-sm appearance-none bg-slate-900 border-white/10"
                  >
                    <option value="base">🔵 Base (USDC)</option>
                    <option value="polygon">🟣 Polygon (USDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="custom-input text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="custom-input text-sm"
                  placeholder="e.g. Website Development"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-4"
              >
                {loading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

          {/* Generated Link Popup Card */}
          {createdInvoice && (
            <div className="glass-card p-6 border-indigo-500/40 bg-indigo-950/20 shadow-[0_0_40px_rgba(99,102,241,0.15)] relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/30 to-transparent rounded-bl-full pointer-events-none" />
              
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Check className="h-6 w-6 text-emerald-400" /> Ready to Share!
              </h3>
              <p className="text-sm text-slate-400 mb-6">Your buyer can pay via this link or QR code.</p>

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="bg-white p-2 rounded-xl shrink-0">
                  <QRCodeSVG 
                    value={getCheckoutUrl(createdInvoice.id)} 
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="w-full space-y-3">
                  <div className="truncate text-xs text-indigo-300 font-mono bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
                    {getCheckoutUrl(createdInvoice.id)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(getCheckoutUrl(createdInvoice.id), 'link')}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    {copiedId === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copiedId === 'link' ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={getCheckoutUrl(createdInvoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                >
                  Preview Checkout <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setCreatedInvoice(null)}
                  className="px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-sm font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invoices Log */}
        <div className="lg:col-span-7 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-400" /> Transaction History
            </h2>
            <button onClick={fetchInvoices} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
              Refresh
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm border-2 border-dashed border-white/5 rounded-2xl">
              No invoices created yet.<br/>Generate one to see it here.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {invoices.slice().reverse().map((inv) => (
                <div 
                  key={inv.id}
                  className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between gap-4 hover:bg-white/[0.04] transition group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-base truncate">{inv.description}</span>
                      <span className={inv.chain === 'base' ? 'badge-base' : 'badge-polygon'}>
                        {inv.chain === 'base' ? '🔵 Base' : '🟣 Polygon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono truncate">
                      <span className="truncate">To: {formatAddress(inv.recipientAddress)}</span>
                      <span className="opacity-50">•</span>
                      <span className="shrink-0">{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-white text-lg">${inv.amount}</div>
                      <div className="text-xs text-slate-400 font-bold tracking-wider uppercase">{inv.token}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-24">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider w-full text-center ${
                        inv.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {inv.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      
                      <button
                        onClick={() => copyToClipboard(getCheckoutUrl(inv.id), inv.id)}
                        className="text-[10px] text-slate-400 hover:text-white font-semibold flex items-center justify-center gap-1 w-full opacity-0 group-hover:opacity-100 transition"
                      >
                        {copiedId === inv.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedId === inv.id ? 'Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
