// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import PerpetualsIDL from '../target/idl/perpetuals.json'
import type { Perpetuals } from '../target/types/perpetuals'

// Re-export the generated IDL and type
export { Perpetuals, PerpetualsIDL }

// The programId is imported from the program IDL.
export const PERPETUALS_PROGRAM_ID = new PublicKey(PerpetualsIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getPerpetualsProgram(provider: AnchorProvider, address?: PublicKey): Program<Perpetuals> {
  return new Program({ ...PerpetualsIDL, address: address ? address.toBase58() : PerpetualsIDL.address } as Perpetuals, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getPerpetualsProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('F5SxeR2fW3R23GVCBSicwk45Zn9nhDCgSPHXirm2Vsom')
    case 'mainnet-beta':
    default:
      return PERPETUALS_PROGRAM_ID
  }
}
