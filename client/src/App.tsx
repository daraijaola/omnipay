import { useState, useEffect } from 'react';
import { MerchantDashboard } from './components/MerchantDashboard';
import { CheckoutPage } from './components/CheckoutPage';
import { CreditCard, Github } from 'lucide-react';

function App() {
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  // Check URL params for checkout query
  useEffect(() => {
    const checkParams = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('checkout');
      setCheckoutId(id);
    };

    checkParams();
    window.addEventListener('popstate', checkParams);
    return () => window.removeEventListener('popstate', checkParams);
  }, []);

  const handleBackToMerchant = () => {
    // Clear URL query
    window.history.pushState({}, '', window.location.origin);
    setCheckoutId(null);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-hidden">
      {/* Background Glows */}
      <div className="glowing-bg-accent top-12 left-12" />
      <div className="glowing-bg-accent bottom-24 right-12" style={{ animationDelay: '-4s', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0, 0, 0, 0) 70%)' }} />

      {/* Header */}
      <header className="w-full border-b border-white/5 bg-slate-950/20 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
        <div 
          onClick={handleBackToMerchant}
          className="flex items-center gap-2.5 cursor-pointer text-white font-extrabold text-lg tracking-wide"
        >
          <img src="/logo.png" alt="OmniPay Logo" className="h-8 w-8 object-contain rounded-lg" />
          <span>OmniPay</span>
        </div>
        
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/ston-fi/omniston-sdk"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            <Github className="h-4 w-4" /> SDK Docs
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow z-10">
        {checkoutId ? (
          <CheckoutPage 
            invoiceId={checkoutId} 
            onBackToMerchant={handleBackToMerchant} 
          />
        ) : (
          <MerchantDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-slate-950/10 py-6 text-center text-xs text-slate-500 z-10">
        <div>OmniPay Cross-Chain Checkout • Built for STON.fi Vibe Coding Hackathon</div>
      </footer>
    </div>
  );
}

export default App;
