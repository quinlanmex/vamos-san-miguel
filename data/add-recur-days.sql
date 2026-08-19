-- Real recurrence pattern for recurring events: which weekdays they repeat on
-- (0 = Sunday ... 6 = Saturday). Lets the Today / Weekend / This week filters be precise
-- instead of showing every recurring event under every date. NULL/empty = unknown (the app
-- then keeps showing the event under all date filters until we learn its days). Safe to re-run.
alter table public.events add column if not exists recur_days smallint[];
