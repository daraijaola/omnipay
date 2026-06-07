import React, { useState, useEffect } from 'react';
import { Plus, Copy, Check, QrCode, ArrowRight, History, CreditCard, Network, Coins } from 'lucide-react';
import { SUPPORTED_CHAINS, formatAddress } from '../utils/chains';

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

  // Fetch past invoices on mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/invoices');
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
      const token = selectedChain.stablecoins[0].symbol; // USDC for base, USDT for polygon

      const response = await fetch('http://localhost:3001/api/invoices', {
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
        fetchInvoices(); // Refresh list
      } else {
        setError(data.error || 'Failed to create invoice');
      }
    } catch (err) {
      setError('Failed to connect to backend server. Make sure it is running on port 3001!');
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-indigo-400" />
            OmniPay <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">Merchant Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400">Generate invoice payment links settled in EVM Stablecoins paid with TON assets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / Success Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 border-white/5 relative">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" /> Create New Invoice
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Recipient EVM Wallet Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="custom-input text-sm"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Settlement Chain</label>
                  <div className="relative">
                    <select
                      value={chain}
                      onChange={(e) => setChain(e.target.value as any)}
                      className="custom-input text-sm appearance-none bg-slate-900 border-white/10"
                    >
                      <option value="base">🔵 Base (USDC)</option>
                      <option value="polygon">🟣 Polygon (USDT)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Requested Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="custom-input text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Invoice Description</label>
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
                className="btn-primary w-full mt-2"
              >
                {loading ? 'Generating...' : 'Create Invoice Link'}
              </button>
            </form>
          </div>

          {/* Generated Link Popup Card */}
          {createdInvoice && (
            <div className="glass-card p-6 border-indigo-500/20 bg-indigo-950/10 shadow-[0_0_20px_rgba(99,102,241,0.1)] relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-bl-full pointer-events-none" />
              
              <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-400" /> Invoice Generated!
              </h3>
              <p className="text-xs text-slate-400 mb-4">Share this checkout URL with your buyer. They can pay instantly with their TON wallet.</p>

              <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-4 mb-4">
                <div className="truncate text-xs text-indigo-300 font-mono">
                  {getCheckoutUrl(createdInvoice.id)}
                </div>
                <button
                  onClick={() => copyToClipboard(getCheckoutUrl(createdInvoice.id), 'link')}
                  className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 hover:bg-indigo-500/20 transition"
                  title="Copy Link"
                >
                  {copiedId === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <a
                  href={getCheckoutUrl(createdInvoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  Open Checkout <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => setCreatedInvoice(null)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invoices Log */}
        <div className="lg:col-span-7 glass-card p-6 border-white/5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-400" /> Invoice Payment Logs
          </h2>

          {invoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No invoices created yet. Fill out the form to start generating checkout links.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div 
                  key={inv.id}
                  className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex items-center justify-between gap-4 hover:border-white/10 transition"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{inv.description}</span>
                      <span className={inv.chain === 'base' ? 'badge-base' : 'badge-polygon'}>
                        {inv.chain === 'base' ? '🔵 Base' : '🟣 Polygon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>To: {formatAddress(inv.recipientAddress)}</span>
                      <span>•</span>
                      <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-white text-sm">${inv.amount}</div>
                      <div className="text-[10px] text-slate-400 font-bold tracking-wider">{inv.token}</div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {inv.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      
                      <button
                        onClick={() => copyToClipboard(getCheckoutUrl(inv.id), inv.id)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 hover:bg-indigo-500/10 transition"
                      >
                        {copiedId === inv.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedId === inv.id ? 'Copied' : 'Link'}
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
