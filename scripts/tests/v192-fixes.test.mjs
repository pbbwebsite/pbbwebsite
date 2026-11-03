import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v1.9.2: login CMS toleran spasi, asal permintaan memakai host terusan, pembatas tidak dipakai bersama',()=>{
 const api=read('netlify/functions/cms-api.mjs');
 assert.match(api,/CMS_ADMIN_PASSWORD\.trim\(\)\),given=Buffer\.from\(String\(pass\)\.trim\(\)\)/);
 assert.match(api,/x-forwarded-host/);assert.match(api,/function clientKey/);
 assert.doesNotMatch(api,/x-nf-client-connection-ip'\]\|\|'unknown';globalThis/);
});
test('v1.9.2: CMS memulihkan sesi saat dimuat dan kembali ke form login saat sesi habis',()=>{
 const js=read('admin/admin.js');
 assert.match(js,/function showLogin/);assert.match(js,/r\.status===401&&!path\.includes\('action=login'\)/);
 assert.match(js,/fetch\(API,\{credentials:'same-origin',cache:'no-store'\}\)/);
 assert.match(read('admin/platform.js'),/Pulihkan sesi admin data/);
});
test('v1.9.2: judul hero tidak pernah disembunyikan dan mesh 3D judul tidak digambar',()=>{
 const css=read('assets/css/style.css'),k=read('assets/js/kinetic.js');
 assert.doesNotMatch(css,/\.kinetic-title \.kinetic-slot\{color:transparent/);
 assert.match(k,/title\.group\.visible = false;\s*return;/);
 assert.match(css,/\.hero-side-note\{[^}]*white-space:nowrap/);
});
