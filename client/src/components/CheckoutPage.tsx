import React, { useState, useEffect } from 'react';
import { useTonAddress, useTonConnectUI, TonConnectButton } from '@tonconnect/ui-react';
import { useRfq, useOmniston } from '@ston-fi/omniston-sdk-react';
import { CreditCard, ShieldCheck, AlertCircle, Calendar, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RouteVisualizer } from './RouteVisualizer';
import { formatAddress, SUPPORTED_CHAINS } from '../utils/chains';

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
  const [tonAmountRaw, setTonAmountRaw] = useState<string>('0');

  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const omniston = useOmniston();

  // 1. Fetch invoice details on mount or ID change
  useEffect(() => {
    const fetchInvoice = async () => {
      setLoadingInvoice(true);
      setInvoiceError(null);
      try {
        const res = await fetch(`http://localhost:3001/api/invoices/${invoiceId}`);
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

  // 2. Set status based on wallet connection
  useEffect(() => {
    if (invoice && invoice.status !== 'paid') {
      if (tonAddress) {
        setStatus('quoting');
      } else {
        setStatus('idle');
      }
    }
  }, [tonAddress, invoice]);

  // 3. Define the destination token based on the invoice chain choice
  const getDestinationTokenAddress = () => {
    if (!invoice) return '';
    const selectedChain = SUPPORTED_CHAINS[invoice.chain];
    return selectedChain?.stablecoins[0].address || '';
  };

  const getDestinationChainCase = () => {
    if (!invoice) return 'base';
    return invoice.chain === 'polygon' ? 'polygon' : 'base';
  };

  // 4. Subscribe to the Omniston RFQ Quote stream
  const rfqEnabled = !!invoice && !!tonAddress && status === 'quoting';
  
  const { data: quoteResponse, error: quoteError } = useRfq(
    {
      inputAsset: {
        chain: {
          $case: 'ton',
          value: {
            kind: { $case: 'native' },
          },
        },
      },
      outputAsset: {
        chain: {
          $case: getDestinationChainCase() as any,
          value: {
            kind: {
              $case: 'erc20',
              value: getDestinationTokenAddress(),
            },
          },
        },
      },
      amount: {
        $case: 'outputUnits',
        // USDC/USDT on Base/Polygon have 6 decimals
        value: invoice ? (parseFloat(invoice.amount) * 1_000_000).toString() : '0',
      },
      settlementParams: [
        { params: { $case: 'order', value: {} } },
      ],
    },
    {
      enabled: rfqEnabled,
    }
  );

  const quote = quoteResponse?.$case === 'quoteUpdated' ? quoteResponse.value : null;

  // Track raw TON amount from quote
  useEffect(() => {
    if (quote) {
      setTonAmountRaw(quote.inputUnits);
    }
  }, [quote]);

  // Convert raw nanotons to display TON (nanotons have 9 decimals)
  const displayTonAmount = quote ? (parseFloat(quote.inputUnits) / 1_000_000_000).toFixed(4) : '0.00';

  // 5. Handle the Cross-Chain Swap transaction
  const handlePayment = async () => {
    if (!quote || !tonAddress || !invoice) return;
    setErrorMsg(null);
    setStatus('signing');

    try {
      // Build the swap transaction using Omniston SDK
      const builtTx = await omniston.tonBuildSwap({
        quoteId: quote.quoteId,
        transferSrcAddress: {
          chain: {
            $case: 'ton',
            value: tonAddress,
          },
        },
        traderDstAddress: {
          chain: {
            $case: getDestinationChainCase() as any,
            value: invoice.recipientAddress,
          },
        },
      });

      if (!builtTx || !builtTx.messages || builtTx.messages.length === 0) {
        throw new Error('Failed to construct swap transaction payloads.');
      }

      // Convert built transaction to TonConnect format
      const messages = builtTx.messages.map((msg) => ({
        address: msg.targetAddress,
        amount: msg.sendAmount,
        payload: msg.payload,
        stateInit: msg.jettonWalletStateInit,
      }));

      // Send transaction via TonConnect
      const result = await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 120, // 2 minutes
        messages: messages,
      });

      // Transaction approved by wallet!
      setStatus('settling');
      const hash = result.boc; // TON Connect returns the BoC containing transaction info
      
      // Let's use the hash or slice it for transaction tracking
      const finalHash = hash.substring(0, 64);

      // Settle invoice on backend
      const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: finalHash }),
      });

      if (response.ok) {
        setTxHash(finalHash);
        setStatus('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <span>Fetching payment invoice...</span>
      </div>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">{invoiceError || 'This payment link is invalid.'}</p>
        <button onClick={onBackToMerchant} className="btn-primary">
          Go to Merchant Dashboard
        </button>
      </div>
    );
  }

  const selectedChain = SUPPORTED_CHAINS[invoice.chain];

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      {/* Back Button */}
      <button 
        onClick={onBackToMerchant}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 transition"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Dashboard
      </button>

      {/* Main Payment Card */}
      <div className="glass-card border-white/5 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-indigo-500/15 blur-2xl pointer-events-none" />

        {/* Invoice Summary */}
        <div className="p-6 border-b border-white/5 text-center">
          <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1">{invoice.description}</div>
          <div className="text-4xl font-extrabold text-white mb-2">
            ${invoice.amount} <span className="text-sm font-semibold text-slate-400">{invoice.token}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className={invoice.chain === 'base' ? 'badge-base' : 'badge-polygon'}>
              Settled to {selectedChain.name}
            </span>
          </div>
        </div>

        {/* Route Details and Wallet Connection */}
        <div className="p-6 space-y-6">
          {status !== 'success' && (
            <>
              {/* Wallet Connection */}
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/60 border border-white/5 rounded-2xl">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">Your TON Wallet</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {tonAddress ? formatAddress(tonAddress) : 'Not connected'}
                  </div>
                </div>
                <TonConnectButton />
              </div>

              {/* Error messages */}
              {(errorMsg || quoteError) && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{errorMsg || 'Failed to stream price quote. Check network connection.'}</div>
                </div>
              )}

              {/* Quote details */}
              {tonAddress && (
                <div className="space-y-4">
                  {/* Route visualization */}
                  <RouteVisualizer
                    fromChain="TON"
                    toChain={selectedChain.name}
                    fromSymbol="TON"
                    toSymbol={invoice.token}
                    isStreaming={status === 'quoting' && !quoteError}
                    status={status}
                  />

                  {/* Pricing break-down */}
                  <div className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Rate:</span>
                      <span className="font-semibold text-white">
                        {quote ? `1 TON ≈ ${(parseFloat(invoice.amount) / parseFloat(displayTonAmount)).toFixed(4)} ${invoice.token}` : 'Fetching...'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total TON Required:</span>
                      <span className="font-bold text-indigo-400 text-sm">
                        {quote ? `${displayTonAmount} TON` : 'Fetching...'}
                      </span>
                    </div>
                    {quote && quote.resolverName && (
                      <div className="flex justify-between items-center border-t border-white/5 pt-2.5 text-[10px]">
                        <span className="text-slate-400">Aggregator:</span>
                        <span className="text-indigo-300 font-bold">{quote.resolverName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              {tonAddress && (
                <button
                  onClick={handlePayment}
                  disabled={!quote || status === 'signing' || status === 'settling'}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  {status === 'signing' && (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Approve in Wallet...
                    </>
                  )}
                  {status === 'settling' && (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Swapping & Settling...
                    </>
                  )}
                  {status === 'quoting' && (
                    <>
                      Pay {displayTonAmount} TON <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Success Screen */}
          {status === 'success' && (
            <div className="text-center py-6 space-y-6 animate-scaleUp">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Invoice Paid!</h3>
                <p className="text-xs text-slate-400">Funds swapped and settled to merchant destination wallet.</p>
              </div>

              <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl space-y-3 text-left text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-semibold">Payment Method:</span>
                  <span className="text-white font-bold">TON Swap</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-semibold">Settle Dest:</span>
                  <span className="text-white font-mono">{formatAddress(invoice.recipientAddress, 6)}</span>
                </div>
                {txHash && (
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400 font-semibold">Transaction Proof:</span>
                    <span className="text-indigo-400 font-mono truncate max-w-[150px]">{txHash}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Settled Date:</span>
                  <span className="text-white">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={onBackToMerchant}
                className="w-full py-3 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Return to Merchant Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
