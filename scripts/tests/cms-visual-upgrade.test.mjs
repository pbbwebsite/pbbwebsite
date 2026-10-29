import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../assets/css/style.css', import.meta.url), 'utf8');
const cms = fs.readFileSync(new URL('../admin/admin.js', import.meta.url), 'utf8');
const content = fs.readFileSync(new URL('../assets/js/content.js', import.meta.url), 'utf8');
const webhook = fs.readFileSync(new URL('../netlify/functions/ticket-webhook.mjs', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/202610270003_ticket_email_claim.sql', import.meta.url), 'utf8');

test('visual readability override reduces canvas, removes layered glow and improves opaque content surfaces', () => {
  assert.match(css, /#boxing-canvas-container\{opacity:\.075!important/);
  assert.match(css, /--glow-red:none/);
  assert.match(css, /background:rgba\(18,16,16,\.97\)/);
  assert.match(css, /\.ticker\{transform:none;box-shadow:none/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('CMS provides server-backed image upload controls for brand and ticket assets plus item image fields', () => {
  assert.match(cms, /function attachAssetUploads/);
  assert.match(cms, /input\[name="logo"\].*input\[name="heroImage"\].*input\[name="poster"\].*input\[name="videoPoster"\]/);
  assert.match(cms, /\['gallery','programs','coaches','events','ticketEvents'\]/);
  assert.match(cms, /action=upload/);
});

test('program images edited through CMS are rendered on the public program page', () => {
  assert.match(content, /safeAsset\(s\.heroImage\)/);
  assert.match(fs.readFileSync(new URL('../netlify/functions/cms-api.mjs', import.meta.url), 'utf8'), /'logo','heroImage','heroTitle'/);
  assert.match(content, /program-detail-image/);
  assert.match(content, /x\.image\?`<img class="program-detail-image"/);
});

test('ticket email sending uses atomic claims and migration supports retry states', () => {
  assert.match(webhook, /email_status=in\.\(pending,failed\)/);
  assert.match(webhook, /email_attempted_at=lt\./);
  assert.match(webhook, /email_status:ok\?'sent':'failed'/);
  assert.match(migration, /email_status in \('pending','sending','sent','failed'\)/);
  assert.match(migration, /email_attempted_at/);
});
