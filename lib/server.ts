import {env} from 'cloudflare:workers';
import {getUser} from '../worker/auth';
import {isStaff,isOwner} from './validation';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export function db(){if(!env.DB)throw new HttpError(503,'Community storage is not connected yet.');return env.DB}
export async function identity(r:Request){const u=await getUser(r);if(!u)throw new HttpError(401,'Sign in to continue.');return u}
export const owner=(id:string)=>isOwner(id,env.OWNER_USER_IDS||'');
export const staff=(id:string)=>isStaff(id,env.OWNER_USER_IDS||'',env.MODERATOR_USER_IDS||'');
export function origin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new HttpError(403,'Please use this site to make changes.')}
export async function body(r:Request){if(Number(r.headers.get('content-length')||0)>20000)throw new HttpError(413,'Request too large.');const s=await r.text();if(s.length>20000)throw new HttpError(413,'Request too large.');try{return JSON.parse(s)}catch{throw new HttpError(400,'Invalid request.')}}
export function fail(e:unknown){if(e instanceof HttpError)return Response.json({error:e.message},{status:e.status});if((e as any)?.name==='ZodError')return Response.json({error:(e as any).issues.map((x:any)=>x.path.join('.')+': '+x.message).join('; ')},{status:400});if(String(e).includes('UNIQUE constraint failed'))return Response.json({error:'That username is already taken.'},{status:409});console.error('Community operation failed',e);return Response.json({error:'Could not complete this request. Your changes have not been confirmed. Please retry.'},{status:503})}
export async function rateLimit(id:string){const r=await db().prepare('SELECT count(*) AS n FROM entries WHERE owner=? AND created_at>?').bind(id,Date.now()-60000).first<{n:number}>();if((r?.n||0)>=30)throw new HttpError(429,'Please wait a minute before posting again.')}
