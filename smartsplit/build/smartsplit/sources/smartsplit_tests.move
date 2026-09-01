#[test_only]
module smartsplit::smartsplit_tests;

use std::unit_test::assert_eq;
use sui::test_scenario as ts;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use smartsplit::smartsplit;

const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;
const CHARLIE: address = @0xCAFE;

const EEmptyRecipients: u64 = 0;
const EAmountMismatch: u64 = 1;
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

    // Test uneven split dust refund
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

#[test]
fun execute_custom_split_handles_uneven_amounts() {
    let mut scenario = ts::begin(ALICE);

    // Alice pays 100 MIST: Bob gets 70 MIST, Charlie gets 30 MIST
    {
        let ctx = scenario.ctx();
        let payment = coin::mint_for_testing<SUI>(100, ctx);
        let recipients = vector[BOB, CHARLIE];
        let amounts = vector[70u64, 30u64];
        let purpose = b"Uneven itemized bill";

        smartsplit::execute_custom_split(payment, recipients, amounts, purpose, ctx);
    };

    // Bob gets 70
    scenario.next_tx(BOB);
    {
        let bob_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(bob_coin.value(), 70);
        scenario.return_to_sender(bob_coin);
    };

    // Charlie gets 30
    scenario.next_tx(CHARLIE);
    {
        let charlie_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(charlie_coin.value(), 30);
        scenario.return_to_sender(charlie_coin);
    };

    // Uneven with change refund: Alice pays 100 MIST, Bob gets 60, Charlie gets 25 -> 15 change to Alice
    scenario.next_tx(ALICE);
    {
        let ctx = scenario.ctx();
        let payment = coin::mint_for_testing<SUI>(100, ctx);
        let recipients = vector[BOB, CHARLIE];
        let amounts = vector[60u64, 25u64];
        let purpose = b"Uneven with change";

        smartsplit::execute_custom_split(payment, recipients, amounts, purpose, ctx);
    };

    // Alice gets 15 MIST refunded
    scenario.next_tx(ALICE);
    {
        let refund_coin = scenario.take_from_sender<Coin<SUI>>();
        assert_eq!(refund_coin.value(), 15);
        scenario.return_to_sender(refund_coin);
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

#[test, expected_failure(abort_code = EAmountMismatch, location = smartsplit)]
fun execute_custom_split_aborts_on_vector_mismatch() {
    let mut ctx = tx_context::dummy();
    let payment = coin::mint_for_testing<SUI>(100, &mut ctx);
    let recipients = vector[BOB, CHARLIE];
    let amounts = vector[50u64]; // only 1 amount for 2 recipients
    let purpose = b"Mismatch";

    smartsplit::execute_custom_split(payment, recipients, amounts, purpose, &mut ctx);
}

#[test, expected_failure(abort_code = EAmountMismatch, location = smartsplit)]
fun execute_custom_split_aborts_on_insufficient_payment() {
    let mut ctx = tx_context::dummy();
    let payment = coin::mint_for_testing<SUI>(50, &mut ctx);
    let recipients = vector[BOB, CHARLIE];
    let amounts = vector[40u64, 20u64]; // sum = 60 > 50 payment
    let purpose = b"Overdraft";

    smartsplit::execute_custom_split(payment, recipients, amounts, purpose, &mut ctx);
}
