import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('content data has expected collections and official PBB contact details',async()=>{const d=JSON.parse(await readFile('data/content.json','utf8'));assert.ok(d.site);for(const k of ['programs','coaches','schedule','gallery'])assert.ok(Array.isArray(d[k]));assert.equal(d.site.whatsapp,'085863609503');assert.equal(d.site.email,'persatuanboxingbogor@gmail.com');assert.match(d.site.address,/Lippo Mall Ekalokasari/);assert.match(d.site.instagram,/persatuanboxingbogor/);assert.match(d.site.tiktok,/@persatuanboxingbogor/)});
test('CMS protects API writes by requiring a signed session',async()=>{const m=await import('../netlify/functions/cms-api.mjs');const r=await m.handler({httpMethod:'PUT',path:'/.netlify/functions/cms-api',headers:{},body:'{}'});assert.equal(r.statusCode,401)});
test('contact endpoint refuses to claim success without configured receiver',async()=>{delete process.env.CONTACT_WEBHOOK_URL;const m=await import('../netlify/functions/contact.mjs');const r=await m.handler({httpMethod:'POST',headers:{},body:JSON.stringify({name:'Test',contact:'test@example.com'})});assert.equal(r.statusCode,503)});

test('CMS rejects cross-origin writes before touching storage',async()=>{const m=await import('../netlify/functions/cms-api.mjs');const r=await m.handler({httpMethod:'PUT',path:'/.netlify/functions/cms-api',headers:{origin:'https://evil.example',host:'site.netlify.app'},body:'{}'});assert.equal(r.statusCode,403)});
test('CMS upload endpoint requires a valid session',async()=>{const m=await import('../netlify/functions/cms-api.mjs');const r=await m.handler({httpMethod:'POST',path:'/.netlify/functions/cms-api/upload',headers:{},body:JSON.stringify({dataUrl:'data:image/png;base64,AAAA'})});assert.equal(r.statusCode,401)});
test('CMS rejects unknown fields in authenticated writes before GitHub access',async()=>{const {createHmac}=await import('node:crypto');process.env.CMS_SESSION_SECRET='test-session-secret';const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000,nonce:'test'})).toString('base64url');const sig=createHmac('sha256',process.env.CMS_SESSION_SECRET).update(payload).digest('base64url');const m=await import('../netlify/functions/cms-api.mjs');const content={site:{name:'Test'},programs:[],coaches:[],schedule:[],gallery:[],evil:'field'};const r=await m.handler({httpMethod:'PUT',path:'/.netlify/functions/cms-api',headers:{cookie:`pbogor_session=${payload}.${sig}`},body:JSON.stringify(content)});assert.equal(r.statusCode,400);assert.match(JSON.parse(r.body).error,/kolom data|kolom pengaturan/);delete process.env.CMS_SESSION_SECRET});
test('public pages do not ship fabricated coach or schedule examples',async()=>{const [coaches,schedule,programs]=await Promise.all(['coaches.html','schedule.html','programs.html'].map(f=>readFile(f,'utf8')));assert.doesNotMatch(coaches,/HEAD COACH|CONDITIONING COACH|THE STRATEGIST/);assert.doesNotMatch(schedule,/Technical Sparring\*|07:00.*Boxing Essentials/);assert.doesNotMatch(programs,/BOXING<br>.*ESSENTIALS|FIGHTER'S/)});
test('contact endpoint rejects cross-origin submissions',async()=>{const m=await import('../netlify/functions/contact.mjs');const r=await m.handler({httpMethod:'POST',headers:{origin:'https://evil.example',host:'site.netlify.app'},body:JSON.stringify({name:'A',contact:'B'})});assert.equal(r.statusCode,403)});
test('gallery page is present and uses CMS-driven gallery content',async()=>{const page=await readFile('gallery.html','utf8');const script=await readFile('assets/js/content.js','utf8');assert.match(page,/gallery-grid/);assert.match(page,/gallery.html/);assert.match(script,/data\.gallery/);assert.match(script,/galleryLightbox/)});

test('public pages have skip navigation, named navigation, and SEO descriptions',async()=>{
  for(const file of ['index.html','programs.html','coaches.html','schedule.html','gallery.html','contact.html']){
    const html=await readFile(file,'utf8');
    assert.match(html,/class="skip-link" href="#main-content"/,`${file} should provide a skip link`);
    assert.match(html,/id="main-content"/,`${file} should provide a main landmark target`);
    assert.match(html,/nav class="nav" aria-label="Navigasi utama"/,`${file} should name the main navigation`);
    assert.match(html,/<meta name="description" content="[^"]+">/,`${file} should provide a meta description`);
    assert.equal((html.match(/<a\b/g)||[]).length,(html.match(/<\/a>/g)||[]).length,`${file} anchor tags should be balanced`);
  }
});
test('homepage has no fabricated performance metrics or hardcoded program cards',async()=>{
  const html=await readFile('index.html','utf8');
  assert.doesNotMatch(html,/850\+|YEARS IN THE CORNER|ATHLETES FORGED|FIGHTER'S<br>CONDITIONING/);
  assert.match(html,/class="program-cards"/);
  assert.match(html,/Program resmi belum tersedia/);
});
test('CMS-configured hero heading and button labels are rendered safely',async()=>{
  const script=await readFile('assets/js/content.js','utf8');
  assert.match(script,/String\(s\.heroTitle\)\.split\('\|'\)/);
  assert.match(script,/s\.heroPrimaryText/);
  assert.match(script,/s\.heroSecondaryText/);
});


test('all public pages load Barba and declare page containers for seamless transitions',async()=>{
  const pages=['index.html','programs.html','coaches.html','schedule.html','gallery.html','contact.html'];
  for(const file of pages){const html=await readFile(file,'utf8');assert.match(html,/data-barba="wrapper"/,`${file} needs a Barba wrapper`);assert.match(html,/data-barba="container"/,`${file} needs a Barba container`);assert.match(html,/@barba\/core/,`${file} needs the Barba runtime`);}
  const app=await readFile('assets/js/app.js','utf8');assert.match(app,/pbb-soft-crossfade/);assert.match(app,/window\.PBBContent\.render/);
});
test('homepage enables interactive WebGL glove and reduced-motion fallback',async()=>{
  const app=await readFile('assets/js/app.js','utf8');const css=await readFile('assets/css/style.css','utf8');
  assert.match(app,/new THREE\.WebGLRenderer/);assert.match(app,/pointermove/);assert.match(app,/scrollVelocity/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/impact-glitch/);
});
test('coach layouts include layered parallax styling without fabricated coach imagery',async()=>{
  const app=await readFile('assets/js/app.js','utf8');const css=await readFile('assets/css/style.css','utf8');const content=await readFile('assets/js/content.js','utf8');
  assert.match(app,/coach-card/);assert.match(app,/scrub:\s*\.7/);assert.match(css,/--coach-name/);assert.match(content,/data\.coaches/);
});


test('public pages use versioned GSAP and Barba CDNs before the app initializer', async () => {
  const pages = ['index.html', 'programs.html', 'coaches.html', 'schedule.html', 'contact.html', 'gallery.html'];
  for (const page of pages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@3\.12\.5\/dist\/gsap\.min\.js/);
    assert.match(html, /https:\/\/cdn\.jsdelivr\.net\/npm\/@barba\/core@2\.10\.3\/dist\/barba\.umd\.js/);
    assert.ok(html.indexOf('barba.umd.js') < html.indexOf('assets/js/app.js'), `${page}: Barba must load before app.js`);
    assert.ok(!html.includes('https://cloudflare.com'), `${page}: placeholder CDN URL must not be used`);
  }
});

test('Three.js r128 engine stack loads deferred, in dependency order, on the homepage', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const stack = [
    'three.js/r128/three.min.js',
    'examples/js/loaders/FontLoader.js',
    'examples/js/geometries/TextGeometry.js',
    'examples/js/modifiers/TessellateModifier.js',
    'examples/js/shaders/CopyShader.js',
    'examples/js/postprocessing/EffectComposer.js',
    'examples/js/postprocessing/RenderPass.js',
    'examples/js/postprocessing/ShaderPass.js',
    'gsap@3.12.5/dist/gsap.min.js',
    'gsap@3.12.5/dist/ScrollTrigger.min.js'
  ];
  let last = -1;
  for (const part of stack) {
    const at = html.indexOf(part);
    assert.ok(at > last, `${part} must be present and come after its dependency`);
    last = at;
    const tag = html.slice(html.lastIndexOf('<script', at), html.indexOf('>', at));
    assert.match(tag, /\sdefer\s/, `${part} must be deferred`);
  }
  assert.ok(html.indexOf('assets/js/kinetic.js') > html.indexOf('assets/js/app.js'), 'kinetic.js runs after app.js');
});

test('kinetic artwork contract: overlay layer, pointer pass-through, palette, shaders, shockwave and procedural audio', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../assets/css/style.css', import.meta.url), 'utf8');
  const js = await readFile(new URL('../assets/js/kinetic.js', import.meta.url), 'utf8');
  assert.match(html, /<body>\s*<div id="boxing-canvas-container"><\/div>/);
  const layer = html.indexOf('id="interactive-ui-layer"');
  assert.ok(layer > 0 && html.indexOf('<header class="site-header">') > layer && html.indexOf('<main') > layer && html.indexOf('<footer class="site-footer">') > layer, 'header, main and footer live inside the overlay layer');
  assert.match(css, /#interactive-ui-layer\{[^}]*position:absolute[^}]*pointer-events:none/);
  assert.match(css, /pointer-events:auto/);
  for (const colour of ['#0b0a0a', '#d9534f']) assert.ok(css.includes(colour), `${colour} token`);
  assert.match(js, /uniform vec2\s+u_mouse/);
  assert.match(js, /uniform float\s+u_velocity/);
  assert.match(js, /uniform float\s+u_time/);
  assert.match(js, /PUNCH_RADIUS\s*=\s*3\.0/);
  assert.match(js, /PUNCH_VELOCITY\s*=\s*1\.2/);
  assert.match(js, /dist < PUNCH_RADIUS && u_velocity > PUNCH_VELOCITY/);
  assert.match(js, /color\.r = texture2D\(tDiffuse, uv \+ vec2\(u_distortion, 0\.0\)\)\.r;/);
  assert.match(js, /color\.b = texture2D\(tDiffuse, uv\)\.b;/, 'blue-channel offset is removed to prevent blue ghosting');
  assert.match(js, /shock: \{ peak: 0\.06, duration: 0\.45 \}/);
  assert.match(js, /elastic\.out\(1, 0\.3\)/);
  assert.match(js, /frameMs: 1000 \/ 60/);
  assert.match(js, /function playProceduralPunchSound\(startFreq, duration/);
  assert.match(js, /osc\.type = 'sine'/);
  assert.match(js, /audio: \{ startFreq: 160, endFreq: 35, duration: 0\.25 \}/);
  assert.match(js, /exponentialRampToValueAtTime\(CONFIG\.audio\.endFreq/);
  assert.match(js, /exponentialRampToValueAtTime\(0\.001/);
  assert.doesNotMatch(js, /\.(mp3|wav|ogg)\b/, 'audio is synthesized, never loaded from files');
});


test('micro-interactions are scoped to intentional controls and glove punch has cleanup', async () => {
  const app = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../assets/css/style.css', import.meta.url), 'utf8');
  assert.match(app, /querySelectorAll\('\.btn, \.nav-cta, \.line-link'\)/);
  assert.match(app, /host\.addEventListener\('pointerdown', onPunch/);
  assert.match(app, /host\.removeEventListener\('pointerdown',onPunch/);
  assert.doesNotMatch(app, /elementFromPoint\(e\.clientX, e\.clientY\).*impact-glitch/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('contact form synchronously blocks duplicate submissions and always releases its lock', async () => {
  const app = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(form\.dataset\.submitting === '1'\) return/);
  assert.match(app, /form\.dataset\.submitting = '1'/);
  assert.match(app, /delete form\.dataset\.submitting/);
  assert.match(app, /if \(button\) \{ button\.disabled = false/);
});

test('Barba navigation errors fall back to normal same-origin navigation', async () => {
  const app = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /requestError\(trigger, action, url\)/);
  assert.match(app, /window\.location\.assign\(url\)/);
  assert.match(app, /new URL\(url, window\.location\.href\)\.origin === window\.location\.origin/);
});

test('failed WebGL initialization restores CSS glove fallback', async () => {
  const app = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /Decorative WebGL scene unavailable; CSS visual remains active/);
  assert.match(app, /host\.classList\.remove\('webgl-ready'\)/);
  assert.match(app, /renderer\.domElement\?\.remove\(\)/);
});

test('Barba preserves native same-document hash links and marks transitions as busy', async () => {
  const app = await readFile('assets/js/app.js', 'utf8');
  assert.match(app, /sameDocument && !!target\.hash/);
  assert.match(app, /document\.body\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(app, /document\.body\.removeAttribute\('aria-busy'\)/);
});

test('post-navigation focuses the incoming main landmark without a second scroll', async () => {
  const app = await readFile('assets/js/app.js', 'utf8');
  assert.match(app, /main\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /main\.setAttribute\('tabindex', '-1'\)/);
});

test('contact form status messaging safely handles an absent optional result element', async () => {
  const app = await readFile('assets/js/app.js', 'utf8');
  assert.match(app, /if \(result\) \{ result\.textContent = 'Mengirim permintaan/);
  assert.match(app, /if \(result\) result\.textContent = payload\.message/);
  assert.match(app, /catch \(error\) \{ if \(result\) result\.textContent/);
});

test('organization platform schema separates private athlete data and protects writes with RLS', async () => {
  const schema = await readFile(new URL('../supabase/migrations/202610100001_organization_platform_foundation.sql', import.meta.url), 'utf8');
  for (const table of ['user_profiles','clubs','athlete_profiles','athlete_private_details','registrations','competitions','competition_categories','competition_entries','matches','audit_logs']) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}\\b`), `${table} table should be defined`);
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must have RLS enabled`);
  }
  assert.match(schema, /create policy "private details admin only"/);
  assert.match(schema, /status = 'submitted'[\s\S]*reviewer_notes = ''[\s\S]*reviewed_by is null/);
  assert.match(schema, /create trigger competition_entry_links_guard/);
  assert.match(schema, /category_id must belong to competition_id/);
  assert.match(schema, /create trigger match_entry_links_guard/);
  assert.match(schema, /winner must be one of the red or blue entries/);
  assert.match(schema, /match entries must belong to match competition/);
  assert.match(schema, /No public\/anon write policies are intentionally defined/);
});

test('owner docs explain CMS location and clearly label Supabase as not yet connected', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const owner = await readFile(new URL('../OWNER-GUIDE-ID.md', import.meta.url), 'utf8');
  assert.match(readme, /CMS diakses melalui halaman admin terpisah/);
  assert.match(readme, /belum diterapkan ke proyek Supabase mana pun/);
  assert.match(owner, /tambahkan `\/admin\/`/);
  assert.match(owner, /Panel `\/admin\/platform\.html` kini menyediakan operasi tambah\/lihat\/perbarui/);
});

test('Supabase follow-up migration hardens public match visibility and registration links', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202610100002_integrity_hardening.sql', import.meta.url), 'utf8');
  assert.match(sql, /public reads matches with public participants/);
  assert.match(sql, /e\.status = 'approved'/);
  assert.match(sql, /validate_registration_links/);
  assert.match(sql, /competition entry registration requires competition_id/);
  assert.match(sql, /create trigger set_updated_at/);
  assert.match(sql, /commit;/);
});

test('Supabase onboarding documentation warns against exposing service role keys', async () => {
  const guide = await readFile(new URL('../docs/PANDUAN-SUPABASE-DARI-NOL-ID.md', import.meta.url), 'utf8');
  assert.match(guide, /Belum ada proyek Supabase yang terhubung/);
  assert.match(guide, /service_role/);
  assert.match(guide, /RLS aktif/);
  assert.match(guide, /GANTI-DENGAN-UUID-USER-AUTH/);
});

test('organization admin platform exists and does not embed Supabase server secrets', async()=>{
  const html=await readFile(new URL('../admin/platform.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../admin/platform.js',import.meta.url),'utf8');
  const api=await readFile(new URL('../netlify/functions/cms-api.mjs',import.meta.url),'utf8');
  assert.match(html,/athletes/);assert.match(html,/competitions/);assert.match(js,/credentials:'same-origin'/);
  assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);assert.match(api,/platformPayload/);
  assert.doesNotMatch(js,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test('platform API refuses unauthenticated data access and public competition page exists', async()=>{
  const m=await import('../netlify/functions/cms-api.mjs');
  const r=await m.handler({httpMethod:'GET',path:'/.netlify/functions/cms-api',queryStringParameters:{platform:'athletes'},headers:{host:'example.test'},body:''});
  assert.equal(r.statusCode,401);
  const html=await readFile(new URL('../competitions.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../assets/js/competitions.js',import.meta.url),'utf8');
  assert.match(html,/id="main-content"/);assert.match(js,/public=competitions/);
});


test('CMS and organization admin normalize select-field option tuples', async()=>{
  const cms=await readFile(new URL('../admin/admin.js',import.meta.url),'utf8');
  const platform=await readFile(new URL('../admin/platform.js',import.meta.url),'utf8');
  assert.match(cms,/Array\.isArray\(reqOrOpts\)/);
  assert.match(platform,/Array\.isArray\(requiredOrOpts\)/);
  assert.match(platform,/opts\.map\(o=>/);
});

test('public pages defer ordered third-party and local scripts to avoid parser blocking',async()=>{
  for(const file of ['index.html','programs.html','coaches.html','schedule.html','gallery.html','contact.html','competitions.html']){
    const html=await readFile(file,'utf8');
    const tags=[...html.matchAll(/<script\b[^>]*src="[^"]*"[^>]*>/g)].map(m=>m[0]);
    for(const src of ['gsap@3.12.5/dist/gsap.min.js','gsap@3.12.5/dist/ScrollTrigger.min.js','@barba/core@2.10.3/dist/barba.umd.js','assets/js/app.js']){
      const tag=tags.find(t=>t.includes(src));
      assert.ok(tag,`${file} should load ${src}`);
      assert.match(tag,/\sdefer(?:\s|>)/,`${file} should defer ${src}`);
    }
  }
});

test('CMS-rendered coach and gallery images use lazy loading and async decoding',async()=>{
  const script=await readFile('assets/js/content.js','utf8');
  assert.match(script,/loading="lazy"/);
  assert.match(script,/decoding="async"/);
});

test('styles provide a visible keyboard focus indicator and reduced-motion support',async()=>{
  const css=await readFile('assets/css/style.css','utf8');
  assert.match(css,/focus-visible/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});


test('competition interaction layer includes progressive Lenis, custom cursor, glass cards and reduced-motion fallbacks', async () => {
  const app = await readFile(new URL('../assets/js/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../assets/css/style.css', import.meta.url), 'utf8');
  for (const page of ['index.html','programs.html','coaches.html','schedule.html','competitions.html','gallery.html','contact.html']) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(html, /lenis@1\.1\.20\/dist\/lenis\.min\.js/, `${page} should load the optional Lenis enhancement`);
    assert.ok(html.indexOf('lenis.min.js') < html.indexOf('assets/js/app.js'), `${page}: Lenis must precede app initializer`);
  }
  assert.match(app, /function initSmoothScroll\(\)/);
  assert.match(app, /function initCustomCursor\(\)/);
  assert.match(app, /prefers-reduced-motion/);
  assert.match(css, /\.cursor-orb\.is-active/);
  assert.match(css, /backdrop-filter:blur\(14px\)/);
  assert.match(css, /@media\(hover:none\),\(pointer:coarse\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('competition list is re-rendered after Barba navigation, not only on first page load', async () => {
  const app = await readFile('assets/js/app.js', 'utf8');
  const comp = await readFile('assets/js/competitions.js', 'utf8');
  assert.match(comp, /window\.PBBCompetitions\s*=\s*\{\s*render/);
  assert.match(comp, /public=competitions/);
  assert.match(app, /function initCompetitions\(\)/);
  assert.match(app, /script\[data-pbb-competitions\]/);
  assert.match(app, /initThree\(\);\s*initCompetitions\(\);/);
});

test('Lenis scroll position is reset through Lenis after Barba enter', async () => {
  const app = await readFile('assets/js/app.js', 'utf8');
  assert.match(app, /lenisInstance\.scrollTo\(0,\s*\{\s*immediate:\s*true/);
});

test('CMS seed images use WebP and are smaller than the original files', async () => {
  const { stat } = await import('node:fs/promises');
  const data = JSON.parse(await readFile('data/content.json', 'utf8'));
  const pairs = [[data.site.logo, 'assets/img/logo-pbb.png'], [data.gallery[0].image, 'assets/img/pertandingan-tinju.jpg']];
  for (const [next, old] of pairs) {
    assert.match(next, /\.webp$/);
    assert.ok((await stat(next)).size < (await stat(old)).size, `${next} should be smaller than ${old}`);
  }
});

test('v1.3: halaman Tentang, nav konsisten, label kursor berbahasa Indonesia',async()=>{
  const pages=['index','about','programs','coaches','schedule','competitions','gallery','contact'];
  for(const n of pages){const h=await readFile(`${n}.html`,'utf8');assert.match(h,/href="about\.html"[^>]*>Tentang<\/a>/,`${n} harus punya link Tentang`);assert.doesNotMatch(h,/VIEW SCHEDULE|JOIN THE CAMP/,`${n} tidak boleh berlabel Inggris`)}
  const about=await readFile('about.html','utf8');assert.match(about,/about-root/);assert.match(about,/data-barba-namespace="about"/);
  const js=await readFile('assets/js/content.js','utf8');assert.match(js,/about-root/);assert.match(js,/#cmsEvents/);assert.match(js,/pbb:content/);
  const app=await readFile('assets/js/app.js','utf8');assert.doesNotMatch(app,/'VIEW'|'COACH'|'JOIN'|'CLICK'/);assert.match(app,/pbb_loaded/);assert.match(app,/pbb:content/)
});
test('v1.3: CMS menerima event dan teks Tentang, menolak status/link tidak valid',async()=>{
  const {createHmac}=await import('node:crypto');process.env.CMS_SESSION_SECRET='test-session-secret';
  const payload=Buffer.from(JSON.stringify({exp:Date.now()+60000,nonce:'test'})).toString('base64url');const sig=createHmac('sha256',process.env.CMS_SESSION_SECRET).update(payload).digest('base64url');
  const m=await import('../netlify/functions/cms-api.mjs');const send=c=>m.handler({httpMethod:'PUT',path:'/.netlify/functions/cms-api',headers:{cookie:`pbogor_session=${payload}.${sig}`},body:JSON.stringify(c)});
  const base={site:{name:'T',aboutVision:'v',aboutMission:'a\nb'},programs:[],coaches:[],schedule:[],gallery:[]};
  let r=await send({...base,events:[{id:'1',title:'E',status:'Segera'}]});assert.equal(r.statusCode,400);assert.match(JSON.parse(r.body).error,/Status event/);
  r=await send({...base,events:[{id:'1',title:'E',registrationUrl:'http://x.test'}]});assert.equal(r.statusCode,400);assert.match(JSON.parse(r.body).error,/https/);
  const admin=await readFile('admin/admin.js','utf8');assert.match(admin,/events:\{title:'Event & agenda'/);assert.match(admin,/aboutVision/);delete process.env.CMS_SESSION_SECRET
});

test('v1.4: hero memakai foto asli dan tali ring interaktif; glove WebGL nonaktif secara default',async()=>{
  const h=await readFile('index.html','utf8'),app=await readFile('assets/js/app.js','utf8'),css=await readFile('assets/css/style.css','utf8'),js=await readFile('assets/js/content.js','utf8');
  assert.match(h,/class="hero-photo"/);assert.match(h,/class="ropes"/);assert.match(h,/data-scene="stage"/);assert.match(h,/href="contact\.html">Daftar sekarang/);assert.doesNotMatch(h,/glove-shape/);
  assert.match(app,/initHeroStage/);assert.match(app,/dataset\.scene !== 'glove'/);assert.match(css,/\.ropes path/);assert.match(js,/action-bar/);assert.match(js,/hero-facts/)
});

test('Netlify CMS actions use the function root query route instead of unsupported subpaths', async()=>{
  const [admin,platform,api]=await Promise.all(['admin/admin.js','admin/platform.js','netlify/functions/cms-api.mjs'].map(f=>readFile(f,'utf8')));
  for(const action of ['login','logout','upload','deploy-status']) assert.ok(admin.includes(`?action=${action}`),`CMS action ${action} should use query routing`);
  for(const action of ['platform-login','platform-logout']) assert.ok(platform.includes(`?action=${action}`),`platform action ${action} should use query routing`);
  for(const action of ['login','logout','upload','deploy-status','platform-login','platform-logout']) assert.ok(api.includes(`action==='${action}'`),`API should dispatch ${action}`);
});

test('platform configuration health endpoint exposes booleans only and no secret values', async()=>{
  const api=await readFile('netlify/functions/cms-api.mjs','utf8');
  assert.match(api,/health==='platform'/);
  assert.match(api,/platformPasswordConfigured:Boolean/);
  assert.match(api,/supabaseServerKeyConfigured:Boolean/);
  assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY\s*:\s*process\.env/);
});

test('visual accents are red and busy HUD/scanline overlays are removed',async()=>{
  const css=await readFile('assets/css/style.css','utf8'),js=await readFile('assets/js/kinetic.js','utf8');
  assert.match(css,/--cyan:#d9534f/);
  assert.doesNotMatch(css,/rgba\(0,240,255/);
  assert.doesNotMatch(css,/HUD viewfinder/);
  assert.doesNotMatch(css,/repeating-linear-gradient/);
  assert.match(css,/\.coach-portrait[^}]*background-image:none/);
  assert.match(css,/\.intro-copy::before[^}]*content:none!important/);
  assert.match(js,/cyan: 0xd9534f/);
});


test('CMS and platform login actions work on the function root query endpoint',async()=>{
  const old={CMS_SESSION_SECRET:process.env.CMS_SESSION_SECRET,CMS_ADMIN_PASSWORD:process.env.CMS_ADMIN_PASSWORD,PLATFORM_ADMIN_PASSWORD:process.env.PLATFORM_ADMIN_PASSWORD};
  process.env.CMS_SESSION_SECRET='a'.repeat(48);process.env.CMS_ADMIN_PASSWORD='test-password-123';process.env.PLATFORM_ADMIN_PASSWORD='platform-password-1234';
  try{
    const m=await import('../netlify/functions/cms-api.mjs?query-route-test');
    const cms=await m.handler({httpMethod:'POST',path:'/.netlify/functions/cms-api',queryStringParameters:{action:'login'},headers:{host:'site.netlify.app'},body:JSON.stringify({password:process.env.CMS_ADMIN_PASSWORD})});
    assert.equal(cms.statusCode,200);assert.match(cms.headers['set-cookie'],/pbogor_session=/);
    const platform=await m.handler({httpMethod:'POST',path:'/.netlify/functions/cms-api',queryStringParameters:{action:'platform-login'},headers:{host:'site.netlify.app'},body:JSON.stringify({password:process.env.PLATFORM_ADMIN_PASSWORD})});
    assert.equal(platform.statusCode,200);assert.match(platform.headers['set-cookie'],/pbogor_platform_session=/);
  }finally{for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});


test('desktop readability guard keeps sections visible and reduces distracting background effects', async () => {
  const css = await readFile(new URL('../assets/css/style.css', import.meta.url), 'utf8');
  const js = await readFile(new URL('../assets/js/kinetic.js', import.meta.url), 'utf8');
  assert.match(css, /@media \(min-width:1001px\)\{[\s\S]*?\.reveal\{opacity:1;transform:none\}/);
  assert.match(css, /#boxing-canvas-container\{[^}]*pointer-events:none/);
  assert.match(js, /smoothstep\(0\.35, 0\.95, f\) \* 0\.22/);
  assert.match(js, /color\.b = texture2D\(tDiffuse, uv\)\.b;/);
});

test('CMS panels explain separate credentials and offer safe environment diagnostics', async () => {
  const [cms, platform, cmsJs, platformJs] = await Promise.all([
    readFile(new URL('../admin/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../admin/platform.html', import.meta.url), 'utf8'),
    readFile(new URL('../admin/admin.js', import.meta.url), 'utf8'),
    readFile(new URL('../admin/platform.js', import.meta.url), 'utf8')
  ]);
  assert.match(cms, /checkConfig/);
  assert.match(platform, /PLATFORM_ADMIN_PASSWORD/);
  assert.match(platform, /checkConfig/);
  assert.match(cmsJs, /health=platform/);
  assert.match(platformJs, /health=platform/);
});
