-- Multi-event ticketing: each order snapshots the event data so later CMS edits cannot rewrite receipts.
-- Apply after 202610270001, 002, and 003.
begin;
alter table public.ticket_orders add column if not exists event_slug text;
alter table public.ticket_orders add column if not exists event_title text;
alter table public.ticket_orders add column if not exists event_date_label text;
alter table public.ticket_orders add column if not exists event_location text;
alter table public.ticket_orders add column if not exists ticket_type text;
update public.ticket_orders set event_slug=coalesce(nullif(event_slug,''),'pbb-event'), event_title=coalesce(nullif(event_title,''),'Persatuan Boxing Bogor'), event_date_label=coalesce(event_date_label,''), event_location=coalesce(event_location,''), ticket_type=coalesce(nullif(ticket_type,''),'Umum') where event_slug is null or event_title is null or event_date_label is null or event_location is null or ticket_type is null;
alter table public.ticket_orders alter column event_slug set default 'pbb-event';
alter table public.ticket_orders alter column event_slug set not null;
alter table public.ticket_orders alter column event_title set default 'Persatuan Boxing Bogor';
alter table public.ticket_orders alter column event_title set not null;
alter table public.ticket_orders alter column event_date_label set default '';
alter table public.ticket_orders alter column event_date_label set not null;
alter table public.ticket_orders alter column event_location set default '';
alter table public.ticket_orders alter column event_location set not null;
alter table public.ticket_orders alter column ticket_type set default 'Umum';
alter table public.ticket_orders alter column ticket_type set not null;
create index if not exists ticket_orders_event_created_idx on public.ticket_orders(event_slug,created_at desc);
create index if not exists ticket_inventory_event_idx on public.ticket_event_inventory(event_slug);

-- Minimal audit trail for verified payment notifications. No buyer address/email or full payload is stored here.
create table if not exists public.ticket_payment_audit (
 id uuid primary key default gen_random_uuid(),
 order_id text not null references public.ticket_orders(order_id) on delete restrict,
 event_slug text not null,
 transaction_status text not null check (transaction_status in ('pending','settlement','capture','expire','cancel','deny','refund','partial_refund','failure')),
 gateway_transaction_id text,
 gross_amount integer not null check (gross_amount > 0),
 received_at timestamptz not null default now()
);
create index if not exists ticket_payment_audit_order_idx on public.ticket_payment_audit(order_id,received_at desc);
alter table public.ticket_payment_audit enable row level security;
revoke all on public.ticket_payment_audit from anon, authenticated;
commit;
