import { readTicketEvents, readTicketSettings } from './_ticket-cms.mjs';
const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},body:JSON.stringify(body)});
const serverReady=()=>process.env.TICKETING_ENABLED==='true'&&!!process.env.SUPABASE_URL&&!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.MIDTRANS_SERVER_KEY;
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{error:'Metode tidak didukung.'});
 try{
  const slug=String(event.queryStringParameters?.slug||'').trim();
  if(slug){const config=await readTicketSettings(slug);return json(200,{...config,paymentConfigured:serverReady(),checkoutEnabled:serverReady()&&config.active&&config.salesAvailable});}
  const events=await readTicketEvents();
  return json(200,{events:events.map(({slug,title,description,dateLabel,location,poster,ticketType,price,capacity,maxPerOrder,salesStartsAt,salesEndsAt,salesAvailable,status})=>({slug,title,description,dateLabel,location,poster,ticketType,price,capacity,maxPerOrder,salesStartsAt,salesEndsAt,salesAvailable,status,paymentConfigured:serverReady(),checkoutEnabled:serverReady()&&salesAvailable})),paymentConfigured:serverReady(),checkoutEnabled:serverReady()});
 }catch(error){const message=String(error?.message||'');const safe=/^(Slug acara tiket tidak valid\.|Nama acara tiket wajib diisi\.|Harga tiket harus bilangan Rupiah bulat antara 1 dan 50\.000\.000\.|Kapasitas tiket harus bilangan bulat antara 1 dan 100\.000\.|Batas pembelian harus antara 1 dan 5 tiket\.|Waktu salesStartsAt tidak valid\.|Waktu salesEndsAt tidak valid\.|Periode penjualan tidak valid\.)$/.test(message);return json(safe?422:503,{events:[],paymentConfigured:serverReady(),checkoutEnabled:false,message:safe?message:'Informasi acara belum dapat dimuat. Pengelola perlu memeriksa konfigurasi CMS dan koneksi penyimpanan.'});}
}
