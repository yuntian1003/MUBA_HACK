#[test_only]
module smartsplit::smartsplit_tests;

use std::unit_test::assert_eq;
use sui::test_scenario as ts;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::tx_context;
use smartsplit::smartsplit;

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;
const CHARLIE: address = @0xCAFE;

const EEmptyRecipients: u64 = 0;
const EZeroAmount: u64 = 2;

#[test]
fun execute_equal_split_distributes_funds_and_returns_dust() {
    let mut scenario = ts::begin(ALICE);

    // Alice creates a coin of 100 MIST and splits it between Bob and Charlie (2 recipients)
    // 100 / 2 = 50 each, 0 dust
    {
        let ctx = scenario.ctx();
        let payment = coin::mint_for_testing<SUI>(100, ctx);
        let recipients = vector[BOB, CHARLIE];
        let purpose = b"Dinner split";

        smartsplit::execute_equal_split(payment, recipients, purpose, ctx);
    };

    // Bob should have received 50 MIST
    scenario.next_tx(BOB);
    {
        let bob_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(bob_coin.value(), 50);
        scenario.return_to_sender(bob_coin);
    };

    // Charlie should have received 50 MIST
    scenario.next_tx(CHARLIE);
    {
        let charlie_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(charlie_coin.value(), 50);
        scenario.return_to_sender(charlie_coin);
    };

    // Test uneven split: 101 MIST among 2 recipients -> 50 each, 1 dust back to Alice
    scenario.next_tx(ALICE);
    {
        let ctx = scenario.ctx();
        let payment = coin::mint_for_testing<SUI>(101, ctx);
        let recipients = vector[BOB, CHARLIE];
        let purpose = b"Uneven dinner split";

        smartsplit::execute_equal_split(payment, recipients, purpose, ctx);
    };

    // Alice should receive the 1 MIST dust back
    scenario.next_tx(ALICE);
    {
        let dust_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(dust_coin.value(), 1);
        scenario.return_to_sender(dust_coin);
    };

    scenario.end();
}

#[test, expected_failure(abort_code = EEmptyRecipients, location = smartsplit)]
fun execute_equal_split_aborts_on_empty_recipients() {
    let mut ctx = tx_context::dummy();
    let payment = coin::mint_for_testing<SUI>(100, &mut ctx);
    let recipients = vector[];
    let purpose = b"Empty split";

    smartsplit::execute_equal_split(payment, recipients, purpose, &mut ctx);
}

#[test, expected_failure(abort_code = EZeroAmount, location = smartsplit)]
fun execute_equal_split_aborts_on_zero_payment() {
    let mut ctx = tx_context::dummy();
    let payment = coin::mint_for_testing<SUI>(0, &mut ctx);
    let recipients = vector[BOB];
    let purpose = b"Zero split";

    smartsplit::execute_equal_split(payment, recipients, purpose, &mut ctx);
}
