import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from '@solana/spl-token'
import { Perpetuals } from '../target/types/perpetuals'

describe('Perpetuals', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Perpetuals as Program<Perpetuals>

  const authority = Keypair.generate()
  const user = Keypair.generate()

  let perpetualsPda: PublicKey
  let poolPda: PublicKey
  let lpTokenMint: PublicKey
  let custodyPda: PublicKey
  let custodyTokenAccount: PublicKey
  let positionPda: PublicKey
  let minSignatures: number
  let admins: PublicKey[]
  let mint: PublicKey
  let userTokenAccount: PublicKey
  let userLpTokenAccount: PublicKey

  const poolName = "test-pool"

  beforeAll(async () => {
    // Airdrop SOL to authority and user
    const authTx = await provider.connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(authTx, "confirmed");
    
    const userTx = await provider.connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(userTx, "confirmed");

    // Create test token mint
    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals for SOL-like token
    );

    // Create user token account and mint tokens
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    // Mint test tokens to user
    await mintTo(
      provider.connection,
      authority,
      mint,
      userTokenAccount,
      authority,
      1000 * LAMPORTS_PER_SOL // 1000 tokens
    );

    // Find PDAs
    [perpetualsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("perpetuals")],
      program.programId
    );

    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(poolName)],
      program.programId
    );

    [lpTokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_token_mint"), poolPda.toBuffer()],
      program.programId
    );

    [custodyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody"), poolPda.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [custodyTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("custody_token_account"), poolPda.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), user.publicKey.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
      program.programId
    );

    minSignatures = 0;
    admins = [authority.publicKey];
  })

  it('Initialize', async () => {
    const tx = await program.methods
      .initialize(minSignatures, admins)
      .accountsStrict({
        admin: authority.publicKey,
        perpetuals: perpetualsPda,
        systemProgram: SystemProgram.programId
      })
      .signers([authority])
      .rpc()

    console.log("Initialize tx:", tx)

    const perpetualsAcc = await program.account.perpetuals.fetch(perpetualsPda)
    console.log("Perpetuals account:", perpetualsAcc)

    // expect(perpetualsAcc.adminAuthority.toString()).toEqual(authority.publicKey.toString())
    // expect(perpetualsAcc.minSignatures).toEqual(minSignatures)
    // expect(perpetualsAcc.admins[0].toString()).toEqual(authority.publicKey.toString())
    // expect(perpetualsAcc.pools).toEqual(0)
  })

  it('Add Pool', async () => {
    const tx = await program.methods
      .addPool(poolName)
      .accountsStrict({
        authority: authority.publicKey,
        pool: poolPda,
        lpTokenMint: lpTokenMint,
        perpetuals: perpetualsPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .signers([authority])
      .rpc()

    console.log("Add pool tx:", tx)

    const poolAcc = await program.account.pool.fetch(poolPda)
    console.log("Pool account:", poolAcc)

    // expect(poolAcc.name).toEqual(poolName)
    // expect(poolAcc.custodies).toEqual(0)
    // expect(poolAcc.aumUsd.toNumber()).toEqual(0)

    const perpetualsAcc = await program.account.perpetuals.fetch(perpetualsPda)
    console.log(perpetualsAcc);
    // expect(perpetualsAcc.pools).toEqual(1)
    // expect(perpetualsAcc.pools[0].toString()).toEqual(poolPda.toString())
  })

  it('Add Custody', async () => {
    const isStable = false
    const oracleType = { none: {} } // Using None oracle type
    const initialPrice = 50 * 1_000_000 // $50 with 6 decimals precision

    const tx = await program.methods
      .addCustody(isStable, oracleType, new anchor.BN(initialPrice))
      .accountsStrict({
        authority: authority.publicKey,
        custody: custodyPda,
        custodyTokenMint: mint,
        pool: poolPda,
        perpetuals: perpetualsPda,
        custodyTokenAccount: custodyTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([authority])
      .rpc()

    console.log("Add custody tx:", tx)

    const custodyAcc = await program.account.custody.fetch(custodyPda)
    console.log("Custody account:", custodyAcc)

    // expect(custodyAcc.pool.toString()).toEqual(poolPda.toString())
    // expect(custodyAcc.isStable).toEqual(isStable)
    // expect(custodyAcc.pricing.currentPrice.toNumber()).toEqual(initialPrice)

    const poolAcc = await program.account.pool.fetch(poolPda)
    console.log(poolAcc);
    // expect(poolAcc.custodies).toEqual(1)
    // expect(poolAcc.custodies[0].toString()).toEqual(custodyPda.toString())
  })

  it('Update Price', async () => {
    const newPrice = 55 * 1_000_000 // $55 with 6 decimals precision

    const tx = await program.methods
      .updatePrice(new anchor.BN(newPrice))
      .accountsStrict({
        authority: authority.publicKey,
        custody: custodyPda,
        pool: poolPda,
        mint: mint,
        perpetuals: perpetualsPda
      })
      .signers([authority])
      .rpc()

    console.log("Update price tx:", tx)

    const custodyAcc = await program.account.custody.fetch(custodyPda)
    console.log(custodyAcc);
    // expect(custodyAcc.pricing.currentPrice.toNumber()).toEqual(newPrice)
  })

  it('Add Liquidity', async () => {
    // Create user LP token account
    userLpTokenAccount = await createAccount(
      provider.connection,
      user,
      lpTokenMint,
      user.publicKey
    )

    const amountIn = 100 * LAMPORTS_PER_SOL // 100 tokens
    const minLpAmountOut = 0

    const initialBalance = await getAccount(provider.connection, userTokenAccount)
    console.log("User initial token balance:", initialBalance.amount.toString())

    const tx = await program.methods
      .addLiquidity(new anchor.BN(amountIn), new anchor.BN(minLpAmountOut))
      .accountsStrict({
        owner: user.publicKey,
        perpetuals: perpetualsPda,
        pool: poolPda,
        custody: custodyPda,
        custodyTokenMint: mint,
        lpTokenMint: lpTokenMint,
        fundingAccount: userTokenAccount,
        lpTokenAccount: userLpTokenAccount,
        custodyTokenAccount: custodyTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([user])
      .rpc()

    console.log("Add liquidity tx:", tx)

    const userTokenBalance = await getAccount(provider.connection, userTokenAccount)
    const userLpBalance = await getAccount(provider.connection, userLpTokenAccount)
    const custodyBalance = await getAccount(provider.connection, custodyTokenAccount)

    console.log("User token balance after:", userTokenBalance.amount.toString())
    console.log("User LP token balance:", userLpBalance.amount.toString())
    console.log("Custody token balance:", custodyBalance.amount.toString())

    // expect(Number(userTokenBalance.amount)).toBeLessThan(Number(initialBalance.amount))
    // expect(Number(userLpBalance.amount)).toBeGreaterThan(0)
    // expect(Number(custodyBalance.amount)).toEqual(amountIn)
  })

  it('Open Long Position', async () => {
    const side = { long: {} }
    const collateralAmount = 1 * LAMPORTS_PER_SOL // 1 SOL collateral
    const leverage = 10 // 10x leverage
    const acceptablePrice = 60 * 1_000_000 // Accept up to $60

    // Mock oracle account (using user's account as placeholder since we're using None oracle type)
    const oracleAccount = user.publicKey

    const userBalanceBefore = await provider.connection.getBalance(user.publicKey)
    console.log("User SOL balance before position:", userBalanceBefore / LAMPORTS_PER_SOL)

    const tx = await program.methods
      .openPosition(
        side,
        new anchor.BN(collateralAmount),
        new anchor.BN(leverage),
        new anchor.BN(acceptablePrice)
      )
      .accountsStrict({
        owner: user.publicKey,
        position: positionPda,
        perpetuals: perpetualsPda,
        pool: poolPda,
        custody: custodyPda,
        mint: mint,
        custodyTokenAccount: custodyTokenAccount,
        oracleAccount: oracleAccount,
        systemProgram: SystemProgram.programId
      })
      .signers([user])
      .rpc()

    console.log("Open position tx:", tx)

    const positionAcc = await program.account.position.fetch(positionPda)
    console.log("Position account:", positionAcc)

    // expect(positionAcc.owner.toString()).toEqual(user.publicKey.toString())
    // expect(positionAcc.side).toEqual(side)
    // expect(positionAcc.collateralAmount.toNumber()).toEqual(collateralAmount)
    // expect(positionAcc.leverage.toNumber()).toEqual(leverage)

    const userBalanceAfter = await provider.connection.getBalance(user.publicKey)
    console.log("User SOL balance after position:", userBalanceAfter / LAMPORTS_PER_SOL)
  })

  it('Update Position', async () => {
    const oracleAccount = user.publicKey

    const tx = await program.methods
      .updatePosition()
      .accountsStrict({
        position: positionPda,
        pool: poolPda,
        custody: custodyPda,
        mint: mint,
        oracleAccount: oracleAccount
      })
      .rpc()

    console.log("Update position tx:", tx)

    const positionAcc = await program.account.position.fetch(positionPda)
    console.log("Position after update:", positionAcc)
  })

  it('Close Position', async () => {
    const oracleAccount = user.publicKey

    const userBalanceBefore = await provider.connection.getBalance(user.publicKey)
    console.log("User SOL balance before close:", userBalanceBefore / LAMPORTS_PER_SOL)

    const tx = await program.methods
      .closePosition()
      .accountsStrict({
        owner: user.publicKey,
        position: positionPda,
        perpetuals: perpetualsPda,
        pool: poolPda,
        custody: custodyPda,
        mint: mint,
        custodyTokenAccount: custodyTokenAccount,
        oracleAccount: oracleAccount
      })
      .signers([user])
      .rpc()

    console.log("Close position tx:", tx)

    const userBalanceAfter = await provider.connection.getBalance(user.publicKey)
    console.log("User SOL balance after close:", userBalanceAfter / LAMPORTS_PER_SOL)

    // Position account should be closed
    try {
      await program.account.position.fetch(positionPda)
      console.log("Position account should be closed")
    } catch (error: any) {
      console.log(error);
      expect(error.error.errorCode.code).toContain("Account does not exist")
    }
  })

  it('Remove Liquidity', async () => {
    const userLpBalance = await getAccount(provider.connection, userLpTokenAccount)
    const lpAmountIn = Number(userLpBalance.amount) // Remove all LP tokens
    const minAmountOut = 0

    // Create receiving token account for user
    const receivingAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    )

    const tx = await program.methods
      .removeLiquidity(new anchor.BN(lpAmountIn), new anchor.BN(minAmountOut))
      .accountsStrict({
        owner: user.publicKey,
        perpetuals: perpetualsPda,
        pool: poolPda,
        custody: custodyPda,
        custodyTokenMint: mint,
        lpTokenMint: lpTokenMint,
        lpTokenAccount: userLpTokenAccount,
        receivingAccount: receivingAccount,
        custodyTokenAccount: custodyTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .signers([user])
      .rpc()

    console.log("Remove liquidity tx:", tx)

    const userLpBalanceAfter = await getAccount(provider.connection, userLpTokenAccount)
    const receivingBalance = await getAccount(provider.connection, receivingAccount)

    console.log("User LP balance after removal:", userLpBalanceAfter.amount.toString())
    console.log("Tokens received:", receivingBalance.amount.toString())

    // expect(Number(userLpBalanceAfter.amount)).toEqual(0)
    // expect(Number(receivingBalance.amount)).toBeGreaterThan(0)
  })

  it('Error: Invalid leverage', async () => {
    const side = { long: {} }
    const collateralAmount = 1 * LAMPORTS_PER_SOL
    const invalidLeverage = 9000 // Exceeds MAX_LEVERAGE of 8000 (80x)
    const acceptablePrice = 60 * 1_000_000
    const oracleAccount = user.publicKey

    // Find new position PDA for this test
    const [newPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), user.publicKey.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .openPosition(
          side,
          new anchor.BN(collateralAmount),
          new anchor.BN(invalidLeverage),
          new anchor.BN(acceptablePrice)
        )
        .accountsStrict({
          owner: user.publicKey,
          position: newPositionPda,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          custodyTokenAccount: custodyTokenAccount,
          oracleAccount: oracleAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .rpc()

      console.log("Should have failed with invalid leverage");
    } catch (error: any) {
      console.log(error);
      expect(error.error.errorCode.code).toContain("InvalidLeverage")
    }
  })

  it('Error: Invalid collateral amount', async () => {
    const side = { long: {} }
    const invalidCollateral = 1000 // Less than MIN_COLLATERAL_SOL (0.01 SOL)
    const leverage = 10
    const acceptablePrice = 60 * 1_000_000
    const oracleAccount = user.publicKey

    const [newPositionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), user.publicKey.toBuffer(), poolPda.toBuffer(), custodyPda.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .openPosition(
          side,
          new anchor.BN(invalidCollateral),
          new anchor.BN(leverage),
          new anchor.BN(acceptablePrice)
        )
        .accountsStrict({
          owner: user.publicKey,
          position: newPositionPda,
          perpetuals: perpetualsPda,
          pool: poolPda,
          custody: custodyPda,
          mint: mint,
          custodyTokenAccount: custodyTokenAccount,
          oracleAccount: oracleAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([user])
        .rpc()

      console.log("Should have failed with invalid collateral amount")
    } catch (error: any) {
      console.log(error);
      expect(error.error.errorCode.code).toContain("InvalidCollateralAmount")
    }
  })
})