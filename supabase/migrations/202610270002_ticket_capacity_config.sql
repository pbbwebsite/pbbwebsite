-- Safe follow-up for installations where 202610270001_ticketing.sql is already applied.
-- Keeps one currently supported ticket event; the event remains fully configurable from the existing CMS.
begin;
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
commit;
