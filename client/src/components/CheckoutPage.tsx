import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonConnectUI, TonConnectButton } from '@tonconnect/ui-react';
import { useRfq, useOmniston } from '@ston-fi/omniston-sdk-react';
import { ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, ChevronLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RouteVisualizer } from './RouteVisualizer';
import { formatAddress, SUPPORTED_CHAINS } from '../utils/chains';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://server-0xmicheal.vercel.app';

interface CheckoutPageProps {
  invoiceId: string;
  onBackToMerchant: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ invoiceId, onBackToMerchant }) => {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'quoting' | 'signing' | 'settling' | 'success'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const omniston = useOmniston();

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoadingInvoice(true);
      setInvoiceError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}`);
        if (!res.ok) {
          throw new Error('Invoice not found');
        }
        const data = await res.json();
        setInvoice(data);
        if (data.status === 'paid') {
          setStatus('success');
          setTxHash(data.txHash);
        }
      } catch (err: any) {
        setInvoiceError(err.message || 'Failed to load invoice');
      } finally {
        setLoadingInvoice(false);
      }
    };
    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (invoice && invoice.status !== 'paid') {
      if (tonAddress) {
        setStatus('quoting');
      } else {
        setStatus('idle');
      }
    }
  }, [tonAddress, invoice]);

  const getDestinationTokenAddress = () => {
    if (!invoice) return '';
    const selectedChain = SUPPORTED_CHAINS[invoice.chain];
    return selectedChain?.stablecoins[0].address || '';
  };

  const getDestinationChainCase = () => {
    if (!invoice) return 'base';
    return invoice.chain === 'polygon' ? 'polygon' : 'base';
  };

  const rfqEnabled = !!invoice && !!tonAddress && status === 'quoting';
  
  const { data: quoteResponse, error: quoteError } = useRfq(
    {
      inputAsset: { chain: { $case: 'ton', value: { kind: { $case: 'native' } } } },
      outputAsset: { chain: { $case: getDestinationChainCase() as any, value: { kind: { $case: 'erc20', value: getDestinationTokenAddress() } } } },
      amount: { $case: 'outputUnits', value: invoice ? (parseFloat(invoice.amount) * 1_000_000).toString() : '0' },
      settlementParams: [{ params: { $case: 'order', value: {} } }],
    },
    { enabled: rfqEnabled }
  );

  const quote = quoteResponse?.$case === 'quoteUpdated' ? quoteResponse.value : null;
  const displayTonAmount = quote ? (parseFloat(quote.inputUnits) / 1_000_000_000).toFixed(4) : '0.00';

  const handlePayment = async () => {
    if (!quote || !tonAddress || !invoice) return;
    setErrorMsg(null);
    setStatus('signing');

    try {
      const builtTx = await omniston.tonBuildSwap({
        quoteId: quote.quoteId,
        transferSrcAddress: { chain: { $case: 'ton', value: tonAddress } },
        traderDstAddress: { chain: { $case: getDestinationChainCase() as any, value: invoice.recipientAddress } },
      });

      if (!builtTx || !builtTx.messages || builtTx.messages.length === 0) {
        throw new Error('Failed to construct swap transaction payloads.');
      }

      const messages = builtTx.messages.map((msg) => ({
        address: msg.targetAddress,
        amount: msg.sendAmount,
        payload: msg.payload,
        stateInit: msg.jettonWalletStateInit,
      }));

      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 120,
        messages: messages,
      });

      setStatus('settling');
      const hash = result.boc;
      const finalHash = hash.substring(0, 64);

      const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: finalHash }),
      });

      if (response.ok) {
        setTxHash(finalHash);
        setStatus('success');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        throw new Error('Failed to record payment on server');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Transaction was cancelled or failed.');
      setStatus('quoting');
    }
  };

  if (loadingInvoice) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-64 space-y-4">
          <div className="h-40 w-full bg-soft/30 animate-pulse border border-line rounded-[10px]" />
          <div className="h-12 w-full bg-soft/30 animate-pulse border border-line rounded-[10px]" />
          <div className="h-20 w-full bg-soft/30 animate-pulse border border-line rounded-[10px]" />
        </div>
      </div>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 text-center relative z-10">
        <div className="h-16 w-16 rounded-[10px] bg-red-50 border border-red-200 flex items-center justify-center text-down mx-auto mb-6 shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">Invoice Not Found</h2>
        <p className="text-muted mb-8 font-mono text-sm">{invoiceError || 'This payment link is invalid.'}</p>
        <button onClick={onBackToMerchant} className="btn btn--dark w-full">
          Go back to Merchant
        </button>
      </div>
    );
  }

  const selectedChain = SUPPORTED_CHAINS[invoice.chain];

  const ActionButton = () => (
    <button
      onClick={handlePayment}
      disabled={!quote || status === 'signing' || status === 'settling'}
      className="btn btn--dark w-full py-4 flex items-center justify-center gap-2 text-[15px]"
    >
      {status === 'signing' && <div className="h-5 w-5 border-2 border-paper border-t-transparent rounded-[10px] animate-spin" />}
      {status === 'settling' && <div className="h-5 w-5 border-2 border-paper border-t-transparent rounded-[10px] animate-spin" />}
      
      {status === 'signing' ? 'Approve in Wallet...' 
        : status === 'settling' ? 'Swapping & Settling...' 
        : `Pay ${displayTonAmount} TON`}
      
      {status === 'quoting' && <ArrowRight className="h-5 w-5 ml-1" />}
    </button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 relative z-10 checkout-container">
      <button 
        onClick={onBackToMerchant}
        className="flex items-center gap-2 text-sm font-bold font-mono uppercase text-muted hover:text-ink mb-8 transition group"
      >
        <div className="p-1 rounded-[5px] border border-line group-hover:bg-line-soft transition">
          <ChevronLeft className="h-4 w-4" />
        </div>
        Cancel Payment
      </button>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center py-12"
          >
            <div className="h-20 w-20 bg-signal/20 border border-signal rounded-[10px] flex items-center justify-center text-up mx-auto mb-6 shadow-veritas">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-3xl font-extrabold text-ink mb-3">Payment Complete</h3>
            <p className="text-muted mb-8 font-mono text-sm">Funds successfully swapped and settled to the merchant's destination wallet.</p>

            <div className="paper-card p-6 text-left space-y-4 mb-8 bg-white">
              <div className="flex justify-between border-b border-line-soft pb-3">
                <span className="mono-label">Amount Paid</span>
                <span className="text-ink font-bold text-lg">${invoice.amount}</span>
              </div>
              <div className="flex justify-between border-b border-line-soft pb-3">
                <span className="mono-label">Destination</span>
                <span className="text-ink font-mono text-sm">{formatAddress(invoice.recipientAddress, 8)}</span>
              </div>
              {txHash && (
                <div className="flex justify-between border-b border-line-soft pb-3">
                  <span className="mono-label">Receipt Hash</span>
                  <span className="text-ink font-mono text-sm truncate max-w-[160px]">{txHash}</span>
                </div>
              )}
            </div>

            <button onClick={onBackToMerchant} className="btn btn--dark w-full py-4 text-sm">
              Return to Merchant
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="checkout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
          >
            {/* Left Column - Invoice Summary */}
            <div className="space-y-6">
              <div className="paper-card p-8 relative overflow-hidden bg-white shadow-veritas border-[1.5px] border-ink/20">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                  <Lock className="h-32 w-32" />
                </div>
                
                <div className="mono-label mb-3">{invoice.description}</div>
                <div className="text-5xl font-extrabold text-ink mb-6 tracking-tight">
                  ${invoice.amount} <span className="text-xl font-mono font-bold text-muted">{invoice.token}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <span className="text-[10px] font-bold px-2 py-1 border border-line rounded uppercase tracking-wider text-muted bg-paper-solid">
                    Settles to {selectedChain.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-1 border border-signal rounded uppercase tracking-wider text-ink bg-signal/20 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Secure Checkout
                  </span>
                </div>

                {tonAddress && (
                  <div className="mt-4 border-t border-line pt-6">
                    <h4 className="mono-label mb-4">Cross-Chain Route</h4>
                    <div className="opacity-80">
                      <RouteVisualizer
                        fromChain="TON"
                        toChain={selectedChain.name}
                        fromSymbol="TON"
                        toSymbol={invoice.token}
                        isStreaming={status === 'quoting' && !quoteError}
                        status={status}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Payment Controls */}
            <div className="space-y-6">
              <div className="paper-card p-6 space-y-6 bg-white border-[1.5px] border-ink/10">
                <div className="flex items-center justify-between gap-4 p-4 bg-paper border border-line rounded-[10px]">
                  <div>
                    <div className="mono-label !text-[10px] mb-1">Payment Wallet</div>
                    <div className="text-xs text-ink font-bold font-mono">
                      {tonAddress ? formatAddress(tonAddress) : 'Connect your TON wallet'}
                    </div>
                  </div>
                  <TonConnectButton />
                </div>

                {(errorMsg || quoteError) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-50 border border-red-200 rounded-[10px] text-down text-sm font-bold flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="font-mono">{errorMsg || 'Failed to stream price quote. Check network connection.'}</div>
                  </motion.div>
                )}

                {tonAddress && (
                  <div className="space-y-4">
                    <div className="p-5 bg-paper border border-line rounded-[10px]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="mono-label !text-sm">Total Due</span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-ink block font-mono">
                            {quote ? `${displayTonAmount} TON` : <span className="inline-block w-24 h-8 bg-line-soft rounded animate-pulse" />}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center justify-between w-full mt-4 pt-4 border-t border-line text-xs font-bold font-mono uppercase text-muted hover:text-ink transition"
                      >
                        Transaction Details
                        {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      <AnimatePresence>
                        {showDetails && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-3 font-mono text-xs">
                              <div className="flex justify-between text-muted">
                                <span>Exchange Rate</span>
                                <span className="text-ink font-bold">{quote ? `1 TON ≈ ${(parseFloat(invoice.amount) / parseFloat(displayTonAmount)).toFixed(4)} ${invoice.token}` : '-'}</span>
                              </div>
                              <div className="flex justify-between text-muted">
                                <span>Network Fee</span>
                                <span className="text-ink font-bold">Included</span>
                              </div>
                              <div className="flex justify-between text-muted">
                                <span>Routing</span>
                                <span className="text-ink font-bold">{quote?.resolverName || 'Omniston'}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="hidden md:block">
                      <ActionButton />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Action Bar for Mobile */}
      {tonAddress && status !== 'success' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-paper/90 backdrop-blur-md border-t border-line z-50">
          <ActionButton />
        </div>
      )}
    </div>
  );
};
