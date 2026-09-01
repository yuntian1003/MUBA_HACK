// smartsplit/sources/smartsplit.move
/// SmartSplit — programmable payment coordination on Sui.
///
/// Supports both equal splits and uneven/custom multi-recipient splits
/// executed as a single atomic PTB on Sui.
module smartsplit::smartsplit {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use std::string::{Self, String};

    // ─── Error codes ──────────────────────────────────────────────
    const EEmptyRecipients: u64 = 0;
    const EAmountMismatch:  u64 = 1;
    const EZeroAmount:      u64 = 2;

    // ─── Events ───────────────────────────────────────────────────

    /// Emitted once per split execution.
    public struct SplitExecuted has copy, drop {
        payer:           address,
        purpose:         String,
        total_amount:    u64,
        recipient_count: u64,
        per_person:      u64, // > 0 for equal split, 0 for custom/uneven split
    }

    /// Emitted once per individual transfer within a split.
    public struct RecipientPaid has copy, drop {
        recipient: address,
        amount:    u64,
        payer:     address,
    }

    // ─── Public entry: execute_equal_split ────────────────────────

    /// Split `payment` equally among `recipients`.
    #[allow(lint(public_entry))]
    public entry fun execute_equal_split(
        mut payment: Coin<SUI>,
        recipients:  vector<address>,
        purpose:     vector<u8>,
        ctx:         &mut TxContext,
    ) {
        let n = recipients.length();
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
            let recipient = recipients[i];
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

    // ─── Public entry: execute_custom_split ───────────────────────

    /// Split `payment` according to exact individual `amounts` for each recipient.
    /// Supports uneven expense distributions (e.g. itemized bills, custom shares).
    #[allow(lint(public_entry))]
    public entry fun execute_custom_split(
        mut payment: Coin<SUI>,
        recipients:  vector<address>,
        amounts:     vector<u64>,
        purpose:     vector<u8>,
        ctx:         &mut TxContext,
    ) {
        let n = recipients.length();
        assert!(n > 0, EEmptyRecipients);
        assert!(n == amounts.length(), EAmountMismatch);

        let total = coin::value(&payment);
        let mut sum = 0u64;
        let mut i = 0u64;
        while (i < n) {
            sum = sum + amounts[i];
            i = i + 1;
        };

        assert!(sum > 0, EZeroAmount);
        assert!(total >= sum, EAmountMismatch);

        let payer = ctx.sender();
        let purpose_str = string::utf8(purpose);

        event::emit(SplitExecuted {
            payer,
            purpose:      purpose_str,
            total_amount: total,
            recipient_count: n,
            per_person:   0, // 0 signifies custom/uneven split
        });

        let mut j = 0u64;
        while (j < n) {
            let recipient = recipients[j];
            let amount = amounts[j];
            if (amount > 0) {
                let share = coin::split(&mut payment, amount, ctx);
                event::emit(RecipientPaid { recipient, amount, payer });
                transfer::public_transfer(share, recipient);
            };
            j = j + 1;
        };

        // Return any remaining dust or excess to payer
        let remaining = coin::value(&payment);
        if (remaining > 0) {
            transfer::public_transfer(payment, payer);
        } else {
            coin::destroy_zero(payment);
        };
    }
}
