import { useState, useEffect } from 'react';
import { MerchantDashboard } from './components/MerchantDashboard';
import { CheckoutPage } from './components/CheckoutPage';
import { CreditCard, Github } from 'lucide-react';

function App() {
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Header */}
      <nav className={`nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div 
          onClick={handleBackToMerchant}
          className="brand cursor-pointer"
        >
          <img src="/logo.png" alt="OmniPay Logo" className="brand-mark" style={{filter: 'invert(1)'}} />
          <span className="brand-word">OMNIPAY</span>
        </div>
        <div className="nav-actions ml-auto">
          <div className="net-chip hidden sm:inline-flex">
            <i></i>
            Mainnet
          </div>
          <TonConnectButton className="!ml-2" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col pt-24 relative z-10">
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
