"""
PredX Prediction Market — Algorand ARC4 Smart Contract
Uses algopy (Algorand Python). NOT PyTEAL.

Global State:
  - admin: Account (deployer address, only admin can create/resolve markets)
  - market_count: UInt64 (auto-incrementing market ID counter)

Box Storage:
  - Markets: prefix "m" + market_id (8 bytes) -> MarketData struct
  - Bets:    prefix "b" + market_id (8 bytes) + bettor_address (32 bytes) -> BetData struct
"""

from algopy import (
    ARC4Contract,
    GlobalState,
    BoxMap,
    Txn,
    Global,
    UInt64,
    Bytes,
    Account,
    op,
    itxn,
    gtxn,
    arc4,
)


# ── Structs ────────────────────────────────────────────────────────────

class MarketData(arc4.Struct):
    """On-chain representation of a prediction market."""
    title: arc4.String
    category: arc4.String
    end_time: arc4.UInt64
    option_a: arc4.String
    option_b: arc4.String
    total_yes: arc4.UInt64
    total_no: arc4.UInt64
    status: arc4.UInt64          # 0 = active, 1 = resolved
    winning_outcome: arc4.UInt64  # 0 = YES won, 1 = NO won (only meaningful when resolved)


class BetData(arc4.Struct):
    """On-chain representation of a single user bet on a market."""
    amount: arc4.UInt64    # microALGO staked
    outcome: arc4.UInt64   # 0 = YES, 1 = NO
    claimed: arc4.UInt64   # 0 = not claimed, 1 = claimed


# ── Contract ───────────────────────────────────────────────────────────

class PredictionMarket(ARC4Contract):

    def __init__(self) -> None:
        # Global state
        self.market_count = GlobalState(UInt64)

        # Box maps
        self.markets = BoxMap(arc4.UInt64, MarketData, key_prefix=b"m")
        self.bets = BoxMap(Bytes, BetData, key_prefix=b"b")

    # ── Application lifecycle ──────────────────────────────────────────

    @arc4.abimethod(create="require")
    def create_application(self) -> None:
        """Called once at deployment."""
        self.market_count.value = UInt64(0)

    # ── Admin methods ──────────────────────────────────────────────────

    @arc4.abimethod
    def create_market(
        self,
        title: arc4.String,
        end_time: arc4.UInt64,
        category: arc4.String,
        option_a: arc4.String,
        option_b: arc4.String,
    ) -> arc4.UInt64:
        """
        Create a new prediction market.
        Returns the new market ID (1-indexed).
        """
        new_id = self.market_count.value + UInt64(1)
        self.market_count.value = new_id

        market_key = arc4.UInt64(new_id)
        self.markets[market_key] = MarketData(
            title=title,
            category=category,
            end_time=end_time,
            option_a=option_a,
            option_b=option_b,
            total_yes=arc4.UInt64(0),
            total_no=arc4.UInt64(0),
            status=arc4.UInt64(0),
            winning_outcome=arc4.UInt64(0),
        )

        return arc4.UInt64(new_id)

    @arc4.abimethod
    def resolve_market(
        self,
        market_id: arc4.UInt64,
        winning_outcome: arc4.UInt64,
    ) -> None:
        """
        Resolve a market by declaring the winning outcome.
        winning_outcome: 0 = YES, 1 = NO.
        """
        assert winning_outcome.native <= UInt64(1), "Outcome must be 0 or 1"

        market = self.markets[market_id].copy()
        assert market.status.native == UInt64(0), "Market already resolved"

        self.markets[market_id] = MarketData(
            title=market.title,
            category=market.category,
            end_time=market.end_time,
            option_a=market.option_a,
            option_b=market.option_b,
            total_yes=market.total_yes,
            total_no=market.total_no,
            status=arc4.UInt64(1),
            winning_outcome=winning_outcome,
        )

    # ── User methods ───────────────────────────────────────────────────

    @arc4.abimethod
    def place_bet(
        self,
        market_id: arc4.UInt64,
        outcome: arc4.UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> None:
        """
        Place a bet on a market. Must include a payment txn to the contract
        in the same atomic group. outcome: 0 = YES, 1 = NO.
        One bet per user per market.
        """
        # Validate payment goes to this contract
        assert payment.receiver == Global.current_application_address, \
            "Payment must be sent to the contract"
        assert payment.amount > 0, "Payment must be positive"

        # Validate outcome value
        assert outcome.native <= UInt64(1), "Outcome must be 0 (YES) or 1 (NO)"

        # Validate market is active and not expired
        market = self.markets[market_id].copy()
        assert market.status.native == UInt64(0), "Market is not active"
        assert Global.latest_timestamp < market.end_time.native, "Market has expired"

        # Ensure user hasn't already bet on this market
        bet_key = op.itob(market_id.native) + Txn.sender.bytes
        assert bet_key not in self.bets, "Already placed a bet on this market"

        # Record the bet in box storage
        self.bets[bet_key] = BetData(
            amount=arc4.UInt64(payment.amount),
            outcome=outcome,
            claimed=arc4.UInt64(0),
        )

        # Update market totals
        if outcome.native == UInt64(0):
            new_total_yes = arc4.UInt64(market.total_yes.native + payment.amount)
            new_total_no = market.total_no
        else:
            new_total_yes = market.total_yes
            new_total_no = arc4.UInt64(market.total_no.native + payment.amount)

        self.markets[market_id] = MarketData(
            title=market.title,
            category=market.category,
            end_time=market.end_time,
            option_a=market.option_a,
            option_b=market.option_b,
            total_yes=new_total_yes,
            total_no=new_total_no,
            status=market.status,
            winning_outcome=market.winning_outcome,
        )

    @arc4.abimethod
    def claim_winnings(self, market_id: arc4.UInt64) -> None:
        """
        Claim proportional winnings from a resolved market.
        payout = (user_bet / winning_pool) * total_pool
        """
        market = self.markets[market_id].copy()
        assert market.status.native == UInt64(1), "Market not yet resolved"

        bet_key = op.itob(market_id.native) + Txn.sender.bytes
        bet = self.bets[bet_key].copy()

        assert bet.outcome == market.winning_outcome, \
            "You did not bet on the winning outcome"
        assert bet.claimed.native == UInt64(0), "Winnings already claimed"

        # Calculate payout: (user_amount / winning_pool) * total_pool
        total_pool = market.total_yes.native + market.total_no.native
        if market.winning_outcome.native == UInt64(0):
            winning_pool = market.total_yes.native
        else:
            winning_pool = market.total_no.native

        payout = (bet.amount.native * total_pool) // winning_pool

        # Mark as claimed before paying out
        self.bets[bet_key] = BetData(
            amount=bet.amount,
            outcome=bet.outcome,
            claimed=arc4.UInt64(1),
        )

        # Send ALGO to winner via inner transaction (fee pooled from outer txn)
        itxn.Payment(
            receiver=Txn.sender,
            amount=payout,
            fee=0,
        ).submit()

    # ── Read-only methods ──────────────────────────────────────────────

    @arc4.abimethod(readonly=True)
    def get_market_info(
        self, market_id: arc4.UInt64
    ) -> arc4.DynamicArray[arc4.UInt64]:
        """
        Returns market info as array:
        [total_yes, total_no, status, winning_outcome, end_time]
        All values in microALGO / unix-timestamp where applicable.
        """
        market = self.markets[market_id].copy()

        return arc4.DynamicArray(
            market.total_yes,
            market.total_no,
            market.status,
            market.winning_outcome,
            market.end_time,
        )
