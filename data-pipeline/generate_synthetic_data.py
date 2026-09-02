"""
Sentry — Synthetic Spend Dataset Generator
--------------------------------------------
Generates ~155 days of realistic daily spend data per category for one
synthetic international-student user. Two categories are deliberately given
an upward drift so the overspend predictor has something real to catch —
the rest stay roughly on budget.

Run once, offline. Output feeds prophet_forecast.py (or stub_forecast.py).
No live/real financial data involved — safe to commit to the repo.
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

np.random.seed(42)

TODAY = datetime(2026, 9, 2)
HISTORY_DAYS = 155
START = TODAY - timedelta(days=HISTORY_DAYS - 1)

CATEGORIES = {
    "Groceries & Food": {
        "monthly_budget": 400,
        "base_daily": 10.5,
        "weekend_multiplier": 1.6,
        "trend_per_day": 0.045,
        "noise_std": 3.0,
    },
    "Shopping & Personal": {
        "monthly_budget": 180,
        "base_daily": 3.5,
        "weekend_multiplier": 1.4,
        "trend_per_day": 0.035,
        "noise_std": 4.0,
    },
    "Transport": {
        "monthly_budget": 120,
        "base_daily": 3.8,
        "weekend_multiplier": 0.7,
        "trend_per_day": 0.0,
        "noise_std": 1.2,
    },
    "Subscriptions & Entertainment": {
        "monthly_budget": 100,
        "base_daily": 2.6,
        "weekend_multiplier": 1.8,
        "trend_per_day": 0.0,
        "noise_std": 2.5,
    },
    "Rent & Utilities": {
        "monthly_budget": 900,
        "base_daily": 29.5,
        "weekend_multiplier": 1.0,
        "trend_per_day": 0.0,
        "noise_std": 1.5,
    },
    "Remittance / Family Support": {
        "monthly_budget": 300,
        "base_daily": 9.0,
        "weekend_multiplier": 1.0,
        "trend_per_day": 0.0,
        "noise_std": 2.0,
        "lumpy": True,
    },
}


def generate_category(name, cfg, dates):
    n = len(dates)
    day_idx = np.arange(n)
    dow = np.array([d.weekday() for d in dates])
    is_weekend = np.isin(dow, [5, 6])

    base = cfg["base_daily"] + cfg["trend_per_day"] * day_idx
    seasonal = np.where(is_weekend, cfg["weekend_multiplier"], 1.0)
    noise = np.random.normal(0, cfg["noise_std"], n)

    daily = base * seasonal + noise
    daily = np.clip(daily, 0, None)

    if cfg.get("lumpy"):
        mask = np.random.rand(n) > 0.93
        lump_vals = np.random.normal(cfg["base_daily"] * 12, 15, n)
        daily = np.where(
            mask,
            np.clip(lump_vals, 20, None),
            daily * 0.05
        )

    return pd.DataFrame({
        "date": dates,
        "category": name,
        "daily_spend": np.round(daily, 2),
    })


def main():
    dates = [
        START + timedelta(days=i)
        for i in range(HISTORY_DAYS)
    ]

    frames = [
        generate_category(name, cfg, dates)
        for name, cfg in CATEGORIES.items()
    ]

    df = pd.concat(frames, ignore_index=True)

    # Save generated transaction data in the current data-pipeline folder
    df.to_csv("synthetic_transactions.csv", index=False)

    budgets = {
        name: cfg["monthly_budget"]
        for name, cfg in CATEGORIES.items()
    }

    # Save category budgets in the current data-pipeline folder
    with open("category_budgets.json", "w") as f:
        json.dump(budgets, f, indent=2)

    print(f"Generated {len(df)} rows across {len(CATEGORIES)} categories.")
    print(f"Date range: {dates[0].date()} -> {dates[-1].date()}")
    print("Saved: synthetic_transactions.csv, category_budgets.json")


if __name__ == "__main__":
    main()