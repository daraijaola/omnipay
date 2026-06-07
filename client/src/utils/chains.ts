export interface ChainInfo {
  id: 'base' | 'polygon';
  name: string;
  icon: string;
  color: string;
  rpcUrl?: string;
  explorerUrl: string;
  stablecoins: {
    symbol: 'USDC' | 'USDT';
    address: string;
    decimals: number;
  }[];
}

export const SUPPORTED_CHAINS: Record<string, ChainInfo> = {
  base: {
    id: 'base',
    name: 'Base',
    icon: '🔵',
    color: '#0052FF',
    explorerUrl: 'https://basescan.org',
    stablecoins: [
      {
        symbol: 'USDC',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        decimals: 6,
      },
    ],
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    icon: '🟣',
    color: '#8247E5',
    explorerUrl: 'https://polygonscan.com',
    stablecoins: [
      {
        symbol: 'USDT',
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
        decimals: 6,
      },
    ],
  },
};

export const TON_CHAIN = {
  name: 'TON',
  icon: '💎',
  color: '#0098EA',
  decimals: 9,
};

export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};
