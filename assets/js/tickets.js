(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('ticketForm');
  if (!form) return;
  const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
  let config = null, events = [], orderId = null, pollTimer = null, currentTickets = [], orderLocked = false;
  const notice = (message, show = true) => { $('ticketNotice').textContent = message; $('ticketNotice').hidden = !show; };
  const setBusy = (busy) => { $('ticketSubmit').disabled = busy || orderLocked || !config?.checkoutEnabled; $('ticketSubmit').textContent = busy ? 'Memproses…' : orderLocked ? 'Pesanan sudah dibuat' : 'Lanjut ke Pembayaran ↗'; };
  function lockCheckout(){orderLocked=true;$('ticketForm').hidden=true;$('eventSelector').disabled=true;setBusy(false);}
  function unlockForNewOrder(){clearInterval(pollTimer);pollTimer=null;orderId=null;orderLocked=false;currentTickets=[];const url=new URL(location.href);url.searchParams.delete('order');url.searchParams.delete('access');history.replaceState({},'',url);$('ticketForm').hidden=false;$('eventSelector').disabled=false;$('paymentBox').hidden=true;$('issuedTicket').hidden=true;if($('newTicketOrder'))$('newTicketOrder').hidden=true;$('ticketSubmit').hidden=false;$('ticketForm').querySelectorAll('input,select,button').forEach(el=>el.disabled=false);$('ticketQty').value='1';setBusy(false);updateTotal();notice('Silakan periksa data sebelum membuat pesanan baru.',true);}
  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) }, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(body.error || 'Permintaan gagal. Silakan coba lagi.'); if (body.orderId) error.orderId = body.orderId; throw error; }
    return body;
  }
  function updateTotal() { if (config) $('ticketTotal').textContent = rupiah(config.price * Number($('ticketQty').value)); else $('ticketTotal').textContent = '—'; }
  function updateEventView() {
    if (!config) return;
    $('eventTitle').textContent = config.title;
    $('eventDescription').textContent = config.description || 'Acara resmi Persatuan Boxing Bogor.';
    $('eventMeta').textContent = [config.dateLabel, config.location, config.ticketType ? `Jenis tiket: ${config.ticketType}` : '', `Kapasitas ${config.capacity} tiket`].filter(Boolean).join(' · ');
    const card = document.querySelector('.ticket-event-card');
    let poster = document.getElementById('eventPoster');
    if (config.poster) {
      if (!poster) { poster = document.createElement('img'); poster.id = 'eventPoster'; poster.alt = `Poster ${config.title}`; poster.loading = 'lazy'; poster.style.cssText = 'display:block;width:100%;max-width:520px;height:auto;margin:16px 0;border:1px solid var(--line)'; card.insertBefore(poster, card.querySelector('h2')); }
      poster.src = config.poster; poster.hidden = false;
    } else if (poster) poster.hidden = true;
    for (const option of $('ticketQty').options) option.disabled = Number(option.value) > Number(config.maxPerOrder || 5);
    $('ticketQty').value = '1'; updateTotal();
    const enabled = Boolean(config.checkoutEnabled);
    $('ticketSubmit').disabled = !enabled;
    if (!enabled) notice(!config.paymentConfigured ? 'Checkout belum tersedia: konfigurasi pembayaran/server belum lengkap. Hubungi pengelola.' : config.active && config.salesAvailable ? 'Acara tersedia, tetapi penjualan belum dibuka di konfigurasi acara.' : 'Penjualan acara ini belum dibuka atau sudah ditutup.', true);
    else notice('', false);
  }
  async function selectEvent(slug) {
    const found = events.find(e => e.slug === slug);
    if (!found) { config = null; $('ticketSubmit').disabled = true; $('ticketTitle'); $('eventTitle').textContent = 'Pilih acara'; $('eventDescription').textContent = 'Pilih acara yang tersedia untuk melihat detail dan harga tiket.'; $('eventMeta').textContent = ''; $('ticketTotal').textContent = '—'; return; }
    config = found;
    updateEventView();
  }
  async function loadConfig() {
    try {
      const data = await request('/.netlify/functions/ticket-config');
      events = Array.isArray(data.events) ? data.events : [];
      const select = $('eventSelector'); select.replaceChildren();
      if (!events.length) {
        const option = document.createElement('option'); option.value = ''; option.textContent = 'Belum ada acara tersedia'; select.append(option); select.disabled = true;
        $('eventTitle').textContent = 'Penjualan tiket belum dibuka'; $('eventDescription').textContent = data.message || 'Belum ada acara yang dipublikasikan melalui CMS.'; $('eventMeta').textContent = ''; $('ticketTotal').textContent = 'Belum tersedia'; $('ticketSubmit').disabled = true; $('ticketForm').querySelectorAll('input,select').forEach(el => el.disabled = true); notice(data.message || 'Pengelola belum mempublikasikan acara tiket.', true); return;
      }
      select.disabled = false;
      for (const item of events) { const option = document.createElement('option'); option.value = item.slug; option.textContent = `${item.title} — ${rupiah(item.price)}`; select.append(option); }
      const requested = new URLSearchParams(window.location.search).get('event');
      select.value = events.some(e => e.slug === requested) ? requested : events[0].slug;
      await selectEvent(select.value);
    } catch (error) {
      $('eventTitle').textContent = 'Penjualan tiket belum tersedia'; $('eventDescription').textContent = 'Informasi acara belum dapat dimuat. Silakan kembali beberapa saat lagi.'; $('ticketTotal').textContent = 'Belum tersedia'; $('ticketSubmit').disabled = true; notice(error.message);
    }
  }
  function displayPayment(data) {
    orderId = data.orderId;
    lockCheckout();
    if (data.accessToken) { const url = new URL(window.location.href); url.searchParams.set('order', orderId); url.searchParams.set('access', data.accessToken); window.history.replaceState({}, '', url); }
    $('paymentBox').hidden = false; $('issuedTicket').hidden = true; if($('newTicketOrder'))$('newTicketOrder').hidden=true;
    if (data.qrUrl) { $('paymentQr').src = data.qrUrl; $('paymentQr').hidden = false; }
    else $('paymentQr').hidden = true;
    $('paymentAmount').textContent = rupiah(data.amount);
    $('paymentInstructions').textContent = 'Pindai QRIS menggunakan aplikasi pembayaran yang mendukung QRIS. Bayar sesuai nominal yang tertera.';
    notice('Pesanan berhasil dibuat. Tiket belum aktif sampai pembayaran terverifikasi.', true);
    checkStatus();
    clearInterval(pollTimer); pollTimer = setInterval(checkStatus, 8000);
  }
  async function checkStatus() {
    if (!orderId) return;
    try {
      const data = await request(`/.netlify/functions/ticket-status?orderId=${encodeURIComponent(orderId)}&access=${encodeURIComponent(new URLSearchParams(window.location.search).get('access') || '')}`);
      $('paymentState').textContent = data.status === 'paid' ? 'Pembayaran terverifikasi.' : data.status === 'expired' ? 'Pesanan kedaluwarsa. Silakan buat pesanan baru.' : data.status === 'failed' ? 'Pembayaran gagal. Silakan buat pesanan baru.' : 'Menunggu pembayaran terverifikasi…';
      if (['expired','failed','cancelled'].includes(data.status)) { clearInterval(pollTimer); pollTimer=null; let retry=$('newTicketOrder'); if(!retry){retry=document.createElement('button');retry.id='newTicketOrder';retry.type='button';retry.className='ticket-button';retry.textContent='Buat pesanan baru';$('paymentBox').append(retry);retry.addEventListener('click',unlockForNewOrder);} retry.hidden=false; }
      if (data.status === 'paid' && data.tickets?.length) {
        clearInterval(pollTimer); currentTickets = data.tickets; $('paymentBox').hidden = true; $('issuedTicket').hidden = false;
        $('ticketList').replaceChildren();
        for (const ticket of data.tickets) { const item = document.createElement('article'); item.className = 'ticket-live-card'; const heading=document.createElement('strong');heading.textContent=`${ticket.code} · ${ticket.status === 'used' ? 'Sudah digunakan' : 'Valid'}`;const qr=document.createElement('div');qr.className='ticket-live-qr';qr.setAttribute('aria-label',`QR tiket ${ticket.code}`);item.append(heading,qr);$('ticketList').append(item);if(window.QRCode&&ticket.token)new QRCode(qr,{text:ticket.token,width:180,height:180,correctLevel:QRCode.CorrectLevel.M});else{const fallback=document.createElement('p');fallback.textContent='QR tidak dapat dibuat karena pustaka QR belum termuat. Muat ulang halaman atau simpan tiket PDF.';item.append(fallback);}}
        const t = data.tickets[0]; $('receiptEvent').textContent = data.eventTitle || config?.title || 'Acara Persatuan Boxing Bogor'; $('receiptName').textContent = `Pemegang tiket: ${data.buyerName || ''}`; $('receiptDate').textContent = [data.eventDateLabel || config?.dateLabel, data.eventLocation || config?.location].filter(Boolean).join(' · '); $('receiptCode').textContent = '';
        const receiptList = $('receiptTickets'); receiptList.replaceChildren();
        for (const ticket of data.tickets) { const card = document.createElement('div'); card.className = 'receipt-ticket'; const heading = document.createElement('strong'); heading.textContent = ticket.code; const qr = document.createElement('div'); qr.setAttribute('aria-label', `QR tiket ${ticket.code}`); card.append(heading, qr); receiptList.append(card); if (window.QRCode && ticket.token) new QRCode(qr, { text: ticket.token, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M }); }
        notice('Pembayaran berhasil. QR tiket tampil di halaman ini; email pengiriman sedang diproses.', true);
      }
    } catch (error) { $('paymentState').textContent = 'Status belum dapat diperiksa. Coba tombol Periksa Status.'; }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!config || orderLocked || !config.checkoutEnabled) return;
    setBusy(true); notice('', false);
    try {
      const values = Object.fromEntries(new FormData(form).entries()); values.quantity = Number(values.quantity); values.eventSlug = config?.slug;
      const data = await request('/.netlify/functions/ticket-create-order', { method: 'POST', body: JSON.stringify(values) });
      displayPayment(data);
    } catch (error) { if(error.orderId){orderId=error.orderId;lockCheckout();notice(`${error.message} Nomor pesanan: ${error.orderId}. Checkout dikunci agar tidak membuat pesanan ganda; periksa status sebelum mencoba lagi.`);}else notice(error.message); }
    finally { setBusy(false); }
  });
  $('ticketQty').addEventListener('change', updateTotal);
  $('eventSelector').addEventListener('change', () => selectEvent($('eventSelector').value));
  $('checkPayment').addEventListener('click', checkStatus);
  $('printTicket').addEventListener('click', () => window.print());
  const params = new URLSearchParams(window.location.search); const savedOrder = params.get('order'); const savedAccess = params.get('access'); if (savedOrder && savedAccess) { orderId = savedOrder; lockCheckout(); $('paymentBox').hidden = false; $('ticketForm').hidden = true; $('ticketSubmit').hidden = true; $('paymentQr').hidden = true; $('paymentInstructions').textContent = 'Memeriksa status pesanan…'; checkStatus(); pollTimer = setInterval(checkStatus, 8000); }
  loadConfig();
})();
