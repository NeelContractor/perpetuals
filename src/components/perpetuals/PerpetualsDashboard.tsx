"use client"
import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target,
  AlertTriangle,
  Coins,
  Activity,
  Settings,
  Plus,
  Edit,
  DollarSign,
  LogIn,
  LogOut,
  Zap,
  RefreshCw,
  Shield,
  Users,
  Info
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { WalletButton } from '../solana/solana-provider';
import { ThemeSelect } from '../theme-select';
import { usePerpetualsProgram } from './perpetuals-data-access';

// Type definitions
interface InitializeArgs {
  minSignatures: number;
  admins: PublicKey[];
  adminPubkey: PublicKey;
}

interface AddPoolArgs {
  poolName: string;
  authorityPubkey: PublicKey;
}

interface AddCustodyArgs {
  poolName: string;
  mint: PublicKey;
  isStable: boolean;
  oracleType: { none: {} } | { pyth: {} } | { custom: {} };
  initialPrice: number;
  authorityPubkey: PublicKey;
}

interface UpdatePriceArgs {
  poolName: string;
  mint: PublicKey;
  newPrice: number;
  authorityPubkey: PublicKey;
}

interface AddLiquidityArgs {
  poolName: string;
  mint: PublicKey;
  amountIn: number;
  minLpAmountOut: number;
  ownerPubkey: PublicKey;
  fundingAccount: PublicKey;
  lpTokenAccount: PublicKey;
}

interface OpenPositionArgs {
  poolName: string;
  mint: PublicKey;
  side: { long: {} } | { short: {} };
  collateralAmount: number;
  leverage: number;
  acceptablePrice: number;
  ownerPubkey: PublicKey;
  collateralAccount: PublicKey;
  oracleAccount: PublicKey;
}

// Utility functions
const formatNumber = (num: number, decimals = 2) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

const formatPrice = (price: any) => {
  if (!price) return '$0.00';
  return `$${formatNumber(price / 1e6, 4)}`;
};

const formatTokenAmount = (amount: any, decimals = 6) => {
  if (!amount) return '0';
  return formatNumber(amount / Math.pow(10, decimals));
};

const truncateAddress = (address: PublicKey | string) => {
  if (!address) return '';
  const str = address.toString();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Form Components
const Input = ({ label, value, onChange, type = "text", placeholder = "", disabled = false }: {
  label: string,
  value: string,
  onChange: (value: string) => void,
  type?: string,
  placeholder?: string,
  disabled?: boolean
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>
);

const Select = ({ label, value, onChange, options, disabled = false }: {
  label: string,
  value: string,
  onChange: (value: string) => void,
  options: { value: string, label: string }[],
  disabled?: boolean
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </div>
);

// Admin Forms
const InitializeForm = ({ onSubmit, isLoading }: { onSubmit: (data: InitializeArgs) => void, isLoading: boolean }) => {
  const [minSignatures, setMinSignatures] = useState('1');
  const [adminAddress, setAdminAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const adminPubkey = new PublicKey(adminAddress);
      onSubmit({
        minSignatures: parseInt(minSignatures),
        admins: [adminPubkey],
        adminPubkey
      });
    } catch (error) {
      alert('Invalid admin address format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Minimum Signatures"
        value={minSignatures}
        onChange={setMinSignatures}
        type="number"
        placeholder="1"
      />
      <Input
        label="Admin Address"
        value={adminAddress}
        onChange={setAdminAddress}
        placeholder="Enter admin public key"
      />
      <button
        type="submit"
        disabled={isLoading || !adminAddress}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Initializing...' : 'Initialize Program'}
      </button>
    </form>
  );
};

const AddPoolForm = ({ onSubmit, isLoading }: { onSubmit: (data: AddPoolArgs) => void, isLoading: boolean }) => {
  const [poolName, setPoolName] = useState('');
  const [authorityAddress, setAuthorityAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authorityPubkey = new PublicKey(authorityAddress);
      onSubmit({
        poolName,
        authorityPubkey
      });
      setPoolName('');
      setAuthorityAddress('');
    } catch (error) {
      alert('Invalid authority address format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Pool Name"
        value={poolName}
        onChange={setPoolName}
        placeholder="Enter pool name (max 64 chars)"
      />
      <Input
        label="Authority Address"
        value={authorityAddress}
        onChange={setAuthorityAddress}
        placeholder="Enter authority public key"
      />
      <button
        type="submit"
        disabled={isLoading || !poolName || !authorityAddress}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Adding Pool...' : 'Add Pool'}
      </button>
    </form>
  );
};

const AddCustodyForm = ({ onSubmit, isLoading, pools }: { onSubmit: (data: AddCustodyArgs) => void, isLoading: boolean, pools: any[] }) => {
  const [poolName, setPoolName] = useState('');
  const [mintAddress, setMintAddress] = useState('');
  const [isStable, setIsStable] = useState('false');
  const [oracleType, setOracleType] = useState('none');
  const [initialPrice, setInitialPrice] = useState('1000000');
  const [authorityAddress, setAuthorityAddress] = useState('');

  const poolOptions = pools.map(pool => ({
    value: pool.account?.name || '',
    label: pool.account?.name || 'Unnamed Pool'
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mint = new PublicKey(mintAddress);
      const authorityPubkey = new PublicKey(authorityAddress);
      
      let oracleTypeObj;
      switch (oracleType) {
        case 'pyth':
          oracleTypeObj = { pyth: {} };
          break;
        case 'custom':
          oracleTypeObj = { custom: {} };
          break;
        default:
          oracleTypeObj = { none: {} };
      }

      onSubmit({
        poolName,
        mint,
        isStable: isStable === 'true',
        oracleType: oracleTypeObj,
        initialPrice: parseInt(initialPrice),
        authorityPubkey
      });
    } catch (error) {
      alert('Invalid address format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Pool"
        value={poolName}
        onChange={setPoolName}
        options={[{ value: '', label: 'Select a pool' }, ...poolOptions]}
      />
      <Input
        label="Mint Address"
        value={mintAddress}
        onChange={setMintAddress}
        placeholder="Enter token mint address"
      />
      <Select
        label="Is Stable Token"
        value={isStable}
        onChange={setIsStable}
        options={[
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' }
        ]}
      />
      <Select
        label="Oracle Type"
        value={oracleType}
        onChange={setOracleType}
        options={[
          { value: 'none', label: 'None' },
          { value: 'pyth', label: 'Pyth' },
          { value: 'custom', label: 'Custom' }
        ]}
      />
      <Input
        label="Initial Price (in micro units)"
        value={initialPrice}
        onChange={setInitialPrice}
        type="number"
        placeholder="1000000"
      />
      <Input
        label="Authority Address"
        value={authorityAddress}
        onChange={setAuthorityAddress}
        placeholder="Enter authority public key"
      />
      <button
        type="submit"
        disabled={isLoading || !poolName || !mintAddress || !authorityAddress}
        className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Adding Custody...' : 'Add Custody'}
      </button>
    </form>
  );
};

const UpdatePriceForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: UpdatePriceArgs) => void, isLoading: boolean, custodies: any[] }) => {
  const [selectedCustody, setSelectedCustody] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [authorityAddress, setAuthorityAddress] = useState('');

  const custodyOptions = custodies.map(custody => ({
    value: JSON.stringify({
      poolName: 'pool', // You'd need to match this with actual pool names
      mint: custody.account?.mint?.toString()
    }),
    label: `${truncateAddress(custody.account?.mint)} - ${formatPrice(custody.account?.pricing?.currentPrice)}`
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const custodyData = JSON.parse(selectedCustody);
      const authorityPubkey = new PublicKey(authorityAddress);
      const mint = new PublicKey(custodyData.mint);

      onSubmit({
        poolName: custodyData.poolName,
        mint,
        newPrice: parseInt(newPrice),
        authorityPubkey
      });
    } catch (error) {
      alert('Invalid input format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Custody"
        value={selectedCustody}
        onChange={setSelectedCustody}
        options={[{ value: '', label: 'Select a custody' }, ...custodyOptions]}
      />
      <Input
        label="New Price (in micro units)"
        value={newPrice}
        onChange={setNewPrice}
        type="number"
        placeholder="1000000"
      />
      <Input
        label="Authority Address"
        value={authorityAddress}
        onChange={setAuthorityAddress}
        placeholder="Enter authority public key"
      />
      <button
        type="submit"
        disabled={isLoading || !selectedCustody || !newPrice || !authorityAddress}
        className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Updating Price...' : 'Update Price'}
      </button>
    </form>
  );
};

// Trading Forms
const AddLiquidityForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: AddLiquidityArgs) => void, isLoading: boolean, custodies: any[] }) => {
  const [selectedCustody, setSelectedCustody] = useState('');
  const [amountIn, setAmountIn] = useState('');
  const [minLpAmountOut, setMinLpAmountOut] = useState('0');
  const [fundingAccount, setFundingAccount] = useState('');
  const [lpTokenAccount, setLpTokenAccount] = useState('');

  const { publicKey } = useWallet();

  const custodyOptions = custodies.map(custody => ({
    value: JSON.stringify({
      poolName: 'pool',
      mint: custody.account?.mint?.toString()
    }),
    label: `${truncateAddress(custody.account?.mint)} - ${custody.account?.isStable ? 'Stable' : 'Asset'}`
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const custodyData = JSON.parse(selectedCustody);
      const mint = new PublicKey(custodyData.mint);
      const fundingAccountPubkey = new PublicKey(fundingAccount);
      const lpTokenAccountPubkey = new PublicKey(lpTokenAccount);

      onSubmit({
        poolName: custodyData.poolName,
        mint,
        amountIn: parseFloat(amountIn) * 1e6, // Convert to micro units
        minLpAmountOut: parseFloat(minLpAmountOut) * 1e6,
        ownerPubkey: publicKey,
        fundingAccount: fundingAccountPubkey,
        lpTokenAccount: lpTokenAccountPubkey
      });
    } catch (error) {
      alert('Invalid input format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Token"
        value={selectedCustody}
        onChange={setSelectedCustody}
        options={[{ value: '', label: 'Select a token' }, ...custodyOptions]}
      />
      <Input
        label="Amount In"
        value={amountIn}
        onChange={setAmountIn}
        type="number"
        placeholder="0.0"
      />
      <Input
        label="Minimum LP Tokens Out"
        value={minLpAmountOut}
        onChange={setMinLpAmountOut}
        type="number"
        placeholder="0.0"
      />
      <Input
        label="Funding Account"
        value={fundingAccount}
        onChange={setFundingAccount}
        placeholder="Your token account address"
      />
      <Input
        label="LP Token Account"
        value={lpTokenAccount}
        onChange={setLpTokenAccount}
        placeholder="Your LP token account address"
      />
      <button
        type="submit"
        disabled={isLoading || !selectedCustody || !amountIn || !publicKey}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
      </button>
    </form>
  );
};

const OpenPositionForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: OpenPositionArgs) => void, isLoading: boolean, custodies: any[] }) => {
  const [selectedCustody, setSelectedCustody] = useState('');
  const [side, setSide] = useState('long');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [leverage, setLeverage] = useState('2');
  const [acceptablePrice, setAcceptablePrice] = useState('');
  const [collateralAccount, setCollateralAccount] = useState('');
  const [oracleAccount, setOracleAccount] = useState('');

  const { publicKey } = useWallet();

  const custodyOptions = custodies.map(custody => ({
    value: JSON.stringify({
      poolName: 'pool',
      mint: custody.account?.mint?.toString()
    }),
    label: `${truncateAddress(custody.account?.mint)} - ${formatPrice(custody.account?.pricing?.currentPrice)}`
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const custodyData = JSON.parse(selectedCustody);
      const mint = new PublicKey(custodyData.mint);
      const collateralAccountPubkey = new PublicKey(collateralAccount);
      const oracleAccountPubkey = new PublicKey(oracleAccount);

      onSubmit({
        poolName: custodyData.poolName,
        mint,
        side: side === 'long' ? { long: {} } : { short: {} },
        collateralAmount: parseFloat(collateralAmount) * 1e6,
        leverage: parseFloat(leverage) * 100, // Convert to basis points
        acceptablePrice: parseFloat(acceptablePrice) * 1e6,
        ownerPubkey: publicKey,
        collateralAccount: collateralAccountPubkey,
        oracleAccount: oracleAccountPubkey
      });
    } catch (error) {
      alert('Invalid input format');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Asset"
        value={selectedCustody}
        onChange={setSelectedCustody}
        options={[{ value: '', label: 'Select an asset' }, ...custodyOptions]}
      />
      <Select
        label="Position Side"
        value={side}
        onChange={setSide}
        options={[
          { value: 'long', label: 'Long (Buy)' },
          { value: 'short', label: 'Short (Sell)' }
        ]}
      />
      <Input
        label="Collateral Amount"
        value={collateralAmount}
        onChange={setCollateralAmount}
        type="number"
        placeholder="0.0"
      />
      <Input
        label="Leverage"
        value={leverage}
        onChange={setLeverage}
        type="number"
        placeholder="2.0"
      />
      <Input
        label="Acceptable Price"
        value={acceptablePrice}
        onChange={setAcceptablePrice}
        type="number"
        placeholder="Current market price"
      />
      <Input
        label="Collateral Account"
        value={collateralAccount}
        onChange={setCollateralAccount}
        placeholder="Your collateral token account"
      />
      <Input
        label="Oracle Account"
        value={oracleAccount}
        onChange={setOracleAccount}
        placeholder="Oracle account for price feed"
      />
      <button
        type="submit"
        disabled={isLoading || !selectedCustody || !collateralAmount || !publicKey}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Opening Position...' : 'Open Position'}
      </button>
    </form>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, subtitle, icon: Icon, className = "" }: { title: string, value: string, subtitle: string, icon: any, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-end">
        <Icon className="h-8 w-8 text-blue-600" />
      </div>
    </div>
  </div>
);

// Action Buttons Component
const ActionButtons = ({ 
  onInitialize, 
  onAddPool, 
  onAddCustody, 
  onUpdatePrice,
  onAddLiquidity,
  onOpenPosition,
  isConnected 
}: {
  onInitialize: () => void,
  onAddPool: () => void,
  onAddCustody: () => void,
  onUpdatePrice: () => void,
  onAddLiquidity: () => void,
  onOpenPosition: () => void,
  isConnected: boolean
}) => (
  <div className="bg-white rounded-lg shadow-md p-6 mb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Admin Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Admin</h4>
        <button
          onClick={onInitialize}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Shield className="h-4 w-4 mr-2" />
          Initialize
        </button>
        <button
          onClick={onAddPool}
          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pool
        </button>
        <button
          onClick={onAddCustody}
          className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Coins className="h-4 w-4 mr-2" />
          Add Custody
        </button>
        <button
          onClick={onUpdatePrice}
          className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Edit className="h-4 w-4 mr-2" />
          Update Price
        </button>
      </div>

      {/* Trading Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Trading</h4>
        <button
          onClick={onAddLiquidity}
          disabled={!isConnected}
          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Add Liquidity
        </button>
        <button
          onClick={onOpenPosition}
          disabled={!isConnected}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Target className="h-4 w-4 mr-2" />
          Open Position
        </button>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Status</h4>
        <div className="flex items-center text-sm text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
        </div>
      </div>
    </div>
  </div>
);

// Main Dashboard Component
export default function PerpetualsDashboard() {
  const { publicKey } = useWallet();
  const {
      perpetualsAccounts,
      poolAccounts,
      custodyAccounts,
      positionAccounts,
      initialize,
      addPool,
      addCustody,
      updatePrice,
      addLiquidity,
      openPosition,
      programId
  } = usePerpetualsProgram();

  // Modal states
  const [showInitializeModal, setShowInitializeModal] = useState(false);
  const [showAddPoolModal, setShowAddPoolModal] = useState(false);
  const [showAddCustodyModal, setShowAddCustodyModal] = useState(false);
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [showAddLiquidityModal, setShowAddLiquidityModal] = useState(false);
  const [showOpenPositionModal, setShowOpenPositionModal] = useState(false);

  // Calculate summary statistics
  const stats = useMemo(() => {
      const pools = poolAccounts.data || [];
      const custodies = custodyAccounts.data || [];
      const positions = positionAccounts.data || [];

      const totalPools = pools.length;
      const totalCustodies = custodies.length;
      const totalPositions = positions.length;
      
      const totalTVL = custodies.reduce((sum, custody) => {
        const assets = custody.account?.assets?.owned || 0;
        const price = custody.account?.pricing?.currentPrice || 0;
        return sum + (Number(assets) * Number(price) / 1e12);
      }, 0);

      const longPositions = positions.filter(pos => {
        const side = pos.account?.side;
        const sideStr = typeof side === 'object' && side !== null ? 
          Object.keys(side)[0] : 
          (typeof side === 'string' ? side : '');
        return sideStr === 'long';
      }).length;

      const shortPositions = totalPositions - longPositions;

      const totalAUM = pools.reduce((sum, pool) => {
        return sum + (Number(pool.account?.aumUsd || 0) / 1e6);
      }, 0);

      return {
          totalPools,
          totalCustodies,
          totalPositions,
          totalTVL,
          totalAUM,
          longPositions,
          shortPositions
      };
  }, [poolAccounts.data, custodyAccounts.data, positionAccounts.data]);

  const isLoading = perpetualsAccounts.isLoading || poolAccounts.isLoading || custodyAccounts.isLoading || positionAccounts.isLoading;
  const hasError = perpetualsAccounts.error || poolAccounts.error || custodyAccounts.error || positionAccounts.error;

  // Event handlers - FIXED: Correct function signatures
  const handleInitialize = async (data: InitializeArgs) => {
    if (!publicKey) return;
    await initialize.mutateAsync({ 
      minSignatures: data.minSignatures, 
      admins: data.admins, 
      adminPubkey: publicKey 
    });
    setShowInitializeModal(false);
  };

  const handleAddPool = async (data: AddPoolArgs) => {
    await addPool.mutateAsync(data);
    setShowAddPoolModal(false);
  };

  const handleAddCustody = async (data: AddCustodyArgs) => {
    if (!publicKey) return;
    await addCustody.mutateAsync({...data, authorityPubkey: publicKey});
    setShowAddCustodyModal(false);
  };

  const handleUpdatePrice = async (data: UpdatePriceArgs) => {
    if (!publicKey) return;
    await updatePrice.mutateAsync({...data, authorityPubkey: publicKey});
    setShowUpdatePriceModal(false);
  };

  const handleAddLiquidity = async (data: AddLiquidityArgs) => {
    if (!publicKey) return;
    await addLiquidity.mutateAsync({...data, ownerPubkey: publicKey});
    setShowAddLiquidityModal(false);
  };

  const handleOpenPosition = async (data: OpenPositionArgs) => {
    if (!publicKey) return;
    await openPosition.mutateAsync({...data, ownerPubkey: publicKey});
    setShowOpenPositionModal(false);
  };

  if (hasError) {
    const errorMessage = hasError || 'Failed to load perpetuals data. Please check your connection and try again.';
    console.log(errorMessage);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{"Check Console logs"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className='flex justify-between items-start mb-8'>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Perpetuals Dashboard</h1>
            <p className="text-gray-600">
              Monitor and manage pools, positions, and custody accounts in the perpetuals protocol
            </p>
            {publicKey && (
              <p className="text-sm text-gray-500 mt-2">
                Connected: {truncateAddress(publicKey)}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Program ID: {truncateAddress(programId)}
            </p>
          </div>
          <div className='flex gap-4 items-center'>
            <ThemeSelect />
            <WalletButton />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Value Locked"
            value={`${formatNumber(Math.max(stats.totalTVL, stats.totalAUM))}`}
            subtitle={`Across ${stats.totalPools} pools`}
            icon={BarChart3}
            className="lg:col-span-2"
          />
          <StatsCard
            title="Active Pools"
            value={stats.totalPools.toString()}
            subtitle={`${stats.totalCustodies} custodies`}
            icon={Wallet}
          />
          <StatsCard
            title="Open Positions"
            value={stats.totalPositions.toString()}
            subtitle={`${stats.longPositions} long, ${stats.shortPositions} short`}
            icon={Activity}
          />
        </div>

        {/* Action Buttons */}
        <ActionButtons
          onInitialize={() => setShowInitializeModal(true)}
          onAddPool={() => setShowAddPoolModal(true)}
          onAddCustody={() => setShowAddCustodyModal(true)}
          onUpdatePrice={() => setShowUpdatePriceModal(true)}
          onAddLiquidity={() => setShowAddLiquidityModal(true)}
          onOpenPosition={() => setShowOpenPositionModal(true)}
          isConnected={!!publicKey}
        />

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading perpetuals data...</span>
          </div>
        ) : (
          <>
            {/* Pools Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Wallet className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Liquidity Pools</h2>
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {stats.totalPools}
                </span>
              </div>
              
              {poolAccounts.data && poolAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {poolAccounts.data.map((pool: any) => (
                    <PoolCard 
                      key={pool.publicKey.toString()} 
                      pool={pool}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No pools found</p>
                  <button
                    onClick={() => setShowAddPoolModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Pool
                  </button>
                </div>
              )}
            </div>

            {/* Custodies Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Coins className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Asset Custody</h2>
                <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {stats.totalCustodies}
                </span>
              </div>
              
              {custodyAccounts.data && custodyAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {custodyAccounts.data.map((custody: any) => (
                    <CustodyCard 
                      key={custody.publicKey.toString()} 
                      custody={custody}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
                  <Coins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No custody accounts found</p>
                  <button
                    onClick={() => setShowAddCustodyModal(true)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add First Custody
                  </button>
                </div>
              )}
            </div>

            {/* Positions Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Target className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Open Positions</h2>
                <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {stats.totalPositions}
                </span>
              </div>
              
              {positionAccounts.data && positionAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {positionAccounts.data.map((position: any) => (
                    <PositionCard 
                      key={position.publicKey.toString()} 
                      position={position}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No open positions found</p>
                  {publicKey && (
                    <button
                      onClick={() => setShowOpenPositionModal(true)}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Open First Position
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Program Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Program Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Program Status</p>
                  <p className="text-lg font-medium text-green-600">
                    {perpetualsAccounts.data && perpetualsAccounts.data.length > 0 ? 'Initialized' : 'Not Initialized'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Accounts</p>
                  <p className="text-lg font-medium text-gray-900">
                    {(perpetualsAccounts.data?.length || 0) + 
                     (poolAccounts.data?.length || 0) + 
                     (custodyAccounts.data?.length || 0) + 
                     (positionAccounts.data?.length || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modals */}
        <Modal
          isOpen={showInitializeModal}
          onClose={() => setShowInitializeModal(false)}
          title="Initialize Perpetuals Program"
        >
          <InitializeForm
            onSubmit={handleInitialize}
            isLoading={initialize.isPending}
          />
        </Modal>

        <Modal
          isOpen={showAddPoolModal}
          onClose={() => setShowAddPoolModal(false)}
          title="Add New Pool"
        >
          <AddPoolForm
            onSubmit={handleAddPool}
            isLoading={addPool.isPending}
          />
        </Modal>

        <Modal
          isOpen={showAddCustodyModal}
          onClose={() => setShowAddCustodyModal(false)}
          title="Add New Custody"
        >
          <AddCustodyForm
            onSubmit={handleAddCustody}
            isLoading={addCustody.isPending}
            pools={poolAccounts.data || []}
          />
        </Modal>

        <Modal
          isOpen={showUpdatePriceModal}
          onClose={() => setShowUpdatePriceModal(false)}
          title="Update Custody Price"
        >
          <UpdatePriceForm
            onSubmit={handleUpdatePrice}
            isLoading={updatePrice.isPending}
            custodies={custodyAccounts.data || []}
          />
        </Modal>

        <Modal
          isOpen={showAddLiquidityModal}
          onClose={() => setShowAddLiquidityModal(false)}
          title="Add Liquidity"
        >
          <AddLiquidityForm
            onSubmit={handleAddLiquidity}
            isLoading={addLiquidity.isPending}
            custodies={custodyAccounts.data || []}
          />
        </Modal>

        <Modal
          isOpen={showOpenPositionModal}
          onClose={() => setShowOpenPositionModal(false)}
          title="Open New Position"
        >
          <OpenPositionForm
            onSubmit={handleOpenPosition}
            isLoading={openPosition.isPending}
            custodies={custodyAccounts.data || []}
          />
        </Modal>
      </div>
    </div>
  );
}

// Additional Card Components (PoolCard, CustodyCard, PositionCard)
const PoolCard = ({ pool }: { pool: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const poolAccount = pool.account;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{poolAccount?.name || 'Pool'}</h3>
          <p className="text-sm text-gray-500">{truncateAddress(pool.publicKey)}</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Total AUM</p>
          <p className="text-xl font-bold text-gray-900">
            ${formatNumber((poolAccount?.aumUsd || 0) / 1e6)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Custodies</p>
          <p className="text-xl font-bold text-gray-900">
            {poolAccount?.custodies?.length || 0}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Pool Pubkey</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {pool.publicKey.toString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Inception Time</p>
              <p className="text-sm text-gray-900">
                {poolAccount?.inceptionTime ? 
                  new Date(Number(poolAccount.inceptionTime) * 1000).toLocaleDateString() : 
                  'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bump</p>
              <p className="text-sm text-gray-900">{poolAccount?.bump || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">LP Token Bump</p>
              <p className="text-sm text-gray-900">{poolAccount?.lpTokenBump || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustodyCard = ({ custody }: { custody: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const custodyAccount = custody.account;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Coins className="h-6 w-6 text-green-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {custodyAccount?.isStable ? 'Stable Token' : 'Asset Token'}
            </h3>
            <p className="text-sm text-gray-500">{truncateAddress(custody.publicKey)}</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Current Price</p>
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(custodyAccount?.pricing?.currentPrice || 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Assets</p>
          <p className="text-xl font-bold text-gray-900">
            {formatTokenAmount(custodyAccount?.assets?.owned)}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Mint</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {custodyAccount?.mint?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pool</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {custodyAccount?.pool?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Oracle Type</p>
              <p className="text-sm text-gray-900">
                {custodyAccount?.oracleType || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Collateral</p>
              <p className="text-sm text-gray-900">
                {formatTokenAmount(custodyAccount?.assets?.collateral)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Protocol Fees</p>
              <p className="text-sm text-gray-900">
                {formatTokenAmount(custodyAccount?.assets?.protocolFees)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Locked</p>
              <p className="text-sm text-gray-900">
                {formatTokenAmount(custodyAccount?.assets?.locked)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PositionCard = ({ position }: { position: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const positionAccount = position.account;
  const side = positionAccount?.side;
  
  // Handle both enum variants: { long: {} } or "long" string
  const sideStr = typeof side === 'object' && side !== null ? 
    Object.keys(side)[0] : 
    (typeof side === 'string' ? side : 'unknown');
  
  const isLong = sideStr === 'long';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Target className={`h-6 w-6 mr-2 ${isLong ? 'text-green-600' : 'text-red-600'}`} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {sideStr.toUpperCase()} Position
            </h3>
            <p className="text-sm text-gray-500">{truncateAddress(position.publicKey)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isLong ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {sideStr.toUpperCase()}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Size USD</p>
          <p className="text-xl font-bold text-gray-900">
            ${formatNumber((positionAccount?.sizeUsd || 0) / 1e6)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Collateral</p>
          <p className="text-xl font-bold text-gray-900">
            {formatTokenAmount(positionAccount?.collateralAmount)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Entry Price</p>
          <p className="text-lg font-medium text-gray-900">
            {formatPrice(positionAccount?.entryPrice)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Leverage</p>
          <p className="text-lg font-medium text-gray-900">
            {positionAccount?.leverage ? `${Number(positionAccount.leverage) / 100}x` : 'N/A'}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Owner</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {positionAccount?.owner?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pool</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {positionAccount?.pool?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Custody</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {positionAccount?.custody?.toString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Entry Timestamp</p>
              <p className="text-sm text-gray-900">
                {positionAccount?.entryTimestamp ? 
                  new Date(Number(positionAccount.entryTimestamp) * 1000).toLocaleString() : 
                  'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Unrealized PnL</p>
              <p className={`text-sm font-medium ${
                (positionAccount?.unrealizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${formatNumber((positionAccount?.unrealizedPnl || 0) / 1e6)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bump</p>
              <p className="text-sm text-gray-900">{positionAccount?.bump || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// "use client"
// import React, { useState, useMemo } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { 
//   BarChart3, 
//   TrendingUp, 
//   TrendingDown, 
//   Wallet, 
//   Target,
//   AlertTriangle,
//   Coins,
//   Activity,
//   Settings,
//   Plus,
//   Edit,
//   DollarSign,
//   LogIn,
//   LogOut,
//   Zap,
//   RefreshCw,
//   Shield,
//   Users,
//   Info
// } from 'lucide-react';
// import { PublicKey } from '@solana/web3.js';
// import { WalletButton } from '../solana/solana-provider';
// import { ThemeSelect } from '../theme-select';
// import { usePerpetualsProgram } from './perpetuals-data-access';

// // Utility functions
// const formatNumber = (num: number, decimals = 2) => {
//   if (num === undefined || num === null) return '0';
//   return Number(num).toLocaleString(undefined, { 
//     minimumFractionDigits: decimals, 
//     maximumFractionDigits: decimals 
//   });
// };

// const formatPrice = (price: any) => {
//   if (!price) return '$0.00';
//   return `$${formatNumber(price / 1e6, 4)}`;
// };

// const formatTokenAmount = (amount: any, decimals = 6) => {
//   if (!amount) return '0';
//   return formatNumber(amount / Math.pow(10, decimals));
// };

// const truncateAddress = (address: PublicKey | string) => {
//   if (!address) return '';
//   const str = address.toString();
//   return `${str.slice(0, 4)}...${str.slice(-4)}`;
// };

// // Modal Component
// const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
//         <div className="flex items-center justify-between p-6 border-b">
//           <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             ✕
//           </button>
//         </div>
//         <div className="p-6">
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Form Components
// const Input = ({ label, value, onChange, type = "text", placeholder = "", disabled = false }: {
//   label: string,
//   value: string,
//   onChange: (value: string) => void,
//   type?: string,
//   placeholder?: string,
//   disabled?: boolean
// }) => (
//   <div className="mb-4">
//     <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
//     <input
//       type={type}
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       placeholder={placeholder}
//       disabled={disabled}
//       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
//     />
//   </div>
// );

// const Select = ({ label, value, onChange, options, disabled = false }: {
//   label: string,
//   value: string,
//   onChange: (value: string) => void,
//   options: { value: string, label: string }[],
//   disabled?: boolean
// }) => (
//   <div className="mb-4">
//     <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
//     <select
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       disabled={disabled}
//       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
//     >
//       {options.map(option => (
//         <option key={option.value} value={option.value}>{option.label}</option>
//       ))}
//     </select>
//   </div>
// );

// interface InitializeArgs {
//   minSignatures: number;
//   admins: PublicKey[];
//   adminPubkey: PublicKey;
// }

// // Admin Forms
// const InitializeForm = ({ onSubmit, isLoading }: { onSubmit: (data: InitializeArgs) => void, isLoading: boolean }) => {
//   const [minSignatures, setMinSignatures] = useState('1');
//   const [adminAddress, setAdminAddress] = useState('');

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const adminPubkey = new PublicKey(adminAddress);
//       onSubmit({
//         minSignatures: parseInt(minSignatures),
//         admins: [adminPubkey],
//         adminPubkey
//       });
//     } catch (error) {
//       alert('Invalid admin address format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Input
//         label="Minimum Signatures"
//         value={minSignatures}
//         onChange={setMinSignatures}
//         type="number"
//         placeholder="1"
//       />
//       <Input
//         label="Admin Address"
//         value={adminAddress}
//         onChange={setAdminAddress}
//         placeholder="Enter admin public key"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !adminAddress}
//         className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Initializing...' : 'Initialize Program'}
//       </button>
//     </form>
//   );
// };

// const AddPoolForm = ({ onSubmit, isLoading }: { onSubmit: (data: any) => void, isLoading: boolean }) => {
//   const [poolName, setPoolName] = useState('');
//   const [authorityAddress, setAuthorityAddress] = useState('');

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const authorityPubkey = new PublicKey(authorityAddress);
//       onSubmit({
//         poolName,
//         authorityPubkey
//       });
//       setPoolName('');
//       setAuthorityAddress('');
//     } catch (error) {
//       alert('Invalid authority address format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Input
//         label="Pool Name"
//         value={poolName}
//         onChange={setPoolName}
//         placeholder="Enter pool name (max 64 chars)"
//       />
//       <Input
//         label="Authority Address"
//         value={authorityAddress}
//         onChange={setAuthorityAddress}
//         placeholder="Enter authority public key"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !poolName || !authorityAddress}
//         className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Adding Pool...' : 'Add Pool'}
//       </button>
//     </form>
//   );
// };

// const AddCustodyForm = ({ onSubmit, isLoading, pools }: { onSubmit: (data: any) => void, isLoading: boolean, pools: any[] }) => {
//   const [poolName, setPoolName] = useState('');
//   const [mintAddress, setMintAddress] = useState('');
//   const [isStable, setIsStable] = useState('false');
//   const [oracleType, setOracleType] = useState('none');
//   const [initialPrice, setInitialPrice] = useState('1000000');
//   const [authorityAddress, setAuthorityAddress] = useState('');

//   const poolOptions = pools.map(pool => ({
//     value: pool.account?.name || '',
//     label: pool.account?.name || 'Unnamed Pool'
//   }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const mint = new PublicKey(mintAddress);
//       const authorityPubkey = new PublicKey(authorityAddress);
      
//       let oracleTypeObj;
//       switch (oracleType) {
//         case 'pyth':
//           oracleTypeObj = { pyth: {} };
//           break;
//         case 'custom':
//           oracleTypeObj = { custom: {} };
//           break;
//         default:
//           oracleTypeObj = { none: {} };
//       }

//       onSubmit({
//         poolName,
//         mint,
//         isStable: isStable === 'true',
//         oracleType: oracleTypeObj,
//         initialPrice: parseInt(initialPrice),
//         authorityPubkey
//       });
//     } catch (error) {
//       alert('Invalid address format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Select
//         label="Pool"
//         value={poolName}
//         onChange={setPoolName}
//         options={[{ value: '', label: 'Select a pool' }, ...poolOptions]}
//       />
//       <Input
//         label="Mint Address"
//         value={mintAddress}
//         onChange={setMintAddress}
//         placeholder="Enter token mint address"
//       />
//       <Select
//         label="Is Stable Token"
//         value={isStable}
//         onChange={setIsStable}
//         options={[
//           { value: 'false', label: 'No' },
//           { value: 'true', label: 'Yes' }
//         ]}
//       />
//       <Select
//         label="Oracle Type"
//         value={oracleType}
//         onChange={setOracleType}
//         options={[
//           { value: 'none', label: 'None' },
//           { value: 'pyth', label: 'Pyth' },
//           { value: 'custom', label: 'Custom' }
//         ]}
//       />
//       <Input
//         label="Initial Price (in micro units)"
//         value={initialPrice}
//         onChange={setInitialPrice}
//         type="number"
//         placeholder="1000000"
//       />
//       <Input
//         label="Authority Address"
//         value={authorityAddress}
//         onChange={setAuthorityAddress}
//         placeholder="Enter authority public key"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !poolName || !mintAddress || !authorityAddress}
//         className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Adding Custody...' : 'Add Custody'}
//       </button>
//     </form>
//   );
// };

// const UpdatePriceForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: any) => void, isLoading: boolean, custodies: any[] }) => {
//   const [selectedCustody, setSelectedCustody] = useState('');
//   const [newPrice, setNewPrice] = useState('');
//   const [authorityAddress, setAuthorityAddress] = useState('');

//   const custodyOptions = custodies.map(custody => ({
//     value: JSON.stringify({
//       poolName: 'pool', // You'd need to match this with actual pool names
//       mint: custody.account?.mint?.toString()
//     }),
//     label: `${truncateAddress(custody.account?.mint)} - ${formatPrice(custody.account?.pricing?.currentPrice)}`
//   }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       const custodyData = JSON.parse(selectedCustody);
//       const authorityPubkey = new PublicKey(authorityAddress);
//       const mint = new PublicKey(custodyData.mint);

//       onSubmit({
//         poolName: custodyData.poolName,
//         mint,
//         newPrice: parseInt(newPrice),
//         authorityPubkey
//       });
//     } catch (error) {
//       alert('Invalid input format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Select
//         label="Custody"
//         value={selectedCustody}
//         onChange={setSelectedCustody}
//         options={[{ value: '', label: 'Select a custody' }, ...custodyOptions]}
//       />
//       <Input
//         label="New Price (in micro units)"
//         value={newPrice}
//         onChange={setNewPrice}
//         type="number"
//         placeholder="1000000"
//       />
//       <Input
//         label="Authority Address"
//         value={authorityAddress}
//         onChange={setAuthorityAddress}
//         placeholder="Enter authority public key"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !selectedCustody || !newPrice || !authorityAddress}
//         className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Updating Price...' : 'Update Price'}
//       </button>
//     </form>
//   );
// };

// // Trading Forms
// const AddLiquidityForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: any) => void, isLoading: boolean, custodies: any[] }) => {
//   const [selectedCustody, setSelectedCustody] = useState('');
//   const [amountIn, setAmountIn] = useState('');
//   const [minLpAmountOut, setMinLpAmountOut] = useState('0');
//   const [fundingAccount, setFundingAccount] = useState('');
//   const [lpTokenAccount, setLpTokenAccount] = useState('');

//   const { publicKey } = useWallet();

//   const custodyOptions = custodies.map(custody => ({
//     value: JSON.stringify({
//       poolName: 'pool',
//       mint: custody.account?.mint?.toString()
//     }),
//     label: `${truncateAddress(custody.account?.mint)} - ${custody.account?.isStable ? 'Stable' : 'Asset'}`
//   }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!publicKey) {
//       alert('Please connect your wallet');
//       return;
//     }

//     try {
//       const custodyData = JSON.parse(selectedCustody);
//       const mint = new PublicKey(custodyData.mint);
//       const fundingAccountPubkey = new PublicKey(fundingAccount);
//       const lpTokenAccountPubkey = new PublicKey(lpTokenAccount);

//       onSubmit({
//         poolName: custodyData.poolName,
//         mint,
//         amountIn: parseFloat(amountIn) * 1e6, // Convert to micro units
//         minLpAmountOut: parseFloat(minLpAmountOut) * 1e6,
//         ownerPubkey: publicKey,
//         fundingAccount: fundingAccountPubkey,
//         lpTokenAccount: lpTokenAccountPubkey
//       });
//     } catch (error) {
//       alert('Invalid input format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Select
//         label="Token"
//         value={selectedCustody}
//         onChange={setSelectedCustody}
//         options={[{ value: '', label: 'Select a token' }, ...custodyOptions]}
//       />
//       <Input
//         label="Amount In"
//         value={amountIn}
//         onChange={setAmountIn}
//         type="number"
//         placeholder="0.0"
//       />
//       <Input
//         label="Minimum LP Tokens Out"
//         value={minLpAmountOut}
//         onChange={setMinLpAmountOut}
//         type="number"
//         placeholder="0.0"
//       />
//       <Input
//         label="Funding Account"
//         value={fundingAccount}
//         onChange={setFundingAccount}
//         placeholder="Your token account address"
//       />
//       <Input
//         label="LP Token Account"
//         value={lpTokenAccount}
//         onChange={setLpTokenAccount}
//         placeholder="Your LP token account address"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !selectedCustody || !amountIn || !publicKey}
//         className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
//       </button>
//     </form>
//   );
// };

// const OpenPositionForm = ({ onSubmit, isLoading, custodies }: { onSubmit: (data: any) => void, isLoading: boolean, custodies: any[] }) => {
//   const [selectedCustody, setSelectedCustody] = useState('');
//   const [side, setSide] = useState('long');
//   const [collateralAmount, setCollateralAmount] = useState('');
//   const [leverage, setLeverage] = useState('2');
//   const [acceptablePrice, setAcceptablePrice] = useState('');
//   const [collateralAccount, setCollateralAccount] = useState('');
//   const [oracleAccount, setOracleAccount] = useState('');

//   const { publicKey } = useWallet();

//   const custodyOptions = custodies.map(custody => ({
//     value: JSON.stringify({
//       poolName: 'pool',
//       mint: custody.account?.mint?.toString()
//     }),
//     label: `${truncateAddress(custody.account?.mint)} - ${formatPrice(custody.account?.pricing?.currentPrice)}`
//   }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!publicKey) {
//       alert('Please connect your wallet');
//       return;
//     }

//     try {
//       const custodyData = JSON.parse(selectedCustody);
//       const mint = new PublicKey(custodyData.mint);
//       const collateralAccountPubkey = new PublicKey(collateralAccount);
//       const oracleAccountPubkey = new PublicKey(oracleAccount);

//       onSubmit({
//         poolName: custodyData.poolName,
//         mint,
//         side: side === 'long' ? { long: {} } : { short: {} },
//         collateralAmount: parseFloat(collateralAmount) * 1e6,
//         leverage: parseFloat(leverage) * 100, // Convert to basis points
//         acceptablePrice: parseFloat(acceptablePrice) * 1e6,
//         ownerPubkey: publicKey,
//         collateralAccount: collateralAccountPubkey,
//         oracleAccount: oracleAccountPubkey
//       });
//     } catch (error) {
//       alert('Invalid input format');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <Select
//         label="Asset"
//         value={selectedCustody}
//         onChange={setSelectedCustody}
//         options={[{ value: '', label: 'Select an asset' }, ...custodyOptions]}
//       />
//       <Select
//         label="Position Side"
//         value={side}
//         onChange={setSide}
//         options={[
//           { value: 'long', label: 'Long (Buy)' },
//           { value: 'short', label: 'Short (Sell)' }
//         ]}
//       />
//       <Input
//         label="Collateral Amount"
//         value={collateralAmount}
//         onChange={setCollateralAmount}
//         type="number"
//         placeholder="0.0"
//       />
//       <Input
//         label="Leverage"
//         value={leverage}
//         onChange={setLeverage}
//         type="number"
//         placeholder="2.0"
//       />
//       <Input
//         label="Acceptable Price"
//         value={acceptablePrice}
//         onChange={setAcceptablePrice}
//         type="number"
//         placeholder="Current market price"
//       />
//       <Input
//         label="Collateral Account"
//         value={collateralAccount}
//         onChange={setCollateralAccount}
//         placeholder="Your collateral token account"
//       />
//       <Input
//         label="Oracle Account"
//         value={oracleAccount}
//         onChange={setOracleAccount}
//         placeholder="Oracle account for price feed"
//       />
//       <button
//         type="submit"
//         disabled={isLoading || !selectedCustody || !collateralAmount || !publicKey}
//         className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//       >
//         {isLoading ? 'Opening Position...' : 'Open Position'}
//       </button>
//     </form>
//   );
// };

// // Stats Card Component
// const StatsCard = ({ title, value, subtitle, icon: Icon, className = "" }: { title: string, value: string, subtitle: string, icon: any, className?: string }) => (
//   <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
//     <div className="flex items-center justify-between">
//       <div>
//         <p className="text-sm font-medium text-gray-600">{title}</p>
//         <p className="text-2xl font-bold text-gray-900">{value}</p>
//         {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
//       </div>
//       <div className="flex flex-col items-end">
//         <Icon className="h-8 w-8 text-blue-600" />
//       </div>
//     </div>
//   </div>
// );

// // Action Buttons Component
// const ActionButtons = ({ 
//   onInitialize, 
//   onAddPool, 
//   onAddCustody, 
//   onUpdatePrice,
//   onAddLiquidity,
//   onOpenPosition,
//   isConnected 
// }: {
//   onInitialize: () => void,
//   onAddPool: () => void,
//   onAddCustody: () => void,
//   onUpdatePrice: () => void,
//   onAddLiquidity: () => void,
//   onOpenPosition: () => void,
//   isConnected: boolean
// }) => (
//   <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//     <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
    
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//       {/* Admin Actions */}
//       <div className="space-y-2">
//         <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Admin</h4>
//         <button
//           onClick={onInitialize}
//           className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//         >
//           <Shield className="h-4 w-4 mr-2" />
//           Initialize
//         </button>
//         <button
//           onClick={onAddPool}
//           className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//         >
//           <Plus className="h-4 w-4 mr-2" />
//           Add Pool
//         </button>
//         <button
//           onClick={onAddCustody}
//           className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//         >
//           <Coins className="h-4 w-4 mr-2" />
//           Add Custody
//         </button>
//         <button
//           onClick={onUpdatePrice}
//           className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
//         >
//           <Edit className="h-4 w-4 mr-2" />
//           Update Price
//         </button>
//       </div>

//       {/* Trading Actions */}
//       <div className="space-y-2">
//         <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Trading</h4>
//         <button
//           onClick={onAddLiquidity}
//           disabled={!isConnected}
//           className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//         >
//           <DollarSign className="h-4 w-4 mr-2" />
//           Add Liquidity
//         </button>
//         <button
//           onClick={onOpenPosition}
//           disabled={!isConnected}
//           className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
//         >
//           <Target className="h-4 w-4 mr-2" />
//           Open Position
//         </button>
//       </div>

//       {/* Info */}
//       <div className="space-y-2">
//         <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Status</h4>
//         <div className="flex items-center text-sm text-gray-600">
//           <Users className="h-4 w-4 mr-2" />
//           {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
//         </div>
//       </div>
//     </div>
//   </div>
// );

// // Main Dashboard Component
// export default function PerpetualsDashboard() {
//   const { publicKey } = useWallet();
//   const {
//       perpetualsAccounts,
//       poolAccounts,
//       custodyAccounts,
//       positionAccounts,
//       initialize,
//       addPool,
//       addCustody,
//       updatePrice,
//       addLiquidity,
//       openPosition,
//       programId
//   } = usePerpetualsProgram();

//   // Modal states
//   const [showInitializeModal, setShowInitializeModal] = useState(false);
//   const [showAddPoolModal, setShowAddPoolModal] = useState(false);
//   const [showAddCustodyModal, setShowAddCustodyModal] = useState(false);
//   const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
//   const [showAddLiquidityModal, setShowAddLiquidityModal] = useState(false);
//   const [showOpenPositionModal, setShowOpenPositionModal] = useState(false);

//   // Calculate summary statistics
//   const stats = useMemo(() => {
//       const pools = poolAccounts.data || [];
//       const custodies = custodyAccounts.data || [];
//       const positions = positionAccounts.data || [];

//       const totalPools = pools.length;
//       const totalCustodies = custodies.length;
//       const totalPositions = positions.length;
      
//       const totalTVL = custodies.reduce((sum, custody) => {
//         const assets = custody.account?.assets?.owned || 0;
//         const price = custody.account?.pricing?.currentPrice || 0;
//         return sum + (Number(assets) * Number(price) / 1e12);
//       }, 0);

//       const longPositions = positions.filter(pos => {
//         const side = pos.account?.side;
//         const sideStr = typeof side === 'object' && side !== null ? 
//           Object.keys(side)[0] : 
//           (typeof side === 'string' ? side : '');
//         return sideStr === 'long';
//       }).length;

//       const shortPositions = totalPositions - longPositions;

//       const totalAUM = pools.reduce((sum, pool) => {
//         return sum + (Number(pool.account?.aumUsd || 0) / 1e6);
//       }, 0);

//       return {
//           totalPools,
//           totalCustodies,
//           totalPositions,
//           totalTVL,
//           totalAUM,
//           longPositions,
//           shortPositions
//       };
//   }, [poolAccounts.data, custodyAccounts.data, positionAccounts.data]);

//   const isLoading = perpetualsAccounts.isLoading || poolAccounts.isLoading || custodyAccounts.isLoading || positionAccounts.isLoading;
//   const hasError = perpetualsAccounts.error || poolAccounts.error || custodyAccounts.error || positionAccounts.error;

//   // Event handlers
//   const handleInitialize = async ({ data }: { data: { minSignatures: number, admins: PublicKey[], adminPubkey: PublicKey } }) => {
//     if (!publicKey) return;
//     await initialize.mutateAsync({ minSignatures, admins, adminPubkey: publicKey });
//     setShowInitializeModal(false);
//   };

//   const handleAddPool = async (data: AddPoolArgs) => {
//     await addPool.mutateAsync({data});
//     setShowAddPoolModal(false);
//   };

//   const handleAddCustody = async(data: AddCustodyArgs) => {
//     await addCustody.mutateAsync({...data, authorityPubkey: publicKey});
//     setShowAddCustodyModal(false);
//   };

//   const handleUpdatePrice = async(data: UpdatePriceArgs) => {
//     await updatePrice.mutateAsync({...data, authorityPubkey: publicKey});
//     setShowUpdatePriceModal(false);
//   };

//   const handleAddLiquidity = async(data: AddLiquidityArgs) => {
//     await addLiquidity.mutateAsync({...data, ownerPubkey: publicKey});
//     setShowAddLiquidityModal(false);
//   };

//   const handleOpenPosition = async(data: OpenPositionArgs) => {
//     await openPosition.mutateAsync({...data, ownerPubkey: publicKey});
//     setShowOpenPositionModal(false);
//   };

//   if (hasError) {
//     const errorMessage = hasError || 'Failed to load perpetuals data. Please check your connection and try again.';
//     console.log(errorMessage);

//     return (
//       <div className="min-h-screen bg-gray-50 p-6">
//         <div className="max-w-7xl mx-auto">
//           <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
//             <div className="flex items-center">
//               <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
//               <span className="text-red-800">{"Check Console logs"}</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className='flex justify-between items-start mb-8'>
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">Perpetuals Dashboard</h1>
//             <p className="text-gray-600">
//               Monitor and manage pools, positions, and custody accounts in the perpetuals protocol
//             </p>
//             {publicKey && (
//               <p className="text-sm text-gray-500 mt-2">
//                 Connected: {truncateAddress(publicKey)}
//               </p>
//             )}
//             <p className="text-xs text-gray-400 mt-1">
//               Program ID: {truncateAddress(programId)}
//             </p>
//           </div>
//           <div className='flex gap-4 items-center'>
//             <ThemeSelect />
//             <WalletButton />
//           </div>
//         </div>

//         {/* Stats Overview */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           <StatsCard
//             title="Total Value Locked"
//             value={`${formatNumber(Math.max(stats.totalTVL, stats.totalAUM))}`}
//             subtitle={`Across ${stats.totalPools} pools`}
//             icon={BarChart3}
//             className="lg:col-span-2"
//           />
//           <StatsCard
//             title="Active Pools"
//             value={stats.totalPools.toString()}
//             subtitle={`${stats.totalCustodies} custodies`}
//             icon={Wallet}
//           />
//           <StatsCard
//             title="Open Positions"
//             value={stats.totalPositions.toString()}
//             subtitle={`${stats.longPositions} long, ${stats.shortPositions} short`}
//             icon={Activity}
//           />
//         </div>

//         {/* Action Buttons */}
//         <ActionButtons
//           onInitialize={() => setShowInitializeModal(true)}
//           onAddPool={() => setShowAddPoolModal(true)}
//           onAddCustody={() => setShowAddCustodyModal(true)}
//           onUpdatePrice={() => setShowUpdatePriceModal(true)}
//           onAddLiquidity={() => setShowAddLiquidityModal(true)}
//           onOpenPosition={() => setShowOpenPositionModal(true)}
//           isConnected={!!publicKey}
//         />

//         {isLoading ? (
//           <div className="flex items-center justify-center p-8">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//             <span className="ml-3 text-gray-600">Loading perpetuals data...</span>
//           </div>
//         ) : (
//           <>
//             {/* Pools Section */}
//             <div className="mb-8">
//               <div className="flex items-center mb-6">
//                 <Wallet className="h-6 w-6 text-blue-600 mr-2" />
//                 <h2 className="text-2xl font-bold text-gray-900">Liquidity Pools</h2>
//                 <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
//                   {stats.totalPools}
//                 </span>
//               </div>
              
//               {poolAccounts.data && poolAccounts.data.length > 0 ? (
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//                   {poolAccounts.data.map((pool: any) => (
//                     <PoolCard 
//                       key={pool.publicKey.toString()} 
//                       pool={pool}
//                     />
//                   ))}
//                 </div>
//               ) : (
//                 <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
//                   <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                   <p>No pools found</p>
//                   <button
//                     onClick={() => setShowAddPoolModal(true)}
//                     className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                   >
//                     Add First Pool
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Custodies Section */}
//             <div className="mb-8">
//               <div className="flex items-center mb-6">
//                 <Coins className="h-6 w-6 text-green-600 mr-2" />
//                 <h2 className="text-2xl font-bold text-gray-900">Asset Custody</h2>
//                 <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
//                   {stats.totalCustodies}
//                 </span>
//               </div>
              
//               {custodyAccounts.data && custodyAccounts.data.length > 0 ? (
//                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
//                   {custodyAccounts.data.map((custody: any) => (
//                     <CustodyCard 
//                       key={custody.publicKey.toString()} 
//                       custody={custody}
//                     />
//                   ))}
//                 </div>
//               ) : (
//                 <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
//                   <Coins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                   <p>No custody accounts found</p>
//                   <button
//                     onClick={() => setShowAddCustodyModal(true)}
//                     className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                   >
//                     Add First Custody
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Positions Section */}
//             <div className="mb-8">
//               <div className="flex items-center mb-6">
//                 <Target className="h-6 w-6 text-purple-600 mr-2" />
//                 <h2 className="text-2xl font-bold text-gray-900">Open Positions</h2>
//                 <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
//                   {stats.totalPositions}
//                 </span>
//               </div>
              
//               {positionAccounts.data && positionAccounts.data.length > 0 ? (
//                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
//                   {positionAccounts.data.map((position: any) => (
//                     <PositionCard 
//                       key={position.publicKey.toString()} 
//                       position={position}
//                     />
//                   ))}
//                 </div>
//               ) : (
//                 <div className="bg-white text-center py-8 text-gray-500 rounded-lg shadow-md">
//                   <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                   <p>No open positions found</p>
//                   {publicKey && (
//                     <button
//                       onClick={() => setShowOpenPositionModal(true)}
//                       className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//                     >
//                       Open First Position
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Program Info */}
//             <div className="bg-white rounded-lg shadow-md p-6">
//               <h2 className="text-xl font-bold text-gray-900 mb-4">Program Information</h2>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <p className="text-sm text-gray-600">Program Status</p>
//                   <p className="text-lg font-medium text-green-600">
//                     {perpetualsAccounts.data && perpetualsAccounts.data.length > 0 ? 'Initialized' : 'Not Initialized'}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Total Accounts</p>
//                   <p className="text-lg font-medium text-gray-900">
//                     {(perpetualsAccounts.data?.length || 0) + 
//                      (poolAccounts.data?.length || 0) + 
//                      (custodyAccounts.data?.length || 0) + 
//                      (positionAccounts.data?.length || 0)}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-gray-600">Last Updated</p>
//                   <p className="text-lg font-medium text-gray-900">
//                     {new Date().toLocaleTimeString()}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}

//         {/* Modals */}
//         <Modal
//           isOpen={showInitializeModal}
//           onClose={() => setShowInitializeModal(false)}
//           title="Initialize Perpetuals Program"
//         >
//           <InitializeForm
//             onSubmit={() => handleInitialize({
//               minSignatures: 0,
//               admins: [],
//               adminPubkey: publicKey as PublicKey
//             })}
//             isLoading={initialize.isPending}
//           />
//         </Modal>

//         <Modal
//           isOpen={showAddPoolModal}
//           onClose={() => setShowAddPoolModal(false)}
//           title="Add New Pool"
//         >
//           <AddPoolForm
//             onSubmit={handleAddPool}
//             isLoading={addPool.isPending}
//           />
//         </Modal>

//         <Modal
//           isOpen={showAddCustodyModal}
//           onClose={() => setShowAddCustodyModal(false)}
//           title="Add New Custody"
//         >
//           <AddCustodyForm
//             onSubmit={handleAddCustody}
//             isLoading={addCustody.isPending}
//             pools={poolAccounts.data || []}
//           />
//         </Modal>

//         <Modal
//           isOpen={showUpdatePriceModal}
//           onClose={() => setShowUpdatePriceModal(false)}
//           title="Update Custody Price"
//         >
//           <UpdatePriceForm
//             onSubmit={handleUpdatePrice}
//             isLoading={updatePrice.isPending}
//             custodies={custodyAccounts.data || []}
//           />
//         </Modal>

//         <Modal
//           isOpen={showAddLiquidityModal}
//           onClose={() => setShowAddLiquidityModal(false)}
//           title="Add Liquidity"
//         >
//           <AddLiquidityForm
//             onSubmit={handleAddLiquidity}
//             isLoading={addLiquidity.isPending}
//             custodies={custodyAccounts.data || []}
//           />
//         </Modal>

//         <Modal
//           isOpen={showOpenPositionModal}
//           onClose={() => setShowOpenPositionModal(false)}
//           title="Open New Position"
//         >
//           <OpenPositionForm
//             onSubmit={handleOpenPosition}
//             isLoading={openPosition.isPending}
//             custodies={custodyAccounts.data || []}
//           />
//         </Modal>
//       </div>
//     </div>
//   );
// }

// // Additional Card Components (PoolCard, CustodyCard, PositionCard)
// const PoolCard = ({ pool }: { pool: any }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const poolAccount = pool.account;
  
//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex items-center justify-between mb-4">
//         <div>
//           <h3 className="text-lg font-semibold text-gray-900">{poolAccount?.name || 'Pool'}</h3>
//           <p className="text-sm text-gray-500">{truncateAddress(pool.publicKey)}</p>
//         </div>
//         <button
//           onClick={() => setIsExpanded(!isExpanded)}
//           className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
//         >
//           {isExpanded ? 'Collapse' : 'Expand'}
//         </button>
//       </div>
      
//       <div className="grid grid-cols-2 gap-4 mb-4">
//         <div>
//           <p className="text-sm text-gray-600">Total AUM</p>
//           <p className="text-xl font-bold text-gray-900">
//             ${formatNumber((poolAccount?.aumUsd || 0) / 1e6)}
//           </p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-600">Custodies</p>
//           <p className="text-xl font-bold text-gray-900">
//             {poolAccount?.custodies?.length || 0}
//           </p>
//         </div>
//       </div>

//       {isExpanded && (
//         <div className="mt-4 pt-4 border-t border-gray-200">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <p className="text-sm text-gray-600">Pool Pubkey</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {pool.publicKey.toString()}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Inception Time</p>
//               <p className="text-sm text-gray-900">
//                 {poolAccount?.inceptionTime ? 
//                   new Date(Number(poolAccount.inceptionTime) * 1000).toLocaleDateString() : 
//                   'N/A'
//                 }
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Bump</p>
//               <p className="text-sm text-gray-900">{poolAccount?.bump || 'N/A'}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">LP Token Bump</p>
//               <p className="text-sm text-gray-900">{poolAccount?.lpTokenBump || 'N/A'}</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const CustodyCard = ({ custody }: { custody: any }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const custodyAccount = custody.account;
  
//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center">
//           <Coins className="h-6 w-6 text-green-600 mr-2" />
//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               {custodyAccount?.isStable ? 'Stable Token' : 'Asset Token'}
//             </h3>
//             <p className="text-sm text-gray-500">{truncateAddress(custody.publicKey)}</p>
//           </div>
//         </div>
//         <button
//           onClick={() => setIsExpanded(!isExpanded)}
//           className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
//         >
//           {isExpanded ? 'Collapse' : 'Expand'}
//         </button>
//       </div>
      
//       <div className="grid grid-cols-2 gap-4 mb-4">
//         <div>
//           <p className="text-sm text-gray-600">Current Price</p>
//           <p className="text-xl font-bold text-gray-900">
//             {formatPrice(custodyAccount?.pricing?.currentPrice || 0)}
//           </p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-600">Total Assets</p>
//           <p className="text-xl font-bold text-gray-900">
//             {formatTokenAmount(custodyAccount?.assets?.owned)}
//           </p>
//         </div>
//       </div>

//       {isExpanded && (
//         <div className="mt-4 pt-4 border-t border-gray-200">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <p className="text-sm text-gray-600">Mint</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {custodyAccount?.mint?.toString() || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Pool</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {custodyAccount?.pool?.toString() || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Oracle Type</p>
//               <p className="text-sm text-gray-900">
//                 {custodyAccount?.oracleType || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Collateral</p>
//               <p className="text-sm text-gray-900">
//                 {formatTokenAmount(custodyAccount?.assets?.collateral)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Protocol Fees</p>
//               <p className="text-sm text-gray-900">
//                 {formatTokenAmount(custodyAccount?.assets?.protocolFees)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Locked</p>
//               <p className="text-sm text-gray-900">
//                 {formatTokenAmount(custodyAccount?.assets?.locked)}
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const PositionCard = ({ position }: { position: any }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const positionAccount = position.account;
//   const side = positionAccount?.side;
  
//   // Handle both enum variants: { long: {} } or "long" string
//   const sideStr = typeof side === 'object' && side !== null ? 
//     Object.keys(side)[0] : 
//     (typeof side === 'string' ? side : 'unknown');
  
//   const isLong = sideStr === 'long';
  
//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex items-center justify-between mb-4">
//         <div className="flex items-center">
//           <Target className={`h-6 w-6 mr-2 ${isLong ? 'text-green-600' : 'text-red-600'}`} />
//           <div>
//             <h3 className="text-lg font-semibold text-gray-900">
//               {sideStr.toUpperCase()} Position
//             </h3>
//             <p className="text-sm text-gray-500">{truncateAddress(position.publicKey)}</p>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <div className={`px-3 py-1 rounded-full text-sm font-medium ${
//             isLong ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//           }`}>
//             {sideStr.toUpperCase()}
//           </div>
//           <button
//             onClick={() => setIsExpanded(!isExpanded)}
//             className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
//           >
//             {isExpanded ? 'Less' : 'More'}
//           </button>
//         </div>
//       </div>
      
//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <p className="text-sm text-gray-600">Size USD</p>
//           <p className="text-xl font-bold text-gray-900">
//             ${formatNumber((positionAccount?.sizeUsd || 0) / 1e6)}
//           </p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-600">Collateral</p>
//           <p className="text-xl font-bold text-gray-900">
//             {formatTokenAmount(positionAccount?.collateralAmount)}
//           </p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-600">Entry Price</p>
//           <p className="text-lg font-medium text-gray-900">
//             {formatPrice(positionAccount?.entryPrice)}
//           </p>
//         </div>
//         <div>
//           <p className="text-sm text-gray-600">Leverage</p>
//           <p className="text-lg font-medium text-gray-900">
//             {positionAccount?.leverage ? `${Number(positionAccount.leverage) / 100}x` : 'N/A'}
//           </p>
//         </div>
//       </div>

//       {isExpanded && (
//         <div className="mt-4 pt-4 border-t border-gray-200">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <p className="text-sm text-gray-600">Owner</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {positionAccount?.owner?.toString() || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Pool</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {positionAccount?.pool?.toString() || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Custody</p>
//               <p className="text-xs font-mono text-gray-900 break-all">
//                 {positionAccount?.custody?.toString() || 'N/A'}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Entry Timestamp</p>
//               <p className="text-sm text-gray-900">
//                 {positionAccount?.entryTimestamp ? 
//                   new Date(Number(positionAccount.entryTimestamp) * 1000).toLocaleString() : 
//                   'N/A'
//                 }
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Unrealized PnL</p>
//               <p className={`text-sm font-medium ${
//                 (positionAccount?.unrealizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
//               }`}>
//                 ${formatNumber((positionAccount?.unrealizedPnl || 0) / 1e6)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600">Bump</p>
//               <p className="text-sm text-gray-900">{positionAccount?.bump || 'N/A'}</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }