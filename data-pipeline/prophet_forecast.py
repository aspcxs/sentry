"""
Sentry — Overspend Predictor (Prophet pipeline)
--------------------------------------------------
THIS is the real model. Run locally:

    pip install prophet pandas numpy
    python prophet_forecast.py

Reads synthetic_transactions.csv + category_budgets.json (or swap in real
transaction data with the same schema: date, category, daily_spend).

Output schema is IDENTICAL to stub_forecast.py's output, so the frontend
and API route never need to change when you swap the stub for this.
"""

import json
import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import timedelta

TRANSACTIONS_CSV = "synthetic_transactions.csv"
BUDGETS_JSON = "category_budgets.json"
OUTPUT_JSON = "forecasts.json"

FORECAST_HORIZON_DAYS = 35


def month_bounds(as_of: pd.Timestamp):
    start = as_of.replace(day=1)

    if as_of.month == 12:
        end = as_of.replace(
            year=as_of.year + 1,
            month=1,
            day=1
        ) - timedelta(days=1)
    else:
        end = as_of.replace(
            month=as_of.month + 1,
            day=1
        ) - timedelta(days=1)

    return start, end


def forecast_category(
    cat_df: pd.DataFrame,
    budget: float,
    as_of: pd.Timestamp
):
    df = cat_df.rename(
        columns={
            "date": "ds",
            "daily_spend": "y"
        }
    )[["ds", "y"]]

    model = Prophet(
        weekly_seasonality=True,
        yearly_seasonality=False,
        daily_seasonality=False,
        interval_width=0.8,
    )

    model.fit(df)

    future = model.make_future_dataframe(
        periods=FORECAST_HORIZON_DAYS
    )

    fcst = model.predict(future)

    fcst["yhat"] = fcst["yhat"].clip(lower=0)
    fcst["yhat_lower"] = fcst["yhat_lower"].clip(lower=0)

    month_start, month_end = month_bounds(as_of)

    # Actual cumulative spend so far this month
    actual_month = df[
        (df["ds"] >= month_start) &
        (df["ds"] <= as_of)
    ]

    history_points = [
        {
            "date": r.ds.strftime("%Y-%m-%d"),
            "daily": round(float(r.y), 2)
        }
        for r in actual_month.itertuples()
    ]

    cum_actual = float(actual_month["y"].sum())

    # Forecasted remaining days of the month
    future_days = fcst[
        (fcst["ds"] > as_of) &
        (fcst["ds"] <= month_end)
    ]

    forecast_points = []

    running = cum_actual
    running_lo = cum_actual
    running_hi = cum_actual

    breach = {
        "will_breach": False,
        "date": None,
        "days_from_now": None
    }

    for r in future_days.itertuples():

        running += r.yhat
        running_lo += r.yhat_lower
        running_hi += r.yhat_upper

        forecast_points.append({
            "date": r.ds.strftime("%Y-%m-%d"),
            "cumulative_yhat": round(running, 2),
            "cumulative_lower": round(running_lo, 2),
            "cumulative_upper": round(running_hi, 2),
        })

        if not breach["will_breach"] and running >= budget:
            breach = {
                "will_breach": True,
                "date": r.ds.strftime("%Y-%m-%d"),
                "days_from_now": (
                    r.ds.date() - as_of.date()
                ).days,
            }

    return {
        "history": history_points,
        "forecast": forecast_points,
        "cumulative_actual_to_date": round(cum_actual, 2),
        "breach": breach,
    }


def main():

    tx = pd.read_csv(
        TRANSACTIONS_CSV,
        parse_dates=["date"]
    )

    budgets = json.load(
        open(BUDGETS_JSON)
    )

    as_of = tx["date"].max()

    result = {
        "generated_at": as_of.strftime("%Y-%m-%d"),
        "model": "prophet",
        "categories": [],
    }

    for category, budget in budgets.items():

        cat_df = tx[
            tx["category"] == category
        ].sort_values("date")

        cat_result = forecast_category(
            cat_df,
            budget,
            as_of
        )

        result["categories"].append({
            "category": category,
            "monthly_budget": budget,
            "currency": "USD",
            **cat_result,
        })

    with open(OUTPUT_JSON, "w") as f:
        json.dump(result, f, indent=2)

    print(
        f"Wrote {OUTPUT_JSON} using real Prophet forecasts."
    )


if __name__ == "__main__":
    main()