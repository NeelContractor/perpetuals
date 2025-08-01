#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, mint_to, Burn, transfer, burn};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

declare_id!("F5SxeR2fW3R23GVCBSicwk45Zn9nhDCgSPHXirm2Vsom");

const PRICE_PRECISION: u64 = 1_000_000; // 6 decimals
const USD_PRECISION: u64 = 1_000_000; // 6 decimals
const BPS_PRECISION: u64 = 10_000; //1e4 for basis points
const MAX_LEVERAGE: u32 = 8000; // 80x max leverage
const LIQUIDATION_THRESHOLD: u64 = 8000; // 80% in basis points
const MIN_COLLATERAL_SOL: u64 = 10_000_000; // 0.01 SOL minimum (in lamports) 
const MAX_PRICE_AGE: u64 = 60; // 60 seconds max age for price

#[program]
pub mod perpetuals {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, min_signatures: u8, admins: Vec<Pubkey>) -> Result<()> {
        let perpetuals = &mut ctx.accounts.perpetuals;
        perpetuals.permissions = Permissions {
            allow_swap: true,
            allow_add_liquidity: true,
            allow_remove_liquidity: true,
            allow_open_position: true,
            allow_close_position: true,
            allow_pnl_withdrawal: true,
            allow_collateral_withdrawal: true,
            allow_size_change: true,
        };
        perpetuals.pools = Vec::new();
        perpetuals.admin_authority = ctx.accounts.admin.key();
        perpetuals.min_signatures = min_signatures;
        perpetuals.admins = admins;
        perpetuals.bump = ctx.bumps.perpetuals;

        Ok(())
    }

    pub fn add_pool(ctx: Context<AddPool>, name: String) -> Result<()> {
        require!(name.len() <= 64, PerpError::InvalidPoolName);

        let pool = &mut ctx.accounts.pool;
        pool.name = name;
        pool.custodies = Vec::new();
        pool.aum_usd = 0;
        pool.bump = ctx.bumps.pool;
        pool.lp_token_bump = ctx.bumps.lp_token_mint;
        pool.inception_time = Clock::get()?.unix_timestamp;

        // add pool to perpetuals
        let perpetuals = &mut ctx.accounts.perpetuals;
        perpetuals.pools.push(ctx.accounts.pool.key());

        Ok(())
    }

    pub fn add_custody(ctx: Context<AddCustody>, is_stable: bool, oracle_type: OracleType, initial_price: u64) -> Result<()> {
        require!(initial_price > 0, PerpError::InvalidPrice);

        let custody = &mut ctx.accounts.custody;
        custody.pool = ctx.accounts.pool.key();
        custody.mint = ctx.accounts.custody_token_account.key();
        custody.decimals = ctx.accounts.custody_token_mint.decimals;
        custody.is_stable = is_stable;
        custody.oracle = Pubkey::default();
        custody.oracle_type = oracle_type;
        custody.bump = ctx.bumps.custody;
        custody.token_account_bump = ctx.bumps.custody_token_account;

        //intialize pricing and configuration
        custody.pricing = PricingParams {
            use_ema: true,
            use_unrealized_pnl_in_aum: true,
            trade_spread_long: 50, // 0.5%
            trade_spread_short: 50, // 0.5%
            swap_spread: 30, // 0.3%
            max_leverage: 50_000, // 50x leverage
            max_global_short_size_usd: 10_000_000 * USD_PRECISION, 
            max_global_long_size_usd: 10_000_000 * USD_PRECISION, 
            current_price: initial_price,
            ema_price: initial_price,
            last_update_time: Clock::get()?.unix_timestamp
        };

        custody.fees = Fees {
            swap_in: 30, // 0.30%
            swap_out: 30, // 0.30%
            stable_swap_in: 10, // 0.10%
            stable_swap_out: 10, // 0.10%
            add_liquidity: 30, // 0.30%
            remove_liquidity: 30,  // 0.30%
            open_position: 100, // 1.00%
            close_position: 100, // 1.00%
            liquidation: 500, // 5.00%
            protocol_share: 2000, // 20% of fee
        };

        custody.borrow_rate = BorrowRateParams {
            base_rate: 0,
            slope1: 80_000, // 8% at optimal ratio
            slope2: 800_000, // 80% at 100% utilization
            optimal_utilization: 800_000, // 80%
        };

        custody.assets = Assets {
            collateral: 0,
            protocol_fees: 0,
            owned: 0,
            locked: 0
        };

        custody.volume_stats = VolumeStats {
            swap_usd: 0,
            add_liquidity_usd: 0,
            remove_liquidity_usd: 0,
            open_position_usd: 0,
            close_position_usd: 0,
            liquidation_usd: 0,
        };

        custody.trade_stats = TradeStats {
            oi_long_usd: 0,
            oi_short_usd: 0,
            total_long_funding: 0,
            total_short_funding: 0
        };

        let pool = &mut ctx.accounts.pool;
        pool.custodies.push(ctx.accounts.custody.key());

        Ok(())
    }

    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        require!(new_price > 0, PerpError::InvalidPrice);

        let custody = &mut ctx.accounts.custody;
        let clock = Clock::get()?;

        //update EMA price simple impl
        let time_diff = clock.unix_timestamp - custody.pricing.last_update_time;
        if time_diff > 0 {
            let alpha = std::cmp::min(time_diff as u64, 3600) * 1000 / 3600; // max 1 hour smoothing
            custody.pricing.ema_price = (custody.pricing.ema_price * (1000 - alpha) + new_price * alpha) / 1000;
        }

        custody.pricing.current_price = new_price;
        custody.pricing.last_update_time = clock.unix_timestamp;

        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, amount_in: u64, min_lp_amount_out: u64) -> Result<()> {
        require!(amount_in > 0, PerpError::InvalidAmount);
        require!(ctx.accounts.perpetuals.permissions.allow_add_liquidity, PerpError::ActionNotAllowed);

        let custody = &ctx.accounts.custody;
        let pool = &ctx.accounts.pool;

        //calculate LP tokens based on pool value 
        let pool_value = calculate_pool_value(&pool, &[custody.clone()])?;
        let lp_suppy = ctx.accounts.lp_token_mint.supply;

        let lp_amount_out = if lp_suppy == 0 {
            amount_in // intial LP tokens 1:1
        } else {
            //lp tokens = (amount_in + total_lp_supply) / pool_value
            (amount_in as u128 * lp_suppy as u128 / pool_value as u128) as u64
        };

        require!(lp_amount_out >= min_lp_amount_out, PerpError::SlippageExceeded);

        //calculate fee
        let fee_amount = amount_in * custody.fees.add_liquidity / BPS_PRECISION;
        let net_amount = amount_in - fee_amount;

        // transfer tokens form user to custody 
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.funding_account.to_account_info(),
            to: ctx.accounts.custody_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info()
        };

        let transfer_ctx  = CpiContext::new(cpi_program.clone(), cpi_accounts);
        transfer(transfer_ctx, amount_in)?;

        // mint lp tokens to user
        let pool_seeds = &[
            b"pool".as_ref(),
            pool.name.as_bytes(),
            &[pool.bump]
        ];
        let signer_seeds = &[&pool_seeds[..]];

        let mint_accounts = MintTo {
            mint: ctx.accounts.lp_token_mint.to_account_info(),
            to: ctx.accounts.lp_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info()
        };

        let mint_ctx = CpiContext::new_with_signer(
            cpi_program, 
            mint_accounts, 
            signer_seeds
        );

        mint_to(mint_ctx, lp_amount_out)?;

        //update custody assets
        let custody_mut = &mut ctx.accounts.custody;
        custody_mut.assets.owned = custody_mut.assets.owned.checked_add(net_amount).ok_or(PerpError::MathOverflow)?;
        custody_mut.assets.protocol_fees = custody_mut.assets.protocol_fees.checked_add(fee_amount).ok_or(PerpError::MathOverflow)?;
        custody_mut.volume_stats.add_liquidity_usd = custody_mut.volume_stats.add_liquidity_usd.checked_add(amount_in as u128).ok_or(PerpError::MathOverflow)?;

        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lp_amount_in: u64, min_amount_out: u64) -> Result<()> {
        require!(lp_amount_in > 0, PerpError::InvalidAmount);
        require!(ctx.accounts.perpetuals.permissions.allow_remove_liquidity, PerpError::ActionNotAllowed);

        let custody = &ctx.accounts.custody;
        let pool = &ctx.accounts.pool;
        let lp_supply = ctx.accounts.lp_token_mint.supply;

        require!(lp_supply > 0, PerpError::InsufficientLiquidity);

        //calculate tokens to withdraw: (lp_amount * custody_balance) / lp_supply
        let custody_balance = ctx.accounts.custody_token_account.amount;
        let gross_amount_out = (lp_amount_in as u128 * custody_balance as u128 / lp_supply as u128) as u64;

        //calculate fee
        let fee_amount = gross_amount_out * custody.fees.remove_liquidity / BPS_PRECISION;
        let amount_out = gross_amount_out - fee_amount;

        require!(amount_out >= min_amount_out, PerpError::SlippageExceeded);
        require!(custody_balance >= gross_amount_out, PerpError::InsufficientLiquidity);

        //burn lp tokens
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let burn_accounts = Burn {
            mint: ctx.accounts.lp_token_mint.to_account_info(),
            from: ctx.accounts.lp_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info()
        };
        let burn_ctx = CpiContext::new(cpi_program, burn_accounts);
        burn(burn_ctx, lp_amount_in)?;

        // Transfer tokens from custody to user
        let pool_seeds = &[
            b"pool".as_ref(),
            pool.name.as_bytes(),
            &[pool.bump],
        ];
        let signer = &[&pool_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.custody_token_account.to_account_info(),
                to: ctx.accounts.receiving_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, amount_out)?;

        // Update custody assets
        let custody_mut = &mut ctx.accounts.custody;
        custody_mut.assets.owned = custody_mut.assets.owned.checked_sub(gross_amount_out).ok_or(PerpError::MathOverflow)?;
        custody_mut.assets.protocol_fees = custody_mut.assets.protocol_fees.checked_add(fee_amount).ok_or(PerpError::MathOverflow)?;
        custody_mut.volume_stats.remove_liquidity_usd = custody_mut.volume_stats.remove_liquidity_usd.checked_add(gross_amount_out as u128).ok_or(PerpError::MathOverflow)?;

        Ok(())
    }

    pub fn open_position(ctx: Context<OpenPosition>, side: Side, collateral_amount: u64, leverage: u64, acceptable_price: u64) -> Result<()> {
        require!(leverage > 0 && leverage <= MAX_LEVERAGE as u64, PerpError::InvalidLeverage);
        require!(collateral_amount >= MIN_COLLATERAL_SOL, PerpError::InvalidCollateralAmount);
        require!(ctx.accounts.perpetuals.permissions.allow_open_position, PerpError::ActionNotAllowed);

        let clock = Clock::get()?;
        let current_price = get_oracle_price(
            &ctx.accounts.custody, 
            &ctx.accounts.oracle_account, 
            &clock
        )?;

        // Check slippage
        match side {
            Side::Long => {
                require!(current_price <= acceptable_price, PerpError::PriceSlippageExceeded);
            },
            Side::Short => {
                require!(current_price >= acceptable_price, PerpError::PriceSlippageExceeded);
            }
        }

        let size_usd = collateral_amount
            .checked_mul(leverage)
            .ok_or(PerpError::MathOverflow)?;

        let opening_fee = size_usd  
            .checked_mul(ctx.accounts.custody.fees.open_position)
            .ok_or(PerpError::MathOverflow)?
            .checked_div(BPS_PRECISION)
            .ok_or(PerpError::MathOverflow)?;

        let total_collateral_needed = collateral_amount
            .checked_add(opening_fee)
            .ok_or(PerpError::MathOverflow)?;

        // Transfer collateral + fee from user (SOL)
        let lamports_to_transfer = total_collateral_needed;
        
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? -= lamports_to_transfer;
        **ctx.accounts.custody_token_account.to_account_info().try_borrow_mut_lamports()? += lamports_to_transfer;

        // Update custody
        let custody = &mut ctx.accounts.custody;
        custody.assets.collateral = custody.assets.collateral
            .checked_add(collateral_amount)
            .ok_or(PerpError::MathOverflow)?;
        custody.assets.protocol_fees = custody.assets.protocol_fees
            .checked_add(opening_fee)
            .ok_or(PerpError::MathOverflow)?;

        // Update open interest
        match side {
            Side::Long => {
                custody.trade_stats.oi_long_usd = custody.trade_stats.oi_long_usd
                    .checked_add(size_usd)
                    .ok_or(PerpError::MathOverflow)?;
            },
            Side::Short => {
                custody.trade_stats.oi_short_usd = custody.trade_stats.oi_short_usd
                    .checked_add(size_usd)
                    .ok_or(PerpError::MathOverflow)?;
            }
        }

        // Initialize position
        let position = &mut ctx.accounts.position;
        position.owner = ctx.accounts.owner.key();
        position.pool = ctx.accounts.pool.key();
        position.custody = ctx.accounts.custody.key();
        position.side = side;
        position.collateral_amount = collateral_amount;
        position.leverage = leverage;
        position.size_usd = size_usd;
        position.entry_price = current_price;
        position.entry_timestamp = clock.unix_timestamp;
        position.unrealized_pnl = 0;
        position.bump = ctx.bumps.position;

        Ok(())
    }

    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        require!(ctx.accounts.perpetuals.permissions.allow_close_position, PerpError::ActionNotAllowed);
        
        let clock = Clock::get()?;
        let current_price = get_oracle_price(
            &ctx.accounts.custody, 
            &ctx.accounts.oracle_account, 
            &clock
        )?;

        let position = &ctx.accounts.position;
        // Calculate PnL
        let pnl = calculate_pnl(position, current_price)?;

        let closing_fee = position.size_usd
            .checked_mul(ctx.accounts.custody.fees.close_position)
            .ok_or(PerpError::MathOverflow)?
            .checked_div(BPS_PRECISION)
            .ok_or(PerpError::MathOverflow)?;

        let mut transfer_amount = position.collateral_amount;

        if pnl >= 0 {
            transfer_amount = transfer_amount
                .checked_add(pnl as u64)
                .ok_or(PerpError::MathOverflow)?;
        } else {
            transfer_amount = transfer_amount
                .saturating_sub((-pnl) as u64);
        }

        transfer_amount = transfer_amount.saturating_sub(closing_fee);

        // Get custody balance (SOL lamports)
        let custody_balance = ctx.accounts.custody_token_account.get_lamports();
        transfer_amount = transfer_amount.min(custody_balance);

        // Transfer SOL to user if amount > 0
        if transfer_amount > 0 {
            **ctx.accounts.custody_token_account.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
            **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += transfer_amount;
        }

        // Update custody
        let custody = &mut ctx.accounts.custody;
        custody.assets.collateral = custody.assets.collateral.saturating_sub(position.collateral_amount);
        custody.assets.protocol_fees = custody.assets.protocol_fees
            .checked_add(closing_fee)
            .ok_or(PerpError::MathOverflow)?;

        // Update open interest
        match position.side {
            Side::Long => {
                custody.trade_stats.oi_long_usd = custody.trade_stats.oi_long_usd
                    .saturating_sub(position.size_usd);
            },
            Side::Short => {
                custody.trade_stats.oi_short_usd = custody.trade_stats.oi_short_usd
                    .saturating_sub(position.size_usd);
            }
        }
        
        Ok(())
    }

    pub fn liquidate_position(ctx: Context<LiquidatePosition>) -> Result<()> {
        let clock = Clock::get()?;
        let current_price = get_oracle_price(
            &ctx.accounts.custody, 
            &ctx.accounts.oracle_account, 
            &clock
        )?;

        let position = &ctx.accounts.position;
        let liquidation_price = calculate_liquidation_price(position, LIQUIDATION_THRESHOLD)?;

        let can_liquidate = match position.side {
            Side::Long => current_price <= liquidation_price,
            Side::Short => current_price >= liquidation_price,
        };

        require!(can_liquidate, PerpError::PositionNotLiquidatable);

        let pnl = calculate_pnl(position, current_price)?;

        // In liquidation, user gets remaining collateral after losses
        let remaining_collateral = if pnl < 0 {
            position.collateral_amount.saturating_sub((-pnl) as u64)
        } else {
            position.collateral_amount
        };

        let liquidation_fee = remaining_collateral.min(
            position.size_usd
                .checked_mul(ctx.accounts.custody.fees.liquidation)
                .ok_or(PerpError::MathOverflow)?
                .checked_div(BPS_PRECISION)
                .ok_or(PerpError::MathOverflow)?
        );
        let user_amount = remaining_collateral.saturating_sub(liquidation_fee);

        // Transfer liquidation fee to liquidator (SOL)
        if liquidation_fee > 0 {
            **ctx.accounts.custody_token_account.to_account_info().try_borrow_mut_lamports()? -= liquidation_fee;
            **ctx.accounts.liquidator.to_account_info().try_borrow_mut_lamports()? += liquidation_fee;
        }

        // Transfer remaining amount to position owner (SOL)
        if user_amount > 0 {
            **ctx.accounts.custody_token_account.to_account_info().try_borrow_mut_lamports()? -= user_amount;
            **ctx.accounts.position_owner.to_account_info().try_borrow_mut_lamports()? += user_amount;
        }

        // Update custody
        let custody = &mut ctx.accounts.custody;
        custody.assets.collateral = custody.assets.collateral.saturating_sub(position.collateral_amount);

        // Update open interest
        match position.side {
            Side::Long => {
                custody.trade_stats.oi_long_usd = custody.trade_stats.oi_long_usd
                    .saturating_sub(position.size_usd);
            },
            Side::Short => {
                custody.trade_stats.oi_short_usd = custody.trade_stats.oi_short_usd
                    .saturating_sub(position.size_usd);
            }
        }

        Ok(())
    }

    pub fn update_position(ctx: Context<UpdatePosition>) -> Result<()> {
        let clock = Clock::get()?;
        let current_price = get_oracle_price(
            &ctx.accounts.custody, 
            &ctx.accounts.oracle_account, 
            &clock
        )?;
        let position = &mut ctx.accounts.position;
        position.unrealized_pnl = calculate_pnl(position, current_price)?;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        space = 8 + Perpetuals::INIT_SPACE,
        payer = admin,
        seeds = [b"perpetuals"],
        bump 
    )]
    pub perpetuals: Account<'info, Perpetuals>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct AddPool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", name.as_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = pool,
        seeds = [b"lp_token_mint", pool.key().as_ref()],
        bump
    )]
    pub lp_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"perpetuals"],
        bump = perpetuals.bump,
        constraint = perpetuals.admin_authority == authority.key()
    )]
    pub perpetuals: Account<'info, Perpetuals>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCustody<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Custody::INIT_SPACE,
        seeds = [b"custody", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump
    )]
    pub custody: Account<'info, Custody>,

    pub custody_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump,
        constraint = perpetuals.admin_authority == authority.key()
    )]
    pub perpetuals: Account<'info, Perpetuals>,

    #[account(
        init,
        payer = authority,
        token::mint = custody_token_mint,
        token::authority = custody,
        seeds = [b"custody_token_account", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump
    )]
    pub perpetuals: Account<'info, Perpetuals>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub custody_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"lp_token_mint", pool.key().as_ref()],
        bump = pool.lp_token_bump
    )]
    pub lp_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = custody_token_mint,
        token::authority = owner
    )]
    pub funding_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = lp_token_mint,
        token::authority = owner
    )]
    pub lp_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"custody_token_account", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump
    )]
    pub perpetuals: Account<'info, Perpetuals>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub custody_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"lp_token_mint", pool.key().as_ref()],
        bump = pool.lp_token_bump
    )]
    pub lp_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = lp_token_mint,
        token::authority = owner
    )]
    pub lp_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = custody_token_mint,
        token::authority = owner
    )]
    pub receiving_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"custody_token_account", pool.key().as_ref(), custody_token_mint.key().as_ref()],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub mint: Account<'info, Mint>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump,
        constraint = perpetuals.admin_authority == authority.key()
    )]
    pub perpetuals: Account<'info, Perpetuals>,
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", owner.key().as_ref(), pool.key().as_ref(), custody.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump
    )]
    pub perpetuals: Account<'info, Perpetuals>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"custody_token_account", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    /// CHECK: Oracle account validation happens in instruction
    pub oracle_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"position", owner.key().as_ref(), pool.key().as_ref(), custody.key().as_ref()],
        bump = position.bump,
        has_one = owner,
        close = owner
    )]
    pub position: Account<'info, Position>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.bump
    )]
    pub perpetuals: Account<'info, Perpetuals>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"custody_token_account", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    /// CHECK: Oracle account validation happens in instruction
    pub oracle_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct LiquidatePosition<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,

    /// CHECK: Position owner account
    #[account(mut)]
    pub position_owner: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"position", position.owner.key().as_ref(), pool.key().as_ref(), custody.key().as_ref()],
        bump = position.bump,
        close = liquidator
    )]
    pub position: Account<'info, Position>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"custody", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"custody_token_account", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Account<'info, TokenAccount>,

    /// CHECK: Oracle account validation happens in instruction
    pub oracle_account: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdatePosition<'info> {
    #[account(
        mut,
        seeds = [b"position", position.owner.key().as_ref(), pool.key().as_ref(), custody.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        seeds = [b"custody", pool.key().as_ref(), mint.key().as_ref()],
        bump = custody.bump
    )]
    pub custody: Account<'info, Custody>,

    pub mint: Account<'info, Mint>,

    /// CHECK: Oracle account validation happens in instruction
    pub oracle_account: AccountInfo<'info>,
}

// Account Data Structures
#[account]
#[derive(InitSpace)]
pub struct Perpetuals {
    pub admin_authority: Pubkey,
    pub min_signatures: u8,
    #[max_len(5)]
    pub admins: Vec<Pubkey>,
    #[max_len(10)]
    pub pools: Vec<Pubkey>,
    pub permissions: Permissions,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Permissions {
    pub allow_swap: bool,
    pub allow_add_liquidity: bool,
    pub allow_remove_liquidity: bool,
    pub allow_open_position: bool,
    pub allow_close_position: bool,
    pub allow_pnl_withdrawal: bool,
    pub allow_collateral_withdrawal: bool,
    pub allow_size_change: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    #[max_len(64)]
    pub name: String,
    #[max_len(10)]
    pub custodies: Vec<Pubkey>,
    pub aum_usd: u64,
    pub bump: u8,
    pub lp_token_bump: u8,
    pub inception_time: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Custody {
    pub pool: Pubkey,
    pub mint: Pubkey,
    pub decimals: u8,
    pub is_stable: bool,
    pub oracle: Pubkey,
    pub oracle_type: OracleType,
    pub pricing: PricingParams,
    pub fees: Fees,
    pub borrow_rate: BorrowRateParams,
    pub assets: Assets,
    pub volume_stats: VolumeStats,
    pub trade_stats: TradeStats,
    #[max_len(64)]
    pub feed_id: Option<String>,
    pub bump: u8,
    pub token_account_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PricingParams {
    pub use_ema: bool,
    pub use_unrealized_pnl_in_aum: bool,
    pub trade_spread_long: u64,
    pub trade_spread_short: u64,
    pub swap_spread: u64,
    pub max_leverage: u64,
    pub max_global_short_size_usd: u64,
    pub max_global_long_size_usd: u64,
    pub current_price: u64,
    pub ema_price: u64,
    pub last_update_time: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Fees {
    pub swap_in: u64,
    pub swap_out: u64,
    pub stable_swap_in: u64,
    pub stable_swap_out: u64,
    pub add_liquidity: u64,
    pub remove_liquidity: u64,
    pub open_position: u64,
    pub close_position: u64,
    pub liquidation: u64,
    pub protocol_share: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct BorrowRateParams {
    pub base_rate: u64,
    pub slope1: u64,
    pub slope2: u64,
    pub optimal_utilization: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Assets {
    pub collateral: u64,
    pub protocol_fees: u64,
    pub owned: u64,
    pub locked: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct VolumeStats {
    pub swap_usd: u128,
    pub add_liquidity_usd: u128,
    pub remove_liquidity_usd: u128,
    pub open_position_usd: u128,
    pub close_position_usd: u128,
    pub liquidation_usd: u128,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TradeStats {
    pub oi_long_usd: u64,
    pub oi_short_usd: u64,
    pub total_long_funding: i64,
    pub total_short_funding: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub custody: Pubkey,
    pub side: Side,
    pub collateral_amount: u64,
    pub leverage: u64,
    pub size_usd: u64,
    pub entry_price: u64,
    pub entry_timestamp: i64,
    pub unrealized_pnl: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum OracleType {
    Pyth, 
    Custom,
    None
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum Side {
    Long, 
    Short
}

// Helper Functions
fn calculate_pool_value(_pool: &Pool, custodies: &[Account<Custody>]) -> Result<u64> {
    let mut total_value = 0u64;
    
    for custody in custodies {
        let custody_value = custody.assets.owned
            .checked_mul(custody.pricing.current_price)
            .ok_or(PerpError::MathOverflow)?
            .checked_div(PRICE_PRECISION)
            .ok_or(PerpError::MathOverflow)?;
        
        total_value = total_value
            .checked_add(custody_value)
            .ok_or(PerpError::MathOverflow)?;
    }
    
    Ok(total_value.max(1)) // Prevent division by zero
}

fn calculate_pnl(position: &Position, current_price: u64) -> Result<i64> {
    if current_price == 0 || position.entry_price == 0 {
        return Err(PerpError::InvalidOraclePrice.into());
    }

    let pnl = match position.side {
        Side::Long => calculate_long_pnl(position, current_price)?,
        Side::Short => calculate_short_pnl(position, current_price)?
    };

    Ok(pnl)
}

fn calculate_long_pnl(position: &Position, current_price: u64) -> Result<i64> {
    // PnL = (current_price - entry_price) / entry_price * position_size
    let price_diff = current_price as i128 - position.entry_price as i128;
    let position_size = position.size_usd as i128;

    let pnl = price_diff
        .checked_mul(position_size)
        .ok_or(PerpError::MathOverflow)?
        .checked_div(position.entry_price as i128)
        .ok_or(PerpError::MathOverflow)?;

    pnl.try_into().map_err(|_| PerpError::MathOverflow.into())
}

fn calculate_short_pnl(position: &Position, current_price: u64) -> Result<i64> {
    // PnL = (entry_price - current_price) / entry_price * position_size
    let price_diff = position.entry_price as i128 - current_price as i128;
    let position_size = position.size_usd as i128;

    let pnl = price_diff    
        .checked_mul(position_size)
        .ok_or(PerpError::MathOverflow)?
        .checked_div(position.entry_price as i128)
        .ok_or(PerpError::MathOverflow)?;

    pnl.try_into().map_err(|_| PerpError::MathOverflow.into())
}

fn get_oracle_price(custody: &Account<Custody>, oracle_account: &AccountInfo, clock: &Clock) -> Result<u64> {
    match custody.oracle_type {
        OracleType::Pyth => get_pyth_price(custody, oracle_account, clock),
        OracleType::Custom => get_custom_price(oracle_account, clock),
        OracleType::None => Ok(custody.pricing.current_price) // Return stored price for custom/stable assets
    }
}

fn get_pyth_price(custody: &Account<Custody>, oracle_account: &AccountInfo, clock: &Clock) -> Result<u64> {
    let price_update = PriceUpdateV2::try_deserialize(&mut oracle_account.data.borrow().as_ref())
        .map_err(|_| PerpError::InvalidOraclePrice)?;

    let binding = "0xe62df6c8b4c85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43".to_string();
    // Use configurable feed ID or fallback to default SOL/USD
    let feed_id_str = custody.feed_id.as_ref()
        .unwrap_or(&binding);
    
    let feed_id = get_feed_id_from_hex(feed_id_str)
        .map_err(|_| PerpError::InvalidOraclePrice)?;

    let price_feed = price_update.get_price_no_older_than(
        clock, 
        MAX_PRICE_AGE, 
        &feed_id,
    ).map_err(|_| PerpError::PriceTooOld)?;

    if price_feed.price < 0 {
        return Err(PerpError::InvalidOraclePrice.into());
    }

    let price_u64 = price_feed.price as u64;
    let expo = price_feed.exponent;

    // Convert to our PRICE_PRECISION (6 decimals)
    let normalized_price = if expo >= 0 {
        // Price has positive exponent, multiply
        price_u64
            .checked_mul(10_u64.pow(expo as u32))
            .ok_or(PerpError::MathOverflow)?
            .checked_mul(PRICE_PRECISION)
            .ok_or(PerpError::MathOverflow)?
    } else {
        // Price has negative exponent, need to adjust
        let divisor = 10_u64.pow((-expo) as u32);
        if divisor >= PRICE_PRECISION {
            // Pyth has more decimals than our precision
            price_u64
                .checked_mul(PRICE_PRECISION)
                .ok_or(PerpError::MathOverflow)?
                .checked_div(divisor)
                .ok_or(PerpError::MathOverflow)?
        } else {
            // Pyth has fewer decimals than our precision
            price_u64
                .checked_mul(PRICE_PRECISION)
                .ok_or(PerpError::MathOverflow)?
                .checked_div(divisor)
                .ok_or(PerpError::MathOverflow)?
        }
    };

    Ok(normalized_price)
}

fn get_custom_price(oracle_account: &AccountInfo, _clock: &Clock) -> Result<u64> {
    // This would be implemented based on custom oracle format
    let data = oracle_account.try_borrow_data()?;
    if data.len() < 8 {
        return Err(PerpError::InvalidOraclePrice.into());
    }

    let price_bytes: [u8; 8] = data[0..8].try_into()
        .map_err(|_| PerpError::InvalidOraclePrice)?;
    let price = u64::from_le_bytes(price_bytes);

    Ok(price)
}

pub fn calculate_liquidation_price(position: &Position, liquidation_threshold: u64) -> Result<u64> {
    let threshold_ratio = liquidation_threshold as f64 / BPS_PRECISION as f64;
    let leverage_ratio = position.leverage as f64;

    let liquidation_price = match position.side {
        Side::Long => {
            let price_drop_ratio = threshold_ratio / leverage_ratio;
            let liquidation_price = position.entry_price as f64 * (1.0 - price_drop_ratio);
            liquidation_price as u64
        },
        Side::Short => {
            let price_rise_ratio = threshold_ratio / leverage_ratio;
            let liquidation_price = position.entry_price as f64 * (1.0 + price_rise_ratio);
            liquidation_price as u64
        }
    };

    Ok(liquidation_price)
}

#[error_code]
pub enum PerpError {
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid pool name")]
    InvalidPoolName,
    #[msg("Invalid oracle price")]
    InvalidOraclePrice,
    #[msg("Price too old")]
    PriceTooOld,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid leverage")]
    InvalidLeverage,
    #[msg("Invalid collateral amount")]
    InvalidCollateralAmount,
    #[msg("Position not liquidatable")]
    PositionNotLiquidatable,
    #[msg("Price slippage exceeded")]
    PriceSlippageExceeded,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Action not allowed")]
    ActionNotAllowed,
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}