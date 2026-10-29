import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('public ticket page has required buyer fields and safe payment messaging', async () => {
 const html=await read('tiket.html');
 for(const id of ['buyerName','buyerAddress','buyerPhone','buyerEmail','ticketQty','ticketSubmit','paymentBox','issuedTicket','ticketReceipt']) assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/Pembayaran diproses oleh penyedia pembayaran resmi/);
});
test('ticket API does not trust browser status and validates gateway webhook signature', async () => {
 const create=await read('netlify/functions/ticket-create-order.mjs');
 const webhook=await read('netlify/functions/ticket-webhook.mjs');
 assert.match(create,/reserve_ticket_capacity/);
 assert.match(create,/sameOrigin/);
 assert.match(webhook,/createHash\('md5'\)/);
 assert.match(webhook,/timingSafeEqual/);
 assert.match(webhook,/status==='settlement'/);
});
test('ticket tables are not directly accessible to public roles and have one-use status', async () => {
 const sql=await read('supabase/migrations/202610270001_ticketing.sql');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/revoke all on public\.ticket_tickets from anon, authenticated/i);
 assert.match(sql,/unique\(order_id,ticket_index\)/i);
 assert.match(sql,/reserve_ticket_capacity/);
 assert.match(sql,/status in \('valid','used','cancelled'\)/);
});
test('check-in uses platform admin session and only redeems valid ticket tokens', async () => {
 const api=await read('netlify/functions/cms-api.mjs');
 const html=await read('admin/ticket-checkin.html');
 assert.match(api,/action==='ticket-checkin'/);
 assert.match(api,/validPlatformSession\(event\)/);
 assert.match(api,/status=eq\.valid/);
 assert.match(html,/Aktifkan kamera/);
});
test('ticket sales settings are editable through CMS and consumed by server-side ticket config', async () => {
 const admin=await read('admin/index.html');
 const cms=await read('admin/admin.js');
 const api=await read('netlify/functions/cms-api.mjs');
 const config=await read('netlify/functions/ticket-config.mjs');
 const order=await read('netlify/functions/ticket-create-order.mjs');
 const helper=await read('netlify/functions/_ticket-cms.mjs');
 const content=JSON.parse(await read('data/content.json'));
 assert.match(admin,/data-tab="ticketEvents"/);
 for(const field of ['active','title','description','dateLabel','location','price']) assert.match(cms,new RegExp(field));
 assert.match(api,/ticketFields/);
 assert.match(config,/readTicketSettings/);
 assert.match(order,/readTicketSettings/);
 assert.match(helper,/GITHUB_TOKEN/);
 assert.equal(content.ticketing.active,false,'ticket sales must default to closed');
 assert.equal(content.ticketing.price,170000);
});
test('ticket admin order listing is session-protected and exposes no payment mutation action', async () => {
 const api=await read('netlify/functions/cms-api.mjs');
 const page=await read('admin/ticket-orders.html');
 assert.match(api,/action==='ticket-orders'\)\{if\(!validPlatformSession\(event\)\)/);
 assert.match(api,/ticket_orders\?select=order_id,event_slug,event_title,event_date_label,event_location,ticket_type,buyer_name,buyer_email,buyer_phone/);
 assert.match(page,/Ekspor CSV/);
 assert.match(page,/platform-logout/);
});
test('check-in verifies paid order before conditional single-use redemption', async () => {
 const api=await read('netlify/functions/cms-api.mjs');
 assert.match(api,/orders\[0\]\.status!=='paid'.{0,500}status=eq\.valid/);
 assert.match(api,/status=eq\.valid/);
});
test('webhook validates optional currency and known transaction states', async () => {
 const webhook=await read('netlify/functions/ticket-webhook.mjs');
 assert.match(webhook,/x\.currency && x\.currency!=='IDR'/);
 assert.match(webhook,/Unsupported transaction status/);
});


test('ticket event price, capacity, ticket type, poster and sales window are CMS-managed and server-validated', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.resolve(new URL('..', import.meta.url).pathname);
  const cms = await fs.readFile(path.join(root, 'admin/admin.js'), 'utf8');
  const api = await fs.readFile(path.join(root, 'netlify/functions/cms-api.mjs'), 'utf8');
  const settings = await fs.readFile(path.join(root, 'netlify/functions/_ticket-cms.mjs'), 'utf8');
  const create = await fs.readFile(path.join(root, 'netlify/functions/ticket-create-order.mjs'), 'utf8');
  for (const field of ['poster','ticketType','capacity','maxPerOrder','salesStartsAt','salesEndsAt']) assert.match(cms, new RegExp(field));
  assert.match(api, /Kapasitas tiket harus bilangan bulat/);
  assert.match(api, /Waktu periode penjualan harus tanggal\/waktu ISO/);
  assert.match(api, /Poster harus menggunakan URL HTTPS atau path lokal/);
  assert.match(settings, /salesAvailable/);
  assert.match(create, /configure_ticket_capacity/);
  assert.match(create, /ticketConfig\.maxPerOrder/);
});
test('multi-event tickets are CMS-managed, use unique slugs, and checkout binds order to selected event', async () => {
 const admin=await read('admin/index.html');
 const cms=await read('admin/admin.js');
 const api=await read('netlify/functions/cms-api.mjs');
 const config=await read('netlify/functions/ticket-config.mjs');
 const helper=await read('netlify/functions/_ticket-cms.mjs');
 const create=await read('netlify/functions/ticket-create-order.mjs');
 const status=await read('netlify/functions/ticket-status.mjs');
 const migration=await read('supabase/migrations/202610270004_multi_event_ticketing.sql');
 assert.match(admin,/data-tab="ticketEvents"/);
 assert.match(cms,/ticketEvents:\{/);
 assert.match(api,/Slug acara tiket tidak boleh duplikat/);
 assert.match(api,/Slug acara yang sudah dibuat tidak boleh diubah/);
 assert.match(api,/Acara ini sudah memiliki riwayat pesanan/);
 assert.match(config,/queryStringParameters\?\.slug/);
 assert.match(helper,/readTicketEvents/);
 assert.match(create,/event_slug:eventSlug/);
 assert.match(create,/readTicketSettings\(eventSlug\)/);
 assert.match(status,/eventTitle:order\.event_title/);
 assert.match(api,/action==='ticket-reconcile'/);
 assert.match(api,/v2\/\$\{encodeURIComponent\(orderId\)\}\/status/);
 assert.match(api,/ticket-webhook\.mjs/);
 assert.match(migration,/add column if not exists event_slug/);
 assert.match(migration,/ticket_payment_audit/);
});


test('regression fixes: live ticket QR, duplicate checkout lock, terminal polling stop, and native ticket navigation', async () => {
 const ui=await read('assets/js/tickets.js');
 const html=await read('tiket.html');
 const app=await read('assets/js/app.js');
 assert.match(ui,/function lockCheckout\(\)/);
 assert.match(ui,/orderLocked \|\| !config\?\.checkoutEnabled/);
 assert.match(ui,/ticket-live-card/);
 assert.match(ui,/\['expired','failed','cancelled'\]\.includes\(data\.status\)/);
 assert.match(html,/assets\/js\/cms-bind\.js/);
 assert.match(html,/data-no-transition/);
 assert.match(app,/tiket\\\.html/);
});

test('CMS regression fixes: optional order defaults, ticket status filters, unsaved tabs retained, and safe hero outline', async () => {
 const cms=await read('admin/admin.js');
 const content=await read('assets/js/content.js');
 const bind=await read('assets/js/cms-bind.js');
 assert.match(cms,/k==='order'\?Math\.max\(-1/);
 assert.match(cms,/item\.status==='published'&&item\.active!==false\?'active'/);
 assert.doesNotMatch(cms,/Perubahan belum disimpan\. Pindah menu dan membuang perubahan/);
 assert.ok(content.includes('<em>${esc(lines[1])}</em>'));
 assert.match(bind,/L\.length >= 3 \? esc\(L\[0\]\)/);
});

test('ticket configuration distinguishes payment setup from event publication', async () => {
 const api=await read('netlify/functions/ticket-config.mjs');
 const ui=await read('assets/js/tickets.js');
 assert.match(api,/paymentConfigured:serverReady\(\)/);
 assert.match(ui,/Checkout belum tersedia: konfigurasi pembayaran\/server belum lengkap/);
});
