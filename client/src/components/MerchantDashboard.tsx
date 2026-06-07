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
          description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const invoice = await response.json();
      setCreatedInvoice(invoice);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getCheckoutUrl = (id: string) => {
    return `${window.location.origin}?checkout=${id}`;
  };

  const totalInvoices = invoices.length;
  const totalVolume = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + parseFloat(curr.amount), 0).toFixed(2);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const successRate = totalInvoices === 0 ? 0 : Math.round((paidCount / totalInvoices) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 relative z-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink mb-2 flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center">
              <img src="/logo.png" alt="OmniPay Logo" className="h-full w-full object-contain rounded-xl" style={{filter: 'invert(1)'}} />
            </div>
            OmniPay 
            <span className="text-[10px] font-bold bg-signal/20 text-ink border border-signal px-2 py-0.5 rounded-md uppercase tracking-widest mt-1">
              Pro Dashboard
            </span>
          </h1>
          <p className="text-sm text-muted">Manage cross-chain invoices. Accept TON, settle in EVM Stablecoins.</p>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="paper-card p-6 flex items-center gap-4 hover:shadow-veritas transition-all">
          <div className="h-12 w-12 bg-white border border-line rounded-[10px] flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-ink" />
          </div>
          <div>
            <div className="mono-label mb-1">Settled Volume</div>
            <div className="text-2xl font-bold text-ink">${totalVolume}</div>
          </div>
        </div>
        <div className="paper-card p-6 flex items-center gap-4 hover:shadow-veritas transition-all">
          <div className="h-12 w-12 bg-white border border-line rounded-[10px] flex items-center justify-center">
            <Activity className="h-6 w-6 text-ink" />
          </div>
          <div>
            <div className="mono-label mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-ink">{totalInvoices}</div>
          </div>
        </div>
        <div className="paper-card p-6 flex items-center gap-4 hover:shadow-veritas transition-all">
          <div className="h-12 w-12 bg-white border border-line rounded-[10px] flex items-center justify-center">
            <Target className="h-6 w-6 text-ink" />
          </div>
          <div>
            <div className="mono-label mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-ink">{successRate}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form / Success Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="paper-card p-6 relative bg-white">
            <h2 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
              <Plus className="h-5 w-5 text-ink" /> Create Payment Link
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-[10px] text-down text-sm font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-5">
              <div>
                <label className="mono-label block mb-2">Settlement Wallet (EVM)</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="custom-input"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mono-label block mb-2">Target Chain</label>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value as any)}
                    className="custom-input appearance-none bg-white"
                  >
                    <option value="base">🔵 Base (USDC)</option>
                    <option value="polygon">🟣 Polygon (USDT)</option>
                  </select>
                </div>
                <div>
                  <label className="mono-label block mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="custom-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mono-label block mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="custom-input"
                  placeholder="e.g. Website Development"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn--dark w-full mt-4"
              >
                {loading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

          {/* Generated Link Popup Card */}
          {createdInvoice && (
            <div className="paper-card p-6 border-signal bg-signal/10 shadow-veritas relative overflow-hidden animate-fadeIn">
              <h3 className="text-xl font-bold text-ink mb-2 flex items-center gap-2">
                <Check className="h-6 w-6 text-up" /> Ready to Share!
              </h3>
              <p className="text-sm text-muted mb-6">Your buyer can pay via this link or QR code.</p>

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 bg-white p-4 rounded-[10px] border border-line shadow-sm">
                <div className="bg-white p-2 border border-line rounded-[10px] shrink-0">
                  <QRCodeSVG 
                    value={getCheckoutUrl(createdInvoice.id)} 
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="w-full space-y-3">
                  <div className="truncate text-xs text-ink font-mono bg-paper p-3 rounded-[7px] border border-line">
                    {getCheckoutUrl(createdInvoice.id)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(getCheckoutUrl(createdInvoice.id), 'link')}
                    className="btn w-full !text-[11px] !py-[8px]"
                  >
                    {copiedId === 'link' ? <Check className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
                    {copiedId === 'link' ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={getCheckoutUrl(createdInvoice.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--signal flex-1"
                >
                  Preview Checkout <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setCreatedInvoice(null)}
                  className="btn"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invoices Log */}
        <div className="lg:col-span-7 paper-card p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <History className="h-5 w-5 text-ink" /> Transaction History
            </h2>
            <button onClick={fetchInvoices} className="text-xs font-mono uppercase font-bold text-ink hover:text-muted transition">
              Refresh
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm border-2 border-dashed border-line rounded-[10px]">
              No invoices created yet.<br/>Generate one to see it here.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {invoices.slice().reverse().map((inv) => (
                <div 
                  key={inv.id}
                  className="p-4 bg-paper border border-line rounded-[10px] flex items-center justify-between gap-4 hover:shadow-sm transition group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-ink text-base truncate">{inv.description}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-line rounded uppercase tracking-wider text-muted bg-white">
                        {inv.chain === 'base' ? '🔵 Base' : '🟣 Polygon'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted font-mono truncate">
                      <span className="truncate">To: {formatAddress(inv.recipientAddress)}</span>
                      <span className="opacity-50">•</span>
                      <span className="shrink-0">{new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-ink text-lg">${inv.amount}</div>
                      <div className="mono-label">{inv.token}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-24">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-[5px] uppercase tracking-wider w-full text-center ${
                        inv.status === 'paid' 
                          ? 'bg-up/10 text-up border border-up/20' 
                          : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                      }`}>
                        {inv.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      
                      <button
                        onClick={() => copyToClipboard(getCheckoutUrl(inv.id), inv.id)}
                        className="text-[10px] text-muted hover:text-ink font-semibold flex items-center justify-center gap-1 w-full opacity-0 group-hover:opacity-100 transition"
                      >
                        {copiedId === inv.id ? <Check className="h-3 w-3 text-up" /> : <Copy className="h-3 w-3" />}
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
