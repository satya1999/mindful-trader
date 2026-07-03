"""
MT5 Bridge Service — FastAPI REST API for MetaTrader 5 integration.

This service runs on a Windows machine with MT5 terminal installed.
It exposes REST endpoints that the Convex backend calls to:
  - Validate MT5 credentials
  - Fetch account information
  - Fetch closed trade history
  - Fetch open positions
  - Fetch deposits/withdrawals

Requirements:
  - Windows OS
  - MetaTrader 5 terminal installed
  - Python 3.8+
  - pip install -r requirements.txt
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import MetaTrader5 as mt5

# ─── Config ───────────────────────────────────────────────────────

API_KEY = os.getenv("MT5_BRIDGE_API_KEY", "change-me-in-production")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

# ─── Models ───────────────────────────────────────────────────────

class MT5Credentials(BaseModel):
    server: str
    account_number: str
    password: str

class TradeHistoryRequest(BaseModel):
    server: str
    account_number: str
    password: str
    from_date: Optional[str] = None  # ISO format
    to_date: Optional[str] = None

class AccountInfo(BaseModel):
    login: int
    server: str
    currency: str
    leverage: int
    balance: float
    equity: float
    margin: float
    free_margin: float
    margin_level: float
    floating_pnl: float
    trade_mode: int  # 0 = demo, 1 = contest, 2 = real

class TradeRecord(BaseModel):
    ticket: int
    symbol: str
    type: int  # 0 = buy, 1 = sell
    volume: float
    entry_price: float
    exit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    open_time: str
    close_time: Optional[str] = None
    profit: float
    commission: float
    swap: float
    magic_number: Optional[int] = None
    comment: Optional[str] = None

class Position(BaseModel):
    ticket: int
    symbol: str
    type: int
    volume: float
    entry_price: float
    current_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    open_time: str
    profit: float
    commission: float
    swap: float
    magic_number: Optional[int] = None
    comment: Optional[str] = None

class Transaction(BaseModel):
    ticket: int
    type: str  # 'deposit' | 'withdrawal' | 'balance'
    amount: float
    date: str
    balance_after: float
    comment: Optional[str] = None

# ─── Auth Dependency ──────────────────────────────────────────────

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

# ─── MT5 Connection Helper ────────────────────────────────────────

def connect_mt5(server: str, account: str, password: str) -> bool:
    """Initialize MT5 and login with the given credentials."""
    if not mt5.initialize():
        logger.error(f"MT5 initialization failed: {mt5.last_error()}")
        raise HTTPException(status_code=500, detail=f"MT5 init failed: {mt5.last_error()}")

    login = int(account)
    authorized = mt5.login(login, password=password, server=server)

    if not authorized:
        mt5.shutdown()
        logger.warning(f"Login failed for account {account} on {server}")
        raise HTTPException(
            status_code=401,
            detail=f"Login failed: {mt5.last_error()}"
        )

    return True

def disconnect_mt5():
    """Shutdown the MT5 connection."""
    mt5.shutdown()

# ─── App ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MT5 Bridge Service starting...")
    yield
    logger.info("MT5 Bridge Service shutting down...")
    mt5.shutdown()

app = FastAPI(
    title="MT5 Bridge Service",
    description="REST API bridge for MetaTrader 5 integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Endpoints ────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "mt5_version": mt5.version() if mt5.initialize() else None}


@app.post("/validate", dependencies=[Depends(verify_api_key)])
async def validate_credentials(creds: MT5Credentials):
    """Validate MT5 credentials without fetching data."""
    try:
        connect_mt5(creds.server, creds.account_number, creds.password)
        info = mt5.account_info()
        disconnect_mt5()

        return {
            "valid": True,
            "login": info.login,
            "server": info.server,
            "currency": info.currency,
            "leverage": info.leverage,
            "trade_mode": info.trade_mode,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/account-info", dependencies=[Depends(verify_api_key)], response_model=AccountInfo)
async def get_account_info(creds: MT5Credentials):
    """Get current account information."""
    try:
        connect_mt5(creds.server, creds.account_number, creds.password)
        info = mt5.account_info()

        if info is None:
            disconnect_mt5()
            raise HTTPException(status_code=500, detail="Failed to get account info")

        result = AccountInfo(
            login=info.login,
            server=info.server,
            currency=info.currency,
            leverage=info.leverage,
            balance=info.balance,
            equity=info.equity,
            margin=info.margin,
            free_margin=info.margin_free,
            margin_level=info.margin_level if info.margin_level else 0,
            floating_pnl=info.profit,
            trade_mode=info.trade_mode,
        )

        disconnect_mt5()
        return result
    except HTTPException:
        raise
    except Exception as e:
        disconnect_mt5()
        logger.error(f"Account info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/closed-trades", dependencies=[Depends(verify_api_key)])
async def get_closed_trades(req: TradeHistoryRequest):
    """Fetch closed trade history."""
    try:
        connect_mt5(req.server, req.account_number, req.password)

        from_date = (
            datetime.fromisoformat(req.from_date)
            if req.from_date
            else datetime(2020, 1, 1)
        )
        to_date = (
            datetime.fromisoformat(req.to_date)
            if req.to_date
            else datetime.now() + timedelta(days=1)
        )

        # Get deals (closed trades)
        deals = mt5.history_deals_get(from_date, to_date)

        trades: List[dict] = []
        if deals:
            for deal in deals:
                # Only include actual trade deals (not balance operations)
                if deal.type in [0, 1]:  # 0 = buy, 1 = sell
                    trades.append({
                        "ticket": deal.ticket,
                        "symbol": deal.symbol,
                        "type": deal.type,
                        "volume": deal.volume,
                        "entry_price": deal.price,
                        "exit_price": deal.price,
                        "stop_loss": None,  # Not available in deal
                        "take_profit": None,
                        "open_time": datetime.fromtimestamp(deal.time).isoformat(),
                        "close_time": datetime.fromtimestamp(deal.time).isoformat(),
                        "profit": deal.profit,
                        "commission": deal.commission,
                        "swap": deal.swap,
                        "magic_number": deal.magic if deal.magic else None,
                        "comment": deal.comment if deal.comment else None,
                    })

        # Also get history orders for SL/TP info
        orders = mt5.history_orders_get(from_date, to_date)
        order_map = {}
        if orders:
            for order in orders:
                order_map[order.ticket] = {
                    "stop_loss": order.sl,
                    "take_profit": order.tp,
                }

        # Enrich trades with SL/TP from orders
        for trade in trades:
            if trade["ticket"] in order_map:
                trade["stop_loss"] = order_map[trade["ticket"]]["stop_loss"]
                trade["take_profit"] = order_map[trade["ticket"]]["take_profit"]

        disconnect_mt5()

        return {"trades": trades, "count": len(trades)}
    except HTTPException:
        raise
    except Exception as e:
        disconnect_mt5()
        logger.error(f"Closed trades error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/open-positions", dependencies=[Depends(verify_api_key)])
async def get_open_positions(creds: MT5Credentials):
    """Fetch current open positions."""
    try:
        connect_mt5(creds.server, creds.account_number, creds.password)

        positions = mt5.positions_get()
        result: List[dict] = []

        if positions:
            for pos in positions:
                result.append({
                    "ticket": pos.ticket,
                    "symbol": pos.symbol,
                    "type": pos.type,  # 0 = buy, 1 = sell
                    "volume": pos.volume,
                    "entry_price": pos.price_open,
                    "current_price": pos.price_current,
                    "stop_loss": pos.sl if pos.sl else None,
                    "take_profit": pos.tp if pos.tp else None,
                    "open_time": datetime.fromtimestamp(pos.time).isoformat(),
                    "profit": pos.profit,
                    "commission": pos.commission if hasattr(pos, 'commission') else 0,
                    "swap": pos.swap,
                    "magic_number": pos.magic if pos.magic else None,
                    "comment": pos.comment if pos.comment else None,
                })

        disconnect_mt5()
        return {"positions": result, "count": len(result)}
    except HTTPException:
        raise
    except Exception as e:
        disconnect_mt5()
        logger.error(f"Open positions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transactions", dependencies=[Depends(verify_api_key)])
async def get_transactions(req: TradeHistoryRequest):
    """Fetch deposits and withdrawals."""
    try:
        connect_mt5(req.server, req.account_number, req.password)

        from_date = (
            datetime.fromisoformat(req.from_date)
            if req.from_date
            else datetime(2020, 1, 1)
        )
        to_date = (
            datetime.fromisoformat(req.to_date)
            if req.to_date
            else datetime.now() + timedelta(days=1)
        )

        deals = mt5.history_deals_get(from_date, to_date)
        transactions: List[dict] = []

        if deals:
            balance = 0
            for deal in deals:
                # Balance operations (deposits/withdrawals)
                if deal.type == 2:  # DEAL_TYPE_BALANCE
                    balance += deal.profit
                    txn_type = "deposit" if deal.profit > 0 else "withdrawal"
                    transactions.append({
                        "ticket": deal.ticket,
                        "type": txn_type,
                        "amount": deal.profit,
                        "date": datetime.fromtimestamp(deal.time).isoformat(),
                        "balance_after": balance,
                        "comment": deal.comment if deal.comment else None,
                    })

        disconnect_mt5()
        return {"transactions": transactions, "count": len(transactions)}
    except HTTPException:
        raise
    except Exception as e:
        disconnect_mt5()
        logger.error(f"Transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Run ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
