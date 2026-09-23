import {env} from 'cloudflare:workers';
import * as community from './community';
import * as avatar from './avatar';
import * as youtube from './youtube';
import {handleAuth} from './auth';
import {fail} from '../lib/server';
export default {async fetch(r:Request):Promise<Response>{const url=new URL(r.url);let response:Response;try{if(url.pathname.startsWith('/api/')){const handlers:Record<string,any>={'/api/community':community,'/api/avatar':avatar,'/api/youtube':youtube};if(url.pathname.startsWith('/api/auth/'))response=await handleAuth(r,url.pathname.slice(10));else{const handler=handlers[url.pathname]?.[r.method];response=handler?await handler(r):Response.json({error:'Not found or method not allowed.'},{status:404})}}else if(url.pathname==='/community'){response=Response.redirect(url.origin+'/community/'+url.search,308)}else if(url.pathname.startsWith('/community/')&&!/\.[a-z0-9]+$/i.test(url.pathname)){response=await env.ASSETS.fetch(new Request(url.origin+'/community/',r))}else response=await env.ASSETS.fetch(r)}catch(e){response=fail(e)}const secured=new Response(response.body,response);secured.headers.set('X-Content-Type-Options','nosniff');secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');if(url.pathname.startsWith('/api/')){secured.headers.set('Cache-Control','no-store');secured.headers.set('Vary','Cookie')}return secured}};
