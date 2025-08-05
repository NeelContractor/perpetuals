

'use client'

import { getPerpetualsProgram, getPerpetualsProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import * as anchor from '@coral-xyz/anchor'

// Interface definitions
interface InitializeArgs {
  minSignatures: number
  admins: PublicKey[]
  adminPubkey: PublicKey
}

interface AddPoolArgs {
  poolName: string
  authorityPubkey: PublicKey
}

interface AddCustodyArgs {
  poolName: string
  mint: PublicKey
  isStable: boolean
  oracleType: { none: {} } | { pyth: {} } | { custom: {} }
  initialPrice: number
  authorityPubkey: PublicKey
}

interface UpdatePriceArgs {
  poolName: string
  mint: PublicKey
  newPrice: number
  authorityPubkey: PublicKey
}

interface AddLiquidityArgs {
  poolName: string
  mint: PublicKey
  amountIn: number
  minLpAmountOut: number
  ownerPubkey: PublicKey
  fundingAccount: PublicKey
  lpTokenAccount: PublicKey
}

interface RemoveLiquidityArgs {
  poolName: string
  mint: PublicKey
  lpAmountIn: number
  minAmountOut: number
  ownerPubkey: PublicKey
  lpTokenAccount: PublicKey
  receivingAccount: PublicKey
}

interface OpenPositionArgs {
  poolName: string
  mint: PublicKey
  side: { long: {} } | { short: {} }
  collateralAmount: number
  leverage: number
  acceptablePrice: number
  ownerPubkey: PublicKey
  collateralAccount: PublicKey
  oracleAccount: PublicKey
}

interface ClosePositionArgs {
  poolName: string
  mint: PublicKey
  ownerPubkey: PublicKey
  receivingAccount: PublicKey
  oracleAccount: PublicKey
}

interface LiquidatePositionArgs {
  poolName: string
  mint: PublicKey
  positionOwner: PublicKey
  liquidatorPubkey: PublicKey
  liquidatorAccount: PublicKey
  positionOwnerAccount: PublicKey
  oracleAccount: PublicKey
}

interface UpdatePositionArgs {
  poolName: string
  mint: PublicKey
  positionOwner: PublicKey
  oracleAccount: PublicKey
}

export function usePerpetualsProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getPerpetualsProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getPerpetualsProgram(provider, programId), [provider, programId])

  // Query all accounts
  const perpetualsAccounts = useQuery({
    queryKey: ['perpetuals', 'all', { cluster }],
    queryFn: () => program.account.perpetuals.all(),
  })

  const custodyAccounts = useQuery({
    queryKey: ['custody', 'all', { cluster }],
    queryFn: () => program.account.custody.all(),
  })

  const poolAccounts = useQuery({
    queryKey: ['pool', 'all', { cluster }],
    queryFn: () => program.account.pool.all(),
  })

  const positionAccounts = useQuery({
    queryKey: ['position', 'all', { cluster }],
    queryFn: () => program.account.position.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  // ADMIN ONLY: Initialize the perpetuals program
  const initialize = useMutation<string, Error, InitializeArgs>({
    mutationKey: ['perpetuals', 'initialize', { cluster }],
    mutationFn: async({ minSignatures, admins, adminPubkey }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      return await program.methods
        .initialize(minSignatures, admins)
        .accountsStrict({ 
          admin: adminPubkey,
          perpetuals: perpetualsPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await perpetualsAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize perpetuals')
    },
  })

  // ADMIN ONLY: Add a new pool
  const addPool = useMutation<string, Error, AddPoolArgs>({
    mutationKey: ['perpetuals', 'add-pool', { cluster }],
    mutationFn: async({ poolName, authorityPubkey }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [lpTokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_token_mint"), poolPda.toBuffer()],
        program.programId
      )

      return await program.methods
        .addPool(poolName)
        .accountsStrict({
          authority: authorityPubkey,
          pool: poolPda,
          lpTokenMint: lpTokenMint,
          perpetuals: perpetualsPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await poolAccounts.refetch()
      await perpetualsAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to add pool')
    },
  })

  // ADMIN ONLY: Add custody (token) to a pool
  const addCustody = useMutation<string, Error, AddCustodyArgs>({
    mutationKey: ['perpetuals', 'add-custody', { cluster }],
    mutationFn: async({ poolName, mint, isStable, oracleType, initialPrice, authorityPubkey }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .addCustody(isStable, oracleType, new anchor.BN(initialPrice))
        .accountsStrict({
          authority: authorityPubkey,
          custody: custodyPda,
          custodyTokenMint: mint,
          pool: poolPda,
          perpetuals: perpetualsPda,
          custodyTokenAccount: custodyTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await custodyAccounts.refetch()
      await poolAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to add custody')
    },
  })

  // ADMIN ONLY: Update price for a custody
  const updatePrice = useMutation<string, Error, UpdatePriceArgs>({
    mutationKey: ['perpetuals', 'update-price', { cluster }],
    mutationFn: async({ poolName, mint, newPrice, authorityPubkey }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .updatePrice(new anchor.BN(newPrice))
        .accountsStrict({
          authority: authorityPubkey,
          custody: custodyPda,
          pool: poolPda,
          mint: mint,
          perpetuals: perpetualsPda
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to update price')
    },
  })

  // PUBLIC: Add liquidity to a pool
  const addLiquidity = useMutation<string, Error, AddLiquidityArgs>({
    mutationKey: ['perpetuals', 'add-liquidity', { cluster }],
    mutationFn: async({ poolName, mint, amountIn, minLpAmountOut, ownerPubkey, fundingAccount, lpTokenAccount }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [lpTokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_token_mint"), poolPda.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .addLiquidity(new anchor.BN(amountIn), new anchor.BN(minLpAmountOut))
        .accountsStrict({
          owner: ownerPubkey,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          custodyTokenMint: mint,
          lpTokenMint: lpTokenMint,
          fundingAccount: fundingAccount,
          lpTokenAccount: lpTokenAccount,
          custodyTokenAccount: custodyTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to add liquidity')
    },
  })

  // PUBLIC: Remove liquidity from a pool
  const removeLiquidity = useMutation<string, Error, RemoveLiquidityArgs>({
    mutationKey: ['perpetuals', 'remove-liquidity', { cluster }],
    mutationFn: async({ poolName, mint, lpAmountIn, minAmountOut, ownerPubkey, lpTokenAccount, receivingAccount }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [lpTokenMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_token_mint"), poolPda.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .removeLiquidity(new anchor.BN(lpAmountIn), new anchor.BN(minAmountOut))
        .accountsStrict({
          owner: ownerPubkey,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          custodyTokenMint: mint,
          lpTokenMint: lpTokenMint,
          lpTokenAccount: lpTokenAccount,
          receivingAccount: receivingAccount,
          custodyTokenAccount: custodyTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to remove liquidity')
    },
  })

  // PUBLIC: Open a new position
  const openPosition = useMutation<string, Error, OpenPositionArgs>({
    mutationKey: ['perpetuals', 'open-position', { cluster }],
    mutationFn: async({ poolName, mint, side, collateralAmount, leverage, acceptablePrice, ownerPubkey, collateralAccount, oracleAccount }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), ownerPubkey.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .openPosition(
          side,
          new anchor.BN(collateralAmount),
          new anchor.BN(leverage),
          new anchor.BN(acceptablePrice)
        )
        .accountsStrict({
          owner: ownerPubkey,
          position: positionPda,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          custodyTokenAccount: custodyTokenAccount,
          collateralAccount: collateralAccount,
          oracleAccount: oracleAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await positionAccounts.refetch()
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to open position')
    },
  })

  // PUBLIC: Close a position
  const closePosition = useMutation<string, Error, ClosePositionArgs>({
    mutationKey: ['perpetuals', 'close-position', { cluster }],
    mutationFn: async({ poolName, mint, ownerPubkey, receivingAccount, oracleAccount }) => {
      const [perpetualsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("perpetuals")],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), ownerPubkey.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .closePosition()
        .accountsStrict({
          owner: ownerPubkey,
          position: positionPda,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          custodyTokenAccount: custodyTokenAccount,
          receivingAccount: receivingAccount,
          oracleAccount: oracleAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await positionAccounts.refetch()
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to close position')
    },
  })

  // PUBLIC: Liquidate an undercollateralized position
  const liquidatePosition = useMutation<string, Error, LiquidatePositionArgs>({
    mutationKey: ['perpetuals', 'liquidate-position', { cluster }],
    mutationFn: async({ poolName, mint, positionOwner, liquidatorPubkey, liquidatorAccount, positionOwnerAccount, oracleAccount }) => {
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), positionOwner.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
        program.programId
      )

      const [custodyTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      return await program.methods
        .liquidatePosition()
        .accountsStrict({
          liquidator: liquidatorPubkey,
          position: positionPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          custodyTokenAccount: custodyTokenAccount,
          liquidatorAccount: liquidatorAccount,
          positionOwnerAccount: positionOwnerAccount,
          oracleAccount: oracleAccount,
          tokenProgram: TOKEN_PROGRAM_ID
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await positionAccounts.refetch()
      await custodyAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to liquidate position')
    },
  })

  // PUBLIC: Update position PnL
  const updatePosition = useMutation<string, Error, UpdatePositionArgs>({
    mutationKey: ['perpetuals', 'update-position', { cluster }],
    mutationFn: async({ poolName, mint, positionOwner, oracleAccount }) => {
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(poolName)],
        program.programId
      )

      const [custodyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
        program.programId
      )

      const [positionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), positionOwner.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
        program.programId
      )

      return await program.methods
        .updatePosition()
        .accountsStrict({
          position: positionPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          oracleAccount: oracleAccount
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await positionAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to update position')
    },
  })

  return {
    program,
    programId,
    // Query data
    perpetualsAccounts,
    poolAccounts,
    custodyAccounts,
    positionAccounts,
    getProgramAccount,
    // Admin functions
    initialize,
    addPool,
    addCustody,
    updatePrice,
    // Public functions
    addLiquidity,
    removeLiquidity,
    openPosition,
    closePosition,
    liquidatePosition,
    updatePosition,
  }
}

export function usePerpetualsProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const { program } = usePerpetualsProgram()

  const perpetualsAccountQuery = useQuery({
    queryKey: ['perpetuals', 'fetch', { cluster, account }],
    queryFn: () => program.account.perpetuals.fetch(account),
  })

  const poolAccountQuery = useQuery({
    queryKey: ['pool', 'fetch', { cluster, account }],
    queryFn: () => program.account.pool.fetch(account),
  })

  const custodyAccountQuery = useQuery({
    queryKey: ['custody', 'fetch', { cluster, account }],
    queryFn: () => program.account.custody.fetch(account),
  })

  const positionAccountQuery = useQuery({
    queryKey: ['position', 'fetch', { cluster, account }],
    queryFn: () => program.account.position.fetch(account),
  })

  return {
    perpetualsAccountQuery,
    poolAccountQuery,
    custodyAccountQuery,
    positionAccountQuery,
  }
}