"""Evidence-based staff awards. Agent self-reported wins never count."""
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Observation:
    agent_id: str
    case_id: str
    period: str  # YYYY-MM; caller projects trusted case/payment/review evidence.
    synthetic: bool
    verified: bool
    accuracy: int
    fulfilled_promises: int
    customer_experience: int | None
    contribution_eur: str | None
    paid_order: bool
    critical_violation: bool


def leaderboard(observations, period, minimum_cases=5, calibration=False):
    rows, seen = {}, set()
    for event in observations:
        if (not (event.period == period or (len(period) == 4 and event.period.startswith(period + '-'))) or
                not event.verified or event.synthetic != calibration):
            continue
        key = event.agent_id, event.case_id
        if key in seen:
            raise ValueError('duplicate_case_award_evidence')
        seen.add(key)
        if any(not 0 <= value <= 100 for value in [event.accuracy, event.fulfilled_promises] +
               ([event.customer_experience] if event.customer_experience is not None else [])):
            raise ValueError('invalid_score')
        profit = Decimal(event.contribution_eur) if event.contribution_eur is not None else None
        if profit is not None and not profit.is_finite():
            raise ValueError('invalid_contribution')
        row = rows.setdefault(event.agent_id, {'agent_id': event.agent_id, 'cases': 0, 'points': Decimal(0),
            'paid_orders': 0, 'contribution_eur': Decimal(0), 'critical_violations': 0, 'csat_observations': 0,
            'loss_orders': 0})
        row['cases'] += 1
        row['critical_violations'] += int(event.critical_violation)
        # Missing human satisfaction is not fabricated; normalize over measured criteria.
        weights = Decimal('0.75') if event.customer_experience is None else Decimal(1)
        points = Decimal(event.accuracy) * Decimal('0.45') + Decimal(event.fulfilled_promises) * Decimal('0.30')
        if event.customer_experience is not None:
            points += Decimal(event.customer_experience) * Decimal('0.25')
            row['csat_observations'] += 1
        if event.paid_order and profit is not None:
            row['paid_orders'] += 1
            row['contribution_eur'] += profit
            row['loss_orders'] += int(profit < 0)
        if event.critical_violation or (event.paid_order and profit is not None and profit < 0):
            points = Decimal(0)
        row['points'] += points / weights
    result = []
    for row in rows.values():
        score = (row['points'] / row['cases']).quantize(Decimal('0.01'))
        eligible = (row['cases'] >= minimum_cases and row['critical_violations'] == 0 and
                    row['loss_orders'] == 0 and row['contribution_eur'] >= 0)
        result.append({**row, 'points': str(score), 'contribution_eur': str(row['contribution_eur']),
                       'eligible': eligible, 'scope': 'calibration' if calibration else 'verified_business'})
    return sorted(result, key=lambda row: (row['eligible'], Decimal(row['points']),
                  Decimal(row['contribution_eur'])), reverse=True)
