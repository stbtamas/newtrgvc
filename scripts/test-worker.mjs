import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=process.cwd(),sql=new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
for(const file of fs.readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('migrations/'+file,'utf8'));
class Statement{constructor(query,values=[]){this.query=query;this.values=values}bind(...values){return new Statement(this.query,values)}async first(){return sql.prepare(this.query).get(...this.values)||null}async all(){return {results:sql.prepare(this.query).all(...this.values)}}async run(){return sql.prepare(this.query).run(...this.values)}}
const objects=new Map(),env={SUPABASE_URL:'https://auth.example.test',SUPABASE_PUBLISHABLE_KEY:'test',DB:{prepare:q=>new Statement(q),batch:async stmts=>{sql.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}},OWNER_USER_IDS:'alice',MODERATOR_USER_IDS:'mod',BUCKET:{put:async(k,v,m)=>objects.set(k,{bytes:v,meta:m}),delete:async k=>objects.delete(k),get:async k=>{const o=objects.get(k);return o?{body:o.bytes,httpMetadata:o.meta.httpMetadata}:null}}};
let currentUser=null;const modules=new Map();
function load(file){if(modules.has(file))return modules.get(file).exports;const source=fs.readFileSync(file,'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const module={exports:{}};modules.set(file,module);const resolver=id=>{if(id==='cloudflare:workers')return {env};if(id==='next/headers')return {headers:async()=>new Headers(currentUser?{'oai-authenticated-user-id':currentUser,'oai-authenticated-user-email':currentUser+'@example.test'}:{})};if(id==='next/navigation')return {redirect:()=>{throw Error('redirect')}};if(id.startsWith('@/'))return load(path.join(root,id.slice(2)+'.ts'));if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));return require(id)};vm.runInNewContext(code,{exports:module.exports,module,require:resolver,console,Response,Request,Headers,URL,File,crypto,Uint8Array,Date,JSON,AbortSignal,TextEncoder,fetch:async(url,options)=>{if(url.endsWith('/user'))return Response.json(options?.headers?.Authorization==='Bearer expired'?{}:{id:options.headers.Authorization.slice(7)},{status:options?.headers?.Authorization==='Bearer expired'?401:200});if(url.endsWith('/otp'))return Response.json({});if(url.endsWith('/verify'))return JSON.parse(options.body).token==='123456'?Response.json({access_token:'alice',expires_in:3600}):Response.json({}, {status:400});throw Error('Unexpected upstream URL '+url)}},{filename:file});return module.exports}
const api=load(path.join(root,'worker/community.ts')),avatars=load(path.join(root,'worker/avatar.ts'));
const origin='https://beta.example.test';
async function call(user,method,payload,status=200,customOrigin=origin){currentUser=user;const req=new Request(origin+'/api/community',{method,headers:{origin:customOrigin,'Content-Type':'application/json',...(user?{cookie:'__Host-trgvc-session='+user}:{})},...(method==='GET'?{}:{body:JSON.stringify(payload)})});const response=await api[method](req),body=await response.json();assert.equal(response.status,status,JSON.stringify(body));return body}
const profile=name=>({action:'profile',profile:{name,username:name,preferences:{mix:'Both'},acceptGuidelines:true}});
const entry=(kind,target,data)=>({action:'create',entry:{kind,target,data}});
await call(null,'GET',null,401);
await call('alice','POST',profile('alice'),403,'https://evil.example');
await call('alice','POST',profile('alice'));
await call('bob','POST',profile('bob'));
await call('bob','POST',entry('post','',{body:'not allowed'}),403);
await call('bob','POST',profile('alice'),409);
assert.equal((await call('alice','GET')).profile.username,'alice');
const post=await call('alice','POST',entry('post','',{title:'Test announcement',body:'Hello crew'}));
const comment=await call('bob','POST',entry('comment',post.id,{body:'Good game'}));
await call('bob','POST',entry('saved','lights',{title:'Album',url:origin+'/releases/lights'}));
let bob=await call('bob','GET');const saved=bob.entries.find(e=>e.kind==='saved');assert(saved);
assert(!(await call('alice','GET')).entries.some(e=>e.id===saved.id));
await call('alice','DELETE',{id:saved.id},403);
await call('bob','DELETE',{id:post.id},403);
const event=await call('alice','POST',entry('event','',{title:'Crew Night',choices:['Warzone','Forza']}));
await call('bob','POST',entry('vote',event.id,{title:'Invalid'}),400);
await call('bob','POST',entry('vote',event.id,{title:'Warzone'}));
await call('bob','POST',entry('rsvp',event.id,{title:'Crew Night'}));
const report=await call('bob','POST',entry('report',post.id,{body:'Review this post'}));
await call('bob','POST',{action:'moderate',id:report.id,resolution:'remove'},403);
await call('alice','POST',{action:'moderate',id:report.id,resolution:'remove'});
assert(!(await call('bob','GET')).entries.some(e=>e.id===post.id||e.id===comment.id));
await call('alice','POST',entry('block','bob',{}));
assert(!(await call('alice','GET')).members.some(m=>m.id==='bob'));
await call('alice','POST',{...entry('post','',{title:'Future',body:'Later'}),entry:{...entry('post','',{title:'Future',body:'Later'}).entry,publishAt:Date.now()+3600000}});
assert(!(await call('bob','GET')).entries.some(e=>e.data.title==='Future'));
currentUser='bob';const f=new FormData();f.set('file',new File([new Uint8Array([137,80,78,71,13,10,26,10])],'avatar.png',{type:'image/png'}));const upload=await avatars.POST(new Request(origin+'/api/avatar',{method:'POST',headers:{origin,cookie:'__Host-trgvc-session=bob'},body:f}));assert.equal(upload.status,200);assert.equal(objects.size,1);
await call('bob','DELETE',{action:'account',confirm:'wrong'},400);
await call('bob','DELETE',{action:'account',confirm:'DELETE'});
assert.equal(objects.size,0);assert.equal(sql.prepare('SELECT count(*) n FROM entries WHERE owner=?').get('bob').n,0);assert.equal(sql.prepare('SELECT count(*) n FROM profiles WHERE id=?').get('bob').n,0);
console.log('PASS: unauthenticated access, CSRF, profile persistence/uniqueness, creator authorization, private favourites, ownership, vote validation, moderation visibility, blocking, scheduled visibility, avatar storage, deletion confirmation and cleanup.');

const auth=load(path.join(root,'worker/auth.ts'));
async function ac(action,payload,expected=200,customOrigin=origin){const r=await auth.handleAuth(new Request(origin+'/api/auth/'+action,{method:'POST',headers:{origin:customOrigin,'Content-Type':'application/json'},body:JSON.stringify(payload)}),action).catch(e=>load(path.join(root,'lib/server.ts')).fail(e));assert.equal(r.status,expected);return r}
await ac('start',{email:'test@example.test'});await ac('verify',{email:'test@example.test',code:'999999'},400);const session=await ac('verify',{email:'test@example.test',code:'123456'});assert(session.headers.get('set-cookie').includes('HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600'));await ac('verify',{email:'test@example.test',code:'123456'},403,'https://evil.test');assert.equal(await auth.getUser(new Request(origin,{headers:{cookie:'__Host-trgvc-session=expired'}})),null);const logout=await ac('logout',{});assert(logout.headers.get('set-cookie').includes('Max-Age=0'));for(let i=0;i<5;i++)await ac('start',{email:'test@example.test'});await ac('start',{email:'test@example.test'},429);console.log('PASS: OTP verification, cookie flags, invalid sessions, login CSRF, logout and sign-in rate limiting.');
const worker=load(path.join(root,'worker/index.ts')).default;
env.ASSETS={fetch:async r=>new Response(new URL(r.url).pathname)};
for(const [input,wanted]of [['/','/'],['/community/','/community/index.html'],['/community/login','/community/index.html'],['/community/releases/lights','/community/index.html'],['/community/sw.js','/community/sw.js']]){const r=await worker.fetch(new Request(origin+input));assert.equal(await r.text(),wanted);assert.equal(r.headers.get('x-content-type-options'),'nosniff')}
const anonymous=await worker.fetch(new Request(origin+'/api/auth/session'));assert.equal(anonymous.headers.get('cache-control'),'no-store');assert.equal((await anonymous.json()).userId,null);const denied=await worker.fetch(new Request(origin+'/api/community'));assert.equal(denied.status,401);console.log('PASS: website/community routing and private API cache headers.');
