-- PBB ticket sales. Apply in Supabase SQL editor after reviewing environment setup.
-- No payment is considered paid from browser input; only the signed gateway webhook may update status.
begin;
create extension if not exists pgcrypto;
create table if not exists public.ticket_orders (
 id uuid primary key default gen_random_uuid(),
 order_id text not null unique check (order_id ~ '^PBB-[0-9]+-[A-F0-9]+$'),
 buyer_name text not null check (char_length(buyer_name) between 2 and 120),
 buyer_address text not null check (char_length(buyer_address) between 5 and 250),
 buyer_phone text not null check (char_length(buyer_phone) between 8 and 30),
 buyer_email text not null check (char_length(buyer_email) between 5 and 254),
 quantity integer not null check (quantity between 1 and 5),
 unit_price integer not null check (unit_price > 0),
 gross_amount integer not null check (gross_amount = unit_price * quantity),
 status text not null default 'pending' check (status in ('pending','paid','failed','expired','refunded')),
 gateway_transaction_id text,
 gateway_status text,
 payment_qr_url text,
 access_token text not null default encode(gen_random_bytes(32),'hex'),
 expires_at timestamptz not null,
 paid_at timestamptz,
 email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.ticket_tickets (
 id uuid primary key default gen_random_uuid(),
 order_id text not null references public.ticket_orders(order_id) on delete restrict,
 ticket_code text not null unique,
 ticket_token text not null unique,
 ticket_index integer not null check(ticket_index between 1 and 5),
 status text not null default 'valid' check(status in ('valid','used','cancelled')),
 used_at timestamptz,
 used_by text,
 created_at timestamptz not null default now(),
 unique(order_id,ticket_index)
);
create table if not exists public.ticket_event_inventory (
 event_slug text primary key check (char_length(event_slug) between 1 and 100),
 capacity integer not null check (capacity > 0),
 allocated_count integer not null default 0 check (allocated_count >= 0 and allocated_count <= capacity),
 updated_at timestamptz not null default now()
);
insert into public.ticket_event_inventory(event_slug,capacity,allocated_count) values ('pbb-event',100,0) on conflict(event_slug) do nothing;

-- Synchronize the one active event's configured capacity without allowing it below already reserved/sold tickets.
create or replace function public.configure_ticket_capacity(p_event_slug text,p_capacity integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 if p_event_slug is null or char_length(p_event_slug) < 1 or char_length(p_event_slug) > 100 or p_capacity is null or p_capacity < 1 or p_capacity > 100000 then return false; end if;
 insert into public.ticket_event_inventory(event_slug,capacity,allocated_count)
 values(p_event_slug,p_capacity,0)
 on conflict(event_slug) do update set capacity=excluded.capacity,updated_at=now()
 where public.ticket_event_inventory.allocated_count <= excluded.capacity;
 get diagnostics changed = row_count;
 return changed=1;
end; $$;
revoke all on function public.configure_ticket_capacity(text,integer) from public, anon, authenticated;
grant execute on function public.configure_ticket_capacity(text,integer) to service_role;

create or replace function public.reserve_ticket_capacity(p_event_slug text,p_quantity integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 if p_quantity is null or p_quantity < 1 or p_quantity > 5 then return false; end if;
 update public.ticket_event_inventory set allocated_count=allocated_count+p_quantity,updated_at=now()
 where event_slug=p_event_slug and allocated_count+p_quantity<=capacity;
 get diagnostics changed = row_count;
 return changed=1;
end; $$;
create or replace function public.release_ticket_capacity(p_event_slug text,p_quantity integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 update public.ticket_event_inventory set allocated_count=greatest(0,allocated_count-greatest(0,p_quantity)),updated_at=now()
 where event_slug=p_event_slug;
 get diagnostics changed = row_count;
 return changed=1;
end; $$;
revoke all on function public.reserve_ticket_capacity(text,integer) from public, anon, authenticated;
revoke all on function public.release_ticket_capacity(text,integer) from public, anon, authenticated;
grant execute on function public.reserve_ticket_capacity(text,integer) to service_role;
grant execute on function public.release_ticket_capacity(text,integer) to service_role;
revoke all on public.ticket_event_inventory from anon, authenticated;
create index if not exists ticket_orders_status_created_idx on public.ticket_orders(status,created_at desc);
create index if not exists ticket_tickets_order_idx on public.ticket_tickets(order_id);
alter table public.ticket_orders enable row level security;
alter table public.ticket_tickets enable row level security;
-- Intentionally no anon/authenticated policies. Access is mediated by serverless functions using service role.
revoke all on public.ticket_orders from anon, authenticated;
revoke all on public.ticket_tickets from anon, authenticated;
commit;
