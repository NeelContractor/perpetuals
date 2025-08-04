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
  Activity
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { usePerpetualsProgram } from './perpetuals-data-access';
import { WalletButton } from '../solana/solana-provider';
import { ThemeSelect } from '../theme-select';

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

const truncateAddress = (address: PublicKey) => {
  if (!address) return '';
  const str = address.toString();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
};

// Components
const StatsCard = ({ title, value, subtitle, icon: Icon, className = "" }: { title: string, value: string, subtitle: string, icon: any, className?: string }) => (
  <div className={` rounded-lg shadow-md p-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium ">{title}</p>
        <p className="text-2xl font-bold ">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex flex-col items-end">
        <Icon className="h-8 w-8 text-blue-600" />
        {/* {trend && (
          <div className={`flex items-center mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm ml-1">{Math.abs(trend)}%</span>
          </div>
        )} */}
      </div>
    </div>
  </div>
);

const PoolCard = ({ pool }: { pool: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const poolAccount = pool.account;
  
  return (
    <div className="rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold ">{poolAccount?.name || 'Pool'}</h3>
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
    <div className=" rounded-lg shadow-md p-6">
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
    <div className=" rounded-lg shadow-md p-6">
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
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading perpetuals data...</span>
  </div>
);

const ErrorMessage = ({ message }: { message: any }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
    <div className="flex items-center">
      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
      <span className="text-red-800">{message}</span>
    </div>
  </div>
);

// Main Dashboard Component - expects usePerpetualsProgram to be imported
export default function PerpetualsDashboard() {
  const { publicKey } = useWallet();
  const {
    perpetualsAccounts,
    poolAccounts,
    custodyAccounts,
    positionAccounts,
    getProgramAccount
  } = usePerpetualsProgram();

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
      return sum + (Number(assets) * Number(price) / 1e12); // Adjust for decimals
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

  if (hasError) {
    const errorMessage = hasError.message || 'Failed to load perpetuals data. Please check your connection and try again.';
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorMessage message={errorMessage} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className='flex justify-between'>
          <div className="mb-8">
            <h1 className="text-3xl font-bold  mb-2">Perpetuals Dashboard</h1>
            <p className="text-gray-600">
              Monitor pools, positions, and custody accounts in the perpetuals protocol
            </p>
            {publicKey && (
              <p className="text-sm text-gray-500 mt-2">
                Connected: {truncateAddress(publicKey)}
              </p>
            )}
          </div>
          <div className='flex gap-4'>
            <ThemeSelect />
            <WalletButton />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Value Locked"
            value={`$${formatNumber(Math.max(stats.totalTVL, stats.totalAUM))}`}
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

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Pools Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Wallet className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold ">Liquidity Pools</h2>
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {stats.totalPools}
                </span>
              </div>
              
              {poolAccounts.data && poolAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {poolAccounts.data.map((pool) => (
                    <>
                      <PoolCard 
                        key={pool.publicKey.toString()} 
                        pool={pool}
                      />
                      {JSON.stringify(pool)}
                    </>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 rounded-lg shadow-md">
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No pools found</p>
                </div>
              )}
            </div>

            {/* Custodies Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Coins className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-2xl font-bold ">Asset Custody</h2>
                <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {stats.totalCustodies}
                </span>
              </div>
              
              {custodyAccounts.data && custodyAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {custodyAccounts.data.map((custody: any) => (
                    <>
                      <CustodyCard 
                        key={custody.publicKey.toString()} 
                        custody={custody}
                      />
                      {JSON.stringify(custody)}
                    </>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500  rounded-lg shadow-md">
                  <Coins className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No custody accounts found</p>
                </div>
              )}
            </div>

            {/* Positions Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <Target className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-2xl font-bold ">Open Positions</h2>
                <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                  {stats.totalPositions}
                </span>
              </div>
              
              {positionAccounts.data && positionAccounts.data.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {positionAccounts.data.map((position: any) => (
                    <>
                      <PositionCard 
                        key={position.publicKey.toString()} 
                        position={position}
                      />
                      {JSON.stringify(position)}
                    </>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 rounded-lg shadow-md">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No open positions found</p>
                </div>
              )}
            </div>

            {/* Program Info */}
            <div className=" rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold  mb-4">Program Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Program Status</p>
                  <p className="text-lg font-medium text-green-600">
                    {perpetualsAccounts.data && perpetualsAccounts.data.length > 0 ? 'Active' : 'Inactive'}
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
      </div>
    </div>
  );
}