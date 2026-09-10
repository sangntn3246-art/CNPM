/// OctaPoint credit ledger — object-centric loyalty/credit model on Sui.
///
/// Design:
///  - `AdminCap`      minted once at publish, held by the OctaPoint platform.
///  - `MerchantCap`   one per onboarded merchant, authorizes issuing/redeeming
///                    against that merchant's `Treasury`. Non-transferable in
///                    spirit (we don't add `store` beyond what's needed to move
///                    it to the merchant address once, at creation time).
///  - `Treasury`      one shared object per merchant. Holds aggregate counters
///                    and the earn/redeem policy. Mutating it requires the
///                    matching `MerchantCap`.
///  - `LoyaltyAccount` one owned object per (merchant, end user). Holds the
///                    actual point balance. Because it's an owned Sui object,
///                    Sui's consensus-free fast path can settle balance
///                    mutations for single-owner transactions with very low
///                    latency, which is what gives OctaPoint its sub-100ms
///                    target for POS checkout flows.
///
/// All mutating entry points emit an event so the off-chain API Gateway /
/// audit pipeline (Walrus-backed) can index a tamper-evident history without
/// re-deriving state from the ledger.
module octapoint::credit {
    use sui::event;
    use sui::clock::{Self, Clock};

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------
    const ENotMerchantOwner: u64 = 0;
    const ECapTreasuryMismatch: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const EAccountTreasuryMismatch: u64 = 3;
    const EAccountsNotSameMerchant: u64 = 4;
    const EZeroAmount: u64 = 5;

    // ---------------------------------------------------------------------
    // Capabilities
    // ---------------------------------------------------------------------

    /// Held by the OctaPoint platform operator. Authorizes onboarding new
    /// merchants (creating their Treasury + MerchantCap pair).
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Held by a single merchant. Required to issue or redeem credits
    /// against that merchant's Treasury.
    public struct MerchantCap has key, store {
        id: UID,
        treasury_id: ID,
    }

    // ---------------------------------------------------------------------
    // Shared objects
    // ---------------------------------------------------------------------

    /// Per-merchant policy + aggregate counters. Shared so the API Gateway
    /// can read it without owning it, while writes remain capability-gated.
    public struct Treasury has key {
        id: UID,
        merchant_name: vector<u8>,
        /// basis points: how many credit units per 1 unit of spend
        earn_rate_bps: u64,
        /// basis points: how many spend units 1 credit unit is worth on redeem
        redeem_rate_bps: u64,
        total_issued: u64,
        total_redeemed: u64,
        accounts_opened: u64,
        created_at_ms: u64,
    }

    // ---------------------------------------------------------------------
    // Owned objects
    // ---------------------------------------------------------------------

    /// One per (merchant, end user). Owned by the end user's address so
    /// wallet-abstracted (zkLogin/Enoki) accounts still get single-writer
    /// fast-path settlement.
    public struct LoyaltyAccount has key {
        id: UID,
        treasury_id: ID,
        balance: u64,
        lifetime_earned: u64,
        lifetime_redeemed: u64,
        last_updated_ms: u64,
    }

    // ---------------------------------------------------------------------
    // Events (consumed by the off-chain audit indexer)
    // ---------------------------------------------------------------------

    public struct MerchantOnboarded has copy, drop {
        treasury_id: ID,
        merchant_name: vector<u8>,
    }

    public struct CreditIssued has copy, drop {
        treasury_id: ID,
        account_id: ID,
        amount: u64,
        new_balance: u64,
        timestamp_ms: u64,
    }

    public struct CreditRedeemed has copy, drop {
        treasury_id: ID,
        account_id: ID,
        amount: u64,
        new_balance: u64,
        timestamp_ms: u64,
    }

    public struct CreditTransferred has copy, drop {
        treasury_id: ID,
        from_account: ID,
        to_account: ID,
        amount: u64,
        timestamp_ms: u64,
    }

    // ---------------------------------------------------------------------
    // Init — mint the single AdminCap to the publisher
    // ---------------------------------------------------------------------
    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            AdminCap { id: object::new(ctx) },
            tx_context::sender(ctx),
        );
    }

    // ---------------------------------------------------------------------
    // Merchant onboarding
    // ---------------------------------------------------------------------

    /// Platform admin onboards a new merchant: creates and shares their
    /// Treasury, and mints/transfers a MerchantCap to `merchant_addr`.
    public entry fun onboard_merchant(
        _admin: &AdminCap,
        merchant_addr: address,
        merchant_name: vector<u8>,
        earn_rate_bps: u64,
        redeem_rate_bps: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let treasury = Treasury {
            id: object::new(ctx),
            merchant_name,
            earn_rate_bps,
            redeem_rate_bps,
            total_issued: 0,
            total_redeemed: 0,
            accounts_opened: 0,
            created_at_ms: clock::timestamp_ms(clock),
        };
        let treasury_id = object::id(&treasury);

        let cap = MerchantCap {
            id: object::new(ctx),
            treasury_id,
        };

        event::emit(MerchantOnboarded { treasury_id, merchant_name: treasury.merchant_name });

        transfer::share_object(treasury);
        transfer::transfer(cap, merchant_addr);
    }

    // ---------------------------------------------------------------------
    // Account lifecycle
    // ---------------------------------------------------------------------

    /// Any end user opens a zero-balance loyalty account for a given
    /// merchant. Called once per (user, merchant) pair — typically triggered
    /// server-side right after zkLogin sign-in on first interaction.
    public entry fun open_account(
        treasury: &mut Treasury,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let account = LoyaltyAccount {
            id: object::new(ctx),
            treasury_id: object::id(treasury),
            balance: 0,
            lifetime_earned: 0,
            lifetime_redeemed: 0,
            last_updated_ms: clock::timestamp_ms(clock),
        };
        treasury.accounts_opened = treasury.accounts_opened + 1;
        transfer::transfer(account, tx_context::sender(ctx));
    }

    // ---------------------------------------------------------------------
    // Issue / redeem — capability gated
    // ---------------------------------------------------------------------

    public entry fun issue_credit(
        cap: &MerchantCap,
        treasury: &mut Treasury,
        account: &mut LoyaltyAccount,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(amount > 0, EZeroAmount);
        assert!(cap.treasury_id == object::id(treasury), ECapTreasuryMismatch);
        assert!(account.treasury_id == object::id(treasury), EAccountTreasuryMismatch);

        account.balance = account.balance + amount;
        account.lifetime_earned = account.lifetime_earned + amount;
        account.last_updated_ms = clock::timestamp_ms(clock);
        treasury.total_issued = treasury.total_issued + amount;

        event::emit(CreditIssued {
            treasury_id: object::id(treasury),
            account_id: object::id(account),
            amount,
            new_balance: account.balance,
            timestamp_ms: account.last_updated_ms,
        });
    }

    public entry fun redeem_credit(
        cap: &MerchantCap,
        treasury: &mut Treasury,
        account: &mut LoyaltyAccount,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(amount > 0, EZeroAmount);
        assert!(cap.treasury_id == object::id(treasury), ECapTreasuryMismatch);
        assert!(account.treasury_id == object::id(treasury), EAccountTreasuryMismatch);
        assert!(account.balance >= amount, EInsufficientBalance);

        account.balance = account.balance - amount;
        account.lifetime_redeemed = account.lifetime_redeemed + amount;
        account.last_updated_ms = clock::timestamp_ms(clock);
        treasury.total_redeemed = treasury.total_redeemed + amount;

        event::emit(CreditRedeemed {
            treasury_id: object::id(treasury),
            account_id: object::id(account),
            amount,
            new_balance: account.balance,
            timestamp_ms: account.last_updated_ms,
        });
    }

    // ---------------------------------------------------------------------
    // Peer-to-peer transfer (same merchant only) — no MerchantCap required,
    // callable directly by the end user who owns `from`.
    // ---------------------------------------------------------------------
    public entry fun transfer_credit(
        from: &mut LoyaltyAccount,
        to: &mut LoyaltyAccount,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(amount > 0, EZeroAmount);
        assert!(from.treasury_id == to.treasury_id, EAccountsNotSameMerchant);
        assert!(from.balance >= amount, EInsufficientBalance);

        from.balance = from.balance - amount;
        to.balance = to.balance + amount;
        let now = clock::timestamp_ms(clock);
        from.last_updated_ms = now;
        to.last_updated_ms = now;

        event::emit(CreditTransferred {
            treasury_id: from.treasury_id,
            from_account: object::id(from),
            to_account: object::id(to),
            amount,
            timestamp_ms: now,
        });
    }

    // ---------------------------------------------------------------------
    // Read helpers
    // ---------------------------------------------------------------------
    public fun balance(account: &LoyaltyAccount): u64 { account.balance }
    public fun treasury_totals(treasury: &Treasury): (u64, u64, u64) {
        (treasury.total_issued, treasury.total_redeemed, treasury.accounts_opened)
    }

    #[test_only]
    public fun admin_cap_for_testing(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }
}
