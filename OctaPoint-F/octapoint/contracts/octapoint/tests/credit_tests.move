#[test_only]
module octapoint::credit_tests {
    use sui::test_scenario as ts;
    use sui::clock;
    use octapoint::credit::{Self, AdminCap, Treasury, MerchantCap, LoyaltyAccount};

    const ADMIN: address = @0xA1;
    const MERCHANT: address = @0xA2;
    const USER: address = @0xA3;

    #[test]
    fun issue_and_redeem_flow() {
        let mut scenario = ts::begin(ADMIN);

        // publish (init runs automatically in test_scenario for the module
        // under test in real setups; here we mint the AdminCap manually)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            sui::transfer::public_transfer(
                credit::admin_cap_for_testing(ctx),
                ADMIN,
            );
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            credit::onboard_merchant(
                &admin_cap, MERCHANT, b"Demo Mall", 100, 100, &clock, ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::next_tx(&mut scenario, USER);
        {
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            credit::open_account(&mut treasury, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(treasury);
        };

        ts::next_tx(&mut scenario, MERCHANT);
        {
            let cap = ts::take_from_sender<MerchantCap>(&scenario);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let mut account = ts::take_from_address<LoyaltyAccount>(&scenario, USER);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));

            credit::issue_credit(&cap, &mut treasury, &mut account, 500, &clock, ts::ctx(&mut scenario));
            assert!(credit::balance(&account) == 500, 0);

            credit::redeem_credit(&cap, &mut treasury, &mut account, 200, &clock, ts::ctx(&mut scenario));
            assert!(credit::balance(&account) == 300, 1);

            clock::destroy_for_testing(clock);
            ts::return_to_sender(&scenario, cap);
            ts::return_shared(treasury);
            ts::return_to_address(USER, account);
        };

        ts::end(scenario);
    }
}
