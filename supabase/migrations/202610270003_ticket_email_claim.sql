-- Prevent concurrent/replayed Midtrans webhooks from sending duplicate ticket emails.
-- Apply after 202610270001_ticketing.sql and 202610270002_ticket_capacity_config.sql.
begin;
alter table public.ticket_orders add column if not exists email_attempted_at timestamptz;
alter table public.ticket_orders drop constraint if exists ticket_orders_email_status_check;
alter table public.ticket_orders add constraint ticket_orders_email_status_check
  check (email_status in ('pending','sending','sent','failed'));
create index if not exists ticket_orders_email_retry_idx
  on public.ticket_orders(email_status,email_attempted_at)
  where email_status in ('pending','failed','sending');
commit;
