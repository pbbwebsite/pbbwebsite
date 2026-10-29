import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(body)});
async function db(path,options={}){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const r=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${path}`,{...options,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',prefer:options.prefer||'return=representation',...(options.headers||{})}});const text=await r.text();if(!r.ok)throw new Error('Database update failed');return text?JSON.parse(text):null}
async function sendTicketEmail(order,tickets){
 if(!process.env.RESEND_API_KEY||!process.env.TICKET_EMAIL_FROM)return false;
 const origin=(process.env.URL||'').replace(/\/$/,'');const ticketLines=tickets.map(t=>`<li><strong>${t.ticket_code}</strong> — simpan kode ini dan tunjukkan tiket digital di halaman <a href="${origin}/tiket.html?order=${encodeURIComponent(order.order_id)}&access=${encodeURIComponent(order.access_token)}">Tiket Saya</a>.</li>`).join('');
 const payload={from:process.env.TICKET_EMAIL_FROM,to:[order.buyer_email],subject:`Tiket ${order.event_title||'Persatuan Boxing Bogor'} — ${order.order_id}`,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><p>PERSATUAN BOXING BOGOR</p><h1>Pembayaran terkonfirmasi</h1><p>Halo ${escapeHtml(order.buyer_name)}, pembayaran untuk pesanan <b>${escapeHtml(order.order_id)}</b> telah terverifikasi.</p><ul>${ticketLines}</ul><p>Gunakan tombol Cetak / Simpan PDF pada halaman tiket untuk menyimpan tiket sebagai PDF. Setiap tiket hanya berlaku satu kali.</p></div>`};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(payload)});return r.ok;
}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const body=event.body||'';let x;try{x=JSON.parse(body)}catch{return json(400,{error:'Invalid JSON'})}
 const {MIDTRANS_SERVER_KEY}=process.env;if(!MIDTRANS_SERVER_KEY||!x.order_id||!x.status_code||!x.gross_amount||!x.signature_key)return json(400,{error:'Missing payment fields'});
 const expected=createHash('md5').update(`${x.order_id}${x.status_code}${x.gross_amount}${MIDTRANS_SERVER_KEY}`).digest('hex');
 try{if(expected.length!==x.signature_key.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(x.signature_key)))return json(401,{error:'Invalid signature'});}catch{return json(401,{error:'Invalid signature'})}
 try{
  const orderRows=await db(`ticket_orders?order_id=eq.${encodeURIComponent(x.order_id)}&select=*`);const order=orderRows?.[0];if(!order)return json(404,{error:'Order not found'});
  if(Number(x.gross_amount)!==order.gross_amount)return json(400,{error:'Amount mismatch'});
  if(x.currency && x.currency!=='IDR')return json(400,{error:'Currency mismatch'});
  if(!['pending','settlement','capture','expire','cancel','deny','refund','partial_refund','failure'].includes(x.transaction_status))return json(400,{error:'Unsupported transaction status'});
  const status=x.transaction_status;const fraud=x.fraud_status;
  await db('ticket_payment_audit',{method:'POST',prefer:'return=minimal',body:JSON.stringify({order_id:order.order_id,event_slug:order.event_slug||'pbb-event',transaction_status:status,gateway_transaction_id:x.transaction_id||null,gross_amount:order.gross_amount})}).catch(()=>{});
  if((status==='settlement'||(status==='capture'&&(!fraud||fraud==='accept')))&&['201','200'].includes(String(x.status_code))){
    let current=order;
    if(current.status!=='paid'){
      const updated=await db(`ticket_orders?order_id=eq.${encodeURIComponent(current.order_id)}&status=eq.pending`,{method:'PATCH',body:JSON.stringify({status:'paid',paid_at:new Date().toISOString(),gateway_status:status,updated_at:new Date().toISOString()})});
      current=(await db(`ticket_orders?order_id=eq.${encodeURIComponent(current.order_id)}&select=*`))[0]||current;
      if(!updated?.length&&current.status!=='paid')return json(200,{ok:true,ignored:true});
    }
    if(current.status==='paid'){
      let tickets=await db(`ticket_tickets?order_id=eq.${encodeURIComponent(current.order_id)}&select=ticket_code,ticket_token,status,ticket_index&order=ticket_index.asc`);
      if(!tickets||tickets.length<current.quantity){
        const generated=Array.from({length:current.quantity},(_,i)=>({order_id:current.order_id,ticket_code:`PBB-${cryptoRandom().slice(0,10).toUpperCase()}`,ticket_token:cryptoRandom()+cryptoRandom(),status:'valid',ticket_index:i+1}));
        await db('ticket_tickets',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',body:JSON.stringify(generated)});
        tickets=await db(`ticket_tickets?order_id=eq.${encodeURIComponent(current.order_id)}&select=ticket_code,ticket_token,status,ticket_index&order=ticket_index.asc`);
      }
      if(tickets?.length===current.quantity&&current.email_status!=='sent'){
        // Atomic claim: only one replay/concurrent webhook may move pending/failed -> sending.
        // A stale sending claim is recoverable after five minutes if a function crashed mid-send.
        const now=Date.now(), stamp=new Date(now).toISOString();
        let claim=await db(`ticket_orders?order_id=eq.${encodeURIComponent(current.order_id)}&email_status=in.(pending,failed)`,{method:'PATCH',body:JSON.stringify({email_status:'sending',email_attempted_at:stamp,updated_at:stamp})});
        if(!claim?.length&&current.email_status==='sending'&&current.email_attempted_at&&Date.parse(current.email_attempted_at)<now-5*60*1000){
          const cutoff=new Date(now-5*60*1000).toISOString();
          claim=await db(`ticket_orders?order_id=eq.${encodeURIComponent(current.order_id)}&email_status=eq.sending&email_attempted_at=lt.${encodeURIComponent(cutoff)}`,{method:'PATCH',body:JSON.stringify({email_status:'sending',email_attempted_at:stamp,updated_at:stamp})});
        }
        if(claim?.length){
          const ok=await sendTicketEmail(current,tickets).catch(()=>false);
          const finishedAt=new Date().toISOString();
          await db(`ticket_orders?order_id=eq.${encodeURIComponent(current.order_id)}&email_status=eq.sending&email_attempted_at=eq.${encodeURIComponent(stamp)}`,{method:'PATCH',body:JSON.stringify({email_status:ok?'sent':'failed',updated_at:finishedAt})}).catch(()=>{});
        }
      }
    }
  } else if(['expire','cancel','deny','failure'].includes(status)&&order.status==='pending') {const changed=await db(`ticket_orders?order_id=eq.${encodeURIComponent(order.order_id)}&status=eq.pending`,{method:'PATCH',body:JSON.stringify({status:status==='expire'?'expired':'failed',gateway_status:status,updated_at:new Date().toISOString()})});if(changed?.length)await db('rpc/release_ticket_capacity',{method:'POST',body:JSON.stringify({p_event_slug:order.event_slug||'pbb-event',p_quantity:order.quantity})});
  } else if(['refund','partial_refund'].includes(status)&&order.status==='paid') {
    // Conservative access policy: a full or partial refund invalidates every ticket in that order.
    const changed=await db(`ticket_orders?order_id=eq.${encodeURIComponent(order.order_id)}&status=eq.paid`,{method:'PATCH',body:JSON.stringify({status:'refunded',gateway_status:status,updated_at:new Date().toISOString()})});
    if(changed?.length){await db(`ticket_tickets?order_id=eq.${encodeURIComponent(order.order_id)}&status=eq.valid`,{method:'PATCH',body:JSON.stringify({status:'cancelled'})}).catch(()=>{});await db('rpc/release_ticket_capacity',{method:'POST',body:JSON.stringify({p_event_slug:order.event_slug||'pbb-event',p_quantity:order.quantity})}).catch(()=>{});}
  }
  return json(200,{ok:true});
 }catch{return json(500,{error:'Webhook processing failed; gateway may retry.'})}
}
function cryptoRandom(){return randomBytes(24).toString('hex')}
