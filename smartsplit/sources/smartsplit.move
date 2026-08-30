// smartsplit/sources/smartsplit.move
/// SmartSplit — programmable payment coordination on Sui.
///
/// This thin module wraps coin-split + transfer logic into a single
/// Entry point that is composable with PTBs from the frontend.
/// The real atomicity guarantee comes from the PTB layer — the frontend
/// composes split_coins + transfer_objects in a single PTB without
/// needing to call into this module for MVP. This module is provided so
/// advanced on-chain receipt tracking can be added post-hackathon.
module smartsplit::smartsplit {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::tx_context::TxContext;
    use std::string::{Self, String};
    use std::vector;

    // ─── Error codes ──────────────────────────────────────────────
    const EEmptyRecipients: u64 = 0;
    const EAmountMismatch:  u64 = 1;
    const EZeroAmount:      u64 = 2;

    // ─── Events ───────────────────────────────────────────────────

    /// Emitted once per split execution.
    public struct SplitExecuted has copy, drop {
        payer:        address,
        purpose:      String,
        total_amount: u64,
        recipient_count: u64,
        per_person:   u64,
    }

    /// Emitted once per individual transfer within a split.
    public struct RecipientPaid has copy, drop {
        recipient: address,
        amount:    u64,
        payer:     address,
    }

    // ─── Public entry: execute_equal_split ────────────────────────

    /// Split `payment` equally among `recipients`.
    ///
    /// The caller provides a Coin<SUI> (from a PTB split_coins command
    /// in the frontend). This function distributes equal shares to each
    /// recipient and returns any dust back to the sender.
    ///
    /// Preconditions:
    ///   - recipients is non-empty
    ///   - payment.value() == per_person * recipients.length()  (± 1 for dust)
    public entry fun execute_equal_split(
        mut payment: Coin<SUI>,
        recipients:  vector<address>,
        purpose:     vector<u8>,
        ctx:         &mut TxContext,
    ) {
        let n = vector::length(&recipients);
        assert!(n > 0, EEmptyRecipients);

        let total = coin::value(&payment);
        assert!(total > 0, EZeroAmount);

        let per_person = total / n;
        let payer = ctx.sender();
        let purpose_str = string::utf8(purpose);

        // Emit the split summary event
        event::emit(SplitExecuted {
            payer,
            purpose:      purpose_str,
            total_amount: total,
            recipient_count: n,
            per_person,
        });

        let mut i = 0u64;
        while (i < n) {
            let recipient = *vector::borrow(&recipients, i);
            let share = coin::split(&mut payment, per_person, ctx);

            event::emit(RecipientPaid { recipient, amount: per_person, payer });

            transfer::public_transfer(share, recipient);
            i = i + 1;
        };

        // Return any remaining dust to payer (rounding residual)
        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, payer);
        } else {
            coin::destroy_zero(payment);
        };
    }
}
