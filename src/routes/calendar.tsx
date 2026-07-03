import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { fmtMoney } from "@/lib/trade";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: () => (
    <AppShell>
      <TradingCalendar />
    </AppShell>
  ),
});

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function TradingCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const calData = useQuery(api.mt5Analytics.calendarData, { month, year }) ?? [];

  const dayMap = new Map(calData.map((d: any) => [d.date, d]));

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Monthly summary
  const totalProfit = calData.reduce((a: number, d: any) => a + d.profit, 0);
  const totalTrades = calData.reduce((a: number, d: any) => a + d.trades, 0);
  const profitDays = calData.filter((d: any) => d.profit > 0).length;
  const lossDays = calData.filter((d: any) => d.profit < 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trading Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily P&L heatmap for your MT5 trades.</p>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Monthly P&L</div>
          <div className={`mt-2 text-2xl font-semibold tabular ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtMoney(totalProfit)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Total Trades</div>
          <div className="mt-2 text-2xl font-semibold tabular">{totalTrades}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Profit Days</div>
          <div className="mt-2 text-2xl font-semibold tabular text-emerald-400">{profitDays}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Loss Days</div>
          <div className="mt-2 text-2xl font-semibold tabular text-red-400">{lossDays}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="glass rounded-2xl p-6">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
            <Button variant="outline" size="sm" onClick={goToday} className="text-xs">Today</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] uppercase text-muted-foreground tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, i) => {
            if (day === null) return <div key={i} className="aspect-square" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const data = dayMap.get(dateStr);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

            return (
              <div
                key={i}
                className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center text-center transition-all relative
                  ${isToday ? "ring-2 ring-primary/50" : ""}
                  ${data ? (data.profit > 0 ? "bg-emerald-500/15 border border-emerald-500/20" : data.profit < 0 ? "bg-red-500/15 border border-red-500/20" : "bg-muted/30 border border-border/30") : "hover:bg-card/40"}
                `}
              >
                <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{day}</div>
                {data && (
                  <>
                    <div className={`text-[10px] font-semibold tabular mt-0.5 ${data.profit > 0 ? "text-emerald-400" : data.profit < 0 ? "text-red-400" : ""}`}>
                      {data.profit > 0 ? "+" : ""}{data.profit.toFixed(0)}
                    </div>
                    <div className="text-[8px] text-muted-foreground">{data.trades}t · {data.winRate}%</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
