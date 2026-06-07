import React from 'react';
import { Wallet, Server, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface RouteVisualizerProps {
  fromChain: string;
  toChain: string;
  fromSymbol: string;
  toSymbol: string;
  isStreaming: boolean;
  status?: 'idle' | 'quoting' | 'signing' | 'settling' | 'success';
}

export const RouteVisualizer: React.FC<RouteVisualizerProps> = ({
  fromChain,
  toChain,
  fromSymbol,
  toSymbol,
  isStreaming,
  status = 'idle',
}) => {
  return (
    <div className="w-full py-6 px-4 bg-slate-950/40 rounded-2xl border border-white/5 relative overflow-hidden">
      {/* Glow Effect */}
      {isStreaming && (
        <div className="absolute inset-0 bg-indigo-500/5 blur-xl pointer-events-none transition-opacity duration-500" />
      )}

      <div className="text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase flex items-center justify-between">
        <span>HTLC Cross-Chain Swap Path</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
            Live streaming quotes
          </span>
        )}
      </div>

      <div className="flex items-center justify-between relative z-10 gap-2">
        {/* Step 1: TON Wallet */}
        <div className="flex flex-col items-center flex-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            status === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : status === 'signing'
              ? 'bg-indigo-500/10 border-indigo-400 text-indigo-400 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'bg-indigo-950/40 border-white/10 text-indigo-400'
          }`}>
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold mt-2 text-white">{fromChain}</span>
          <span className="text-[9px] text-slate-400 font-medium">{fromSymbol}</span>
        </div>

        {/* Path Line 1 */}
        <div className="flex-1 h-8 flex items-center justify-center relative min-w-[30px]">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <path
              d="M 0 16 L 80 16"
              fill="none"
              stroke={isStreaming ? '#6366f1' : 'rgba(255,255,255,0.08)'}
              strokeWidth="2"
              className={isStreaming ? 'animated-route-path' : ''}
              style={{ strokeDasharray: isStreaming ? '8,4' : 'none' }}
            />
          </svg>
          {isStreaming && (
            <div className="absolute text-[9px] bg-slate-900 border border-indigo-500/30 px-1 rounded text-indigo-300 font-bold -top-1">
              RFQ
            </div>
          )}
        </div>

        {/* Step 2: STON.fi Aggregator */}
        <div className="flex flex-col items-center flex-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
              : isStreaming
              ? 'bg-indigo-500/10 border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'bg-slate-900/60 border-white/10 text-slate-500'
          }`}>
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold mt-2 text-white">Omniston</span>
          <span className="text-[9px] text-slate-400 font-medium">Resolvers</span>
        </div>

        {/* Path Line 2 */}
        <div className="flex-1 h-8 flex items-center justify-center relative min-w-[30px]">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <path
              d="M 0 16 L 80 16"
              fill="none"
              stroke={status === 'settling' || status === 'success' ? '#a855f7' : 'rgba(255,255,255,0.08)'}
              strokeWidth="2"
              className={status === 'settling' ? 'animated-route-path' : ''}
              style={{ strokeDasharray: status === 'settling' ? '8,4' : 'none' }}
            />
          </svg>
          {(status === 'settling' || status === 'success') && (
            <div className="absolute text-[9px] bg-slate-900 border border-purple-500/30 px-1 rounded text-purple-300 font-bold -top-1">
              Swap
            </div>
          )}
        </div>

        {/* Step 3: Destination Merchant Wallet */}
        <div className="flex flex-col items-center flex-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : status === 'settling'
              ? 'bg-purple-500/10 border-purple-400 text-purple-400 animate-pulse'
              : 'bg-slate-900/60 border-white/10 text-slate-500'
          }`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold mt-2 text-white">{toChain}</span>
          <span className="text-[9px] text-slate-400 font-medium">{toSymbol}</span>
        </div>
      </div>
    </div>
  );
};
