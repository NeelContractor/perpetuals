import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Enums matching the Rust program
export enum OracleType {
  Pyth = 'pyth',
  Custom = 'custom',
  None = 'none'
}

export enum Side {
  Long = 'long',
  Short = 'short'
}

// Struct types matching the Rust program
export interface Permissions {
  allowSwap: boolean;
  allowAddLiquidity: boolean;
  allowRemoveLiquidity: boolean;
  allowOpenPosition: boolean;
  allowClosePosition: boolean;
  allowPnlWithdrawal: boolean;
  allowCollateralWithdrawal: boolean;
  allowSizeChange: boolean;
}

export interface PricingParams {
  useEma: boolean;
  useUnrealizedPnlInAum: boolean;
  tradeSpreadLong: BN;
  tradeSpreadShort: BN;
  swapSpread: BN;
  maxLeverage: BN;
  maxGlobalShortSizeUsd: BN;
  maxGlobalLongSizeUsd: BN;
  currentPrice: BN;
  emaPrice: BN;
  lastUpdateTime: BN;
}

export interface Fees {
  swapIn: BN;
  swapOut: BN;
  stableSwapIn: BN;
  stableSwapOut: BN;
  addLiquidity: BN;
  removeLiquidity: BN;
  openPosition: BN;
  closePosition: BN;
  liquidation: BN;
  protocolShare: BN;
}

export interface BorrowRateParams {
  baseRate: BN;
  slope1: BN;
  slope2: BN;
  optimalUtilization: BN;
}

export interface Assets {
  collateral: BN;
  protocolFees: BN;
  owned: BN;
  locked: BN;
}

export interface VolumeStats {
  swapUsd: BN;
  addLiquidityUsd: BN;
  removeLiquidityUsd: BN;
  openPositionUsd: BN;
  closePositionUsd: BN;
  liquidationUsd: BN;
}

export interface TradeStats {
  oiLongUsd: BN;
  oiShortUsd: BN;
  totalLongFunding: BN;
  totalShortFunding: BN;
}

// Account types matching the Rust program
export interface PerpetualsAccount {
  adminAuthority: PublicKey;
  minSignatures: number;
  admins: PublicKey[];
  pools: PublicKey[];
  permissions: Permissions;
  bump: number;
}

export interface PoolAccount {
  name: string;
  custodies: PublicKey[];
  aumUsd: BN;
  bump: number;
  lpTokenBump: number;
  inceptionTime: BN;
}

export interface CustodyAccount {
  pool: PublicKey;
  mint: PublicKey;
  decimals: number;
  isStable: boolean;
  oracle: PublicKey;
  oracleType: OracleType;
  pricing: PricingParams;
  fees: Fees;
  borrowRate: BorrowRateParams;
  assets: Assets;
  volumeStats: VolumeStats;
  tradeStats: TradeStats;
  feedId?: string;
  bump: number;
  tokenAccountBump: number;
}

export interface PositionAccount {
  owner: PublicKey;
  pool: PublicKey;
  custody: PublicKey;
  side: Side;
  collateralAmount: BN;
  leverage: BN;
  sizeUsd: BN;
  entryPrice: BN;
  entryTimestamp: BN;
  unrealizedPnl: BN;
  bump: number;
}

// Account wrapper types for program queries
export interface PerpetualsAccountInfo {
  publicKey: PublicKey;
  account: PerpetualsAccount;
}

export interface PoolAccountInfo {
  publicKey: PublicKey;
  account: PoolAccount;
}

export interface CustodyAccountInfo {
  publicKey: PublicKey;
  account: CustodyAccount;
}

export interface PositionAccountInfo {
  publicKey: PublicKey;
  account: PositionAccount;
}

// Processed data types for the UI
export interface ProcessedPoolData {
  publicKey: PublicKey;
  account: PoolAccount;
  name: string;
  totalAum: number;
  lpSupply: number;
  custodies: ProcessedCustodyData[];
  positions: ProcessedPositionData[];
  inceptionDate: Date;
}

export interface ProcessedCustodyData {
  publicKey: PublicKey;
  account: CustodyAccount;
  poolPubkey: PublicKey;
  mint: PublicKey;
  isStable: boolean;
  currentPrice: number;
  emaPrice: number;
  assets: {
    collateral: number;
    protocolFees: number;
    owned: number;
    locked: number;
    total: number;
  };
  oracleType: OracleType;
  utilizationRate: number;
  borrowRate: number;
  totalVolume: number;
  openInterest: {
    long: number;
    short: number;
    total: number;
  };
}

export interface ProcessedPositionData {
  publicKey: PublicKey;
  account: PositionAccount;
  owner: PublicKey;
  poolPubkey: PublicKey;
  custodyPubkey: PublicKey;
  side: Side;
  sizeUsd: number;
  collateralAmount: number;
  leverage: number;
  entryPrice: number;
  currentPrice?: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginRatio: number;
  entryDate: Date;
  isAtRisk: boolean;
}

// Dashboard statistics
export interface DashboardStats {
  totalTVL: number;
  totalPools: number;
  totalCustodies: number;
  totalPositions: number;
  longPositions: number;
  shortPositions: number;
  averageLeverage: number;
  totalVolume24h: number;
  totalOpenInterest: number;
  protocolFees: number;
}

// User-specific data
export interface UserStats {
  totalPositions: number;
  totalSize: number;
  totalCollateral: number;
  totalPnl: number;
  longCount: number;
  shortCount: number;
  averageLeverage: number;
  marginRatio: number;
  portfolioValue: number;
}

// Pool-specific data
export interface PoolStats {
  totalAum: number;
  totalLiquidity: number;
  utilizationRate: number;
  apr: number;
  totalFees: number;
  totalVolume: number;
  custodyCount: number;
  positionCount: number;
}

// Transaction argument types
export interface InitializeArgs {
  minSignatures: number;
  admins: PublicKey[];
  adminPubkey: PublicKey;
}

export interface AddPoolArgs {
  poolName: string;
  authorityPubkey: PublicKey;
}

export interface AddCustodyArgs {
  poolName: string;
  mint: PublicKey;
  isStable: boolean;
  oracleType: { [key in OracleType]?: {} };
  initialPrice: number;
  authorityPubkey: PublicKey;
}

export interface UpdatePriceArgs {
  poolName: string;
  mint: PublicKey;
  newPrice: number;
  authorityPubkey: PublicKey;
}

export interface AddLiquidityArgs {
  poolName: string;
  mint: PublicKey;
  amountIn: number;
  minLpAmountOut: number;
  ownerPubkey: PublicKey;
  fundingAccount: PublicKey;
  lpTokenAccount: PublicKey;
}

export interface RemoveLiquidityArgs {
  poolName: string;
  mint: PublicKey;
  lpAmountIn: number;
  minAmountOut: number;
  ownerPubkey: PublicKey;
  lpTokenAccount: PublicKey;
  receivingAccount: PublicKey;
}

export interface OpenPositionArgs {
  poolName: string;
  mint: PublicKey;
  side: { [key in Side]?: {} };
  collateralAmount: number;
  leverage: number;
  acceptablePrice: number;
  ownerPubkey: PublicKey;
  collateralAccount: PublicKey;
  oracleAccount: PublicKey;
}

export interface ClosePositionArgs {
  poolName: string;
  mint: PublicKey;
  ownerPubkey: PublicKey;
  receivingAccount: PublicKey;
  oracleAccount: PublicKey;
}

export interface LiquidatePositionArgs {
  poolName: string;
  mint: PublicKey;
  positionOwner: PublicKey;
  liquidatorPubkey: PublicKey;
  liquidatorAccount: PublicKey;
  positionOwnerAccount: PublicKey;
  oracleAccount: PublicKey;
}

export interface UpdatePositionArgs {
  poolName: string;
  mint: PublicKey;
  positionOwner: PublicKey;
  oracleAccount: PublicKey;
}

// Constants
export const PERPETUALS_CONSTANTS = {
  PRICE_PRECISION: 1_000_000,
  USD_PRECISION: 1_000_000,
  BPS_PRECISION: 10_000,
  MAX_LEVERAGE: 8000, // 80x
  LIQUIDATION_THRESHOLD: 8000, // 80%
  MIN_COLLATERAL_SOL: 10_000_000, // 0.01 SOL
  MAX_PRICE_AGE: 60, // 60 seconds
  BASE_CURRENCY_DECIMALS: 8,
  TOKEN_DECIMALS: 6,
} as const;

// Error types
export interface PerpetualsError {
  name: string;
  code: string;
  message: string;
  details?: any;
}

// Query options
export interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PriceChartData {
  prices: ChartDataPoint[];
  volume: ChartDataPoint[];
  openInterest: ChartDataPoint[];
}

// Filter and sort options
export interface FilterOptions {
  pools?: PublicKey[];
  custodies?: PublicKey[];
  owners?: PublicKey[];
  sides?: Side[];
  minSize?: number;
  maxSize?: number;
  minLeverage?: number;
  maxLeverage?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

// Form data types
export interface PositionFormData {
  poolName: string;
  mint: PublicKey;
  side: Side;
  collateralAmount: string;
  leverage: string;
  acceptablePrice: string;
}

export interface LiquidityFormData {
  poolName: string;
  mint: PublicKey;
  amount: string;
  minLpAmount?: string;
  minTokenAmount?: string;
}

// Notification types
export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
}

// Theme and UI types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

// Local storage types
export interface UserPreferences {
  theme: ThemeConfig['mode'];
  defaultSlippage: number;
  autoRefresh: boolean;
  notifications: boolean;
  favoritePoolsOnTop: boolean;
  hideDustPositions: boolean;
  defaultLeverage: number;
}

// WebSocket data types
export interface WebSocketMessage {
  type: 'price_update' | 'position_update' | 'liquidation' | 'trade';
  data: any;
  timestamp: number;
}

export interface PriceUpdate {
  mint: PublicKey;
  price: number;
  timestamp: number;
  source: 'pyth' | 'custom';
}

// Export utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredOnly<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type guards
export const isPoolAccount = (account: any): account is PoolAccount => {
  return account && typeof account.name === 'string' && Array.isArray(account.custodies);
};

export const isCustodyAccount = (account: any): account is CustodyAccount => {
  return account && account.pool && account.mint && typeof account.isStable === 'boolean';
};

export const isPositionAccount = (account: any): account is PositionAccount => {
  return account && account.owner && account.pool && account.custody && account.side;
};

// Type conversion utilities
export const bnToNumber = (bn: BN, decimals = 6): number => {
  return bn.toNumber() / Math.pow(10, decimals);
};

export const numberToBn = (num: number, decimals = 6): BN => {
  return new BN(num * Math.pow(10, decimals));
};

export const formatPublicKey = (key: PublicKey, chars = 4): string => {
  const str = key.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
};

// Validation utilities
export const validatePublicKey = (key: string): boolean => {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
};

export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
};

export const validateLeverage = (leverage: string): boolean => {
  const num = parseFloat(leverage);
  return !isNaN(num) && num > 0 && num <= PERPETUALS_CONSTANTS.MAX_LEVERAGE / 100;
};