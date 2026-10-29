// Authoritative ticket event configuration from the same GitHub-backed CMS content.
// Secrets remain exclusively in Netlify environment variables.
async function readContent() {
  const { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH = 'main', GITHUB_TOKEN } = process.env;
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) throw new Error('CMS GitHub belum dikonfigurasi.');
  const url = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/data/content.json?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`CMS tidak dapat dibaca (HTTP ${response.status}).`);
  const file = await response.json();
  return JSON.parse(Buffer.from(String(file.content || '').replace(/\n/g, ''), 'base64').toString('utf8'));
}
function normalize(item) {
  const price = Number(item.price), capacity = Number(item.capacity ?? 100), maxPerOrder = Number(item.maxPerOrder ?? 5);
  const salesStartsAt = typeof item.salesStartsAt === 'string' ? item.salesStartsAt.trim() : '';
  const salesEndsAt = typeof item.salesEndsAt === 'string' ? item.salesEndsAt.trim() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug || '') || item.slug.length > 80) throw new Error('Slug acara tiket tidak valid.');
  if (typeof item.active !== 'boolean' || typeof item.title !== 'string' || !item.title.trim()) throw new Error('Nama acara tiket wajib diisi.');
  if (!Number.isSafeInteger(price) || price < 1 || price > 50000000) throw new Error('Harga tiket harus bilangan Rupiah bulat antara 1 dan 50.000.000.');
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100000) throw new Error('Kapasitas tiket harus bilangan bulat antara 1 dan 100.000.');
  if (!Number.isSafeInteger(maxPerOrder) || maxPerOrder < 1 || maxPerOrder > 5) throw new Error('Batas pembelian harus antara 1 dan 5 tiket.');
  for (const [key, value] of [['salesStartsAt', salesStartsAt], ['salesEndsAt', salesEndsAt]]) if (value && !Number.isFinite(Date.parse(value))) throw new Error(`Waktu ${key} tidak valid.`);
  if (salesStartsAt && salesEndsAt && Date.parse(salesEndsAt) <= Date.parse(salesStartsAt)) throw new Error('Periode penjualan tidak valid.');
  const now = Date.now();
  return { slug: item.slug, active: item.active && (item.status === undefined || item.status === 'published'), status: item.status || (item.active ? 'published' : 'draft'), title: item.title.trim().slice(0, 200), description: typeof item.description === 'string' ? item.description.slice(0, 5000) : '', dateLabel: typeof item.dateLabel === 'string' ? item.dateLabel.slice(0, 200) : '', location: typeof item.location === 'string' ? item.location.slice(0, 300) : '', poster: typeof item.poster === 'string' ? item.poster.slice(0, 1000) : '', ticketType: typeof item.ticketType === 'string' && item.ticketType.trim() ? item.ticketType.trim().slice(0, 100) : 'Umum', capacity, maxPerOrder, salesStartsAt, salesEndsAt, salesAvailable: (!salesStartsAt || now >= Date.parse(salesStartsAt)) && (!salesEndsAt || now < Date.parse(salesEndsAt)), price };
}
export async function readTicketEvents({ includeClosed = false } = {}) {
  const content = await readContent();
  let rows = Array.isArray(content.ticketEvents) ? content.ticketEvents : [];
  // Compatibility with older repositories that have not yet saved the new CMS collection.
  if (!rows.length && content.ticketing?.title) rows = [{ ...content.ticketing, id: 'legacy-ticket-event', slug: 'pbb-event', status: content.ticketing.active ? 'published' : 'draft' }];
  const events = rows.map(normalize);
  return includeClosed ? events : events.filter(e => e.active && e.status === 'published');
}
export async function readTicketSettings(slug) {
  const all = await readTicketEvents({ includeClosed: true });
  const config = slug ? all.find(e => e.slug === slug) : all.find(e => e.active && e.status === 'published');
  if (!config) throw new Error(slug ? 'Acara tiket tidak ditemukan.' : 'Belum ada acara tiket yang dipublikasikan.');
  return config;
}
