# OctaPoint Move Contract

Object-centric loyalty credit ledger for Sui.

## Build & test (requires the Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install)

```bash
sui move build
sui move test
```

## Deploy to testnet

```bash
sui client publish --gas-budget 100000000
```

Copy the resulting package id into `SUI_PACKAGE_ID` in the root `.env`, and
the `AdminCap` object id that gets transferred to your address — you'll need
it to call `onboard_merchant`.

## Module overview

See `sources/credit.move`. Key entry points:

- `onboard_merchant(admin_cap, merchant_addr, name, earn_rate_bps, redeem_rate_bps, clock, ctx)`
- `open_account(treasury, clock, ctx)`
- `issue_credit(merchant_cap, treasury, account, amount, clock, ctx)`
- `redeem_credit(merchant_cap, treasury, account, amount, clock, ctx)`
- `transfer_credit(from_account, to_account, amount, clock, ctx)`
