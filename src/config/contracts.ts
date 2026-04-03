import QFPayRouterABI from '../abi/QFPayRouter.json';
import QNSResolverABI from '../abi/QNSResolver.json';

export const QFPAY_ROUTER_ADDRESS = (
  import.meta.env.VITE_QFPAY_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

export const QNS_RESOLVER_ADDRESS = (
  import.meta.env.VITE_QNS_RESOLVER_ADDRESS || '0x0000000000000000000000000000000000000000'
) as `0x${string}`;

export const ROUTER_ABI = QFPayRouterABI as any[];
export const RESOLVER_ABI = QNSResolverABI as any[];

// Burn basis points: 10 = 0.1%
export const BURN_BASIS_POINTS = 10n;
export const BASIS_POINTS_DENOMINATOR = 10000n;

// Gas buffer: 0.01 QF — generous for Substrate-chain transaction fees
// TODO: replace with dynamic fee estimate from runtime paymentInfo
export const GAS_BUFFER = 10000000000000000n; // 0.01 * 1e18

// QF has 18 decimals
export const QF_DECIMALS = 18;

// ETH JSON-RPC endpoint for balance queries
export const QF_ETH_RPC = 'https://archive.mainnet.qfnode.net/eth';
