/**
 * TRGVC Cloudflare Worker.
 * Serves the static website and exposes /api/youtube for public playlist data.
 * Configure YOUTUBE_API_KEY as a Cloudflare secret; never commit the key.
 * This endpoint does NOT add videos to YouTube playlists.
 */
const PLAYLISTS = Object.freeze({
  music: 'PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-',
  gaming: 'PLGLaDUSam8Cs',
  uploads: 'UUTJMtzodlcDEYt38qR_0cxQ',
});
const CACHE_SECONDS = 300;
const API_BASE = 'https://www.googleapis.com/youtube/v3/playlistItems';
const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data: https://i.ytimg.com https://i.scdn.co",
    "frame-src https://www.youtube-nocookie.com https://open.spotify.com",
    "font-src 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
});
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const clean = (x) => typeof x === 'string' ? x : '';
const responseJSON = (body, status=200, options={}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': options.cache ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });

async function listPlaylist(apiKey, id, pages=3) {
  let nextPageToken = '';
  const results = [];
  // Scan first 150 entries. Keep recent uploads near top of each public playlist.
  for (let page=0; page<pages; page++) {
    const u = new URL(API_BASE);
    u.searchParams.set('part', 'snippet,contentDetails,status');
    u.searchParams.set('playlistId', id);
    u.searchParams.set('maxResults', '50');
    u.searchParams.set('key', apiKey);
    if (nextPageToken) u.searchParams.set('pageToken', nextPageToken);
    const res=await fetch(u.toString(), {headers:{accept:'application/json'}});
    if (!res.ok) throw Error(`YouTube API returned ${res.status}`);
    const data=await res.json();
    for (const item of Array.isArray(data.items)?data.items:[]) {
      const snippet=item.snippet||{};
      const details=item.contentDetails||{};
      const id=clean(details.videoId || snippet.resourceId?.videoId);
      const title=clean(snippet.title);
      const description=clean(snippet.description);
      if (!VIDEO_ID.test(id) || !title || title==='Deleted video' || title==='Private video' || title.toLowerCase().includes('#shorts')) continue;
      const videoPublishedAt=clean(details.videoPublishedAt || snippet.publishedAt);
      const timestamp=Date.parse(videoPublishedAt);
      results.push({
        id,
        title:title.slice(0,240),
        _description:description.slice(0,500), // internal categorisation only; stripped from public response
        timestamp:Number.isFinite(timestamp)?timestamp:0,
        date:Number.isFinite(timestamp)?new Date(timestamp).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}):'Public video',
      });
    }
    nextPageToken = clean(data.nextPageToken);
    if (!nextPageToken) break;
  }
  const seen=new Set();
  return results.sort((a,b)=>b.timestamp-a.timestamp).filter(v=>{
    if(seen.has(v.id))return false;
    seen.add(v.id);return true;
  }).slice(0,12);
}

function isMusicUpload(video) {
  const title=video.title.toLowerCase().trim();
  const text=`${title} ${video._description||''}`.toLowerCase();
  if (/(gameplay|walkthrough|warzone|call of duty|modern warfare|mw4|dmz|gaming|multiplayer|campaign|stream|let.s play|forza|cyberpunk)/.test(text)) return false;
  return /(official audio|official music|lyric video|music video|visualizer|full album|spotify|new single|trgvc music)/.test(text) ||
    /^trgvc\s*[-–—]\s*/.test(title);
}
function publicVideos(videos){
  return videos.map(({_description,...publicVideo})=>publicVideo);
}
function mergeVideos(...sets){
  const seen=new Set();
  return sets.flat().filter(v=>{if(seen.has(v.id))return false;seen.add(v.id);return true;})
    .sort((a,b)=>b.timestamp-a.timestamp).slice(0,12);
}

async function handleYouTube(env, ctx, request) {
  if (!env.YOUTUBE_API_KEY) {
    return responseJSON({musicItems:[],gamingItems:[],error:'YouTube API key not configured'},503);
  }
  const cache=caches.default;
  const cacheRequest=new Request(new URL('/api/youtube',request.url).toString(),{method:'GET'});
  const hit=await cache.match(cacheRequest);
  if (hit) return hit;
  try {
    // Fetch official curated playlists plus recent channel uploads. This also updates
    // the SITE for new uploads even if the creator has not added them to a curated list.
    const answers=await Promise.allSettled([
      listPlaylist(env.YOUTUBE_API_KEY,PLAYLISTS.music),
      listPlaylist(env.YOUTUBE_API_KEY,PLAYLISTS.gaming),
      listPlaylist(env.YOUTUBE_API_KEY,PLAYLISTS.uploads,1),
    ]);
    const [music, gaming, uploads]=answers.map(x=>x.status==='fulfilled'?x.value:[]);
    if (!answers.some(x=>x.status==='fulfilled')) throw Error('All YouTube sources unavailable');
    const curatedMusicIds=new Set(music.map(v=>v.id));
    const curatedGamingIds=new Set(gaming.map(v=>v.id));
    const recentMusic=uploads.filter(v=>curatedMusicIds.has(v.id) || (!curatedGamingIds.has(v.id) && isMusicUpload(v)));
    const recentGaming=uploads.filter(v=>!curatedMusicIds.has(v.id) && (curatedGamingIds.has(v.id) || !isMusicUpload(v)));
    const musicItems=publicVideos(mergeVideos(music,recentMusic));
    const gamingItems=publicVideos(mergeVideos(gaming,recentGaming));
    const result=responseJSON({musicItems,gamingItems,updatedAt:new Date().toISOString(),source:'public-playlists-and-recent-uploads'},200,{cache:true});
    // Prevent key leakage: cache only public data, never upstream request URLs.
    ctx.waitUntil(cache.put(cacheRequest,result.clone()));
    return result;
  } catch (error) {
    console.error('Playlist sync failed',error instanceof Error?error.message:'Unknown error');
    return responseJSON({musicItems:[],gamingItems:[],error:'Playlist temporarily unavailable'},503);
  }
}

export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if (url.pathname==='/api/youtube') {
      if(request.method!=='GET')return responseJSON({error:'Method not allowed'},405);
      return handleYouTube(env,ctx,request);
    }
    if (url.pathname.startsWith('/api/')) return responseJSON({error:'Not found'},404);
    if (!['GET','HEAD'].includes(request.method)) return responseJSON({error:'Method not allowed'},405);
    if (!env.ASSETS?.fetch) return responseJSON({error:'Static assets binding missing'},500);
    const asset=await env.ASSETS.fetch(request);
    const headers=new Headers(asset.headers);
    for(const [k,v] of Object.entries(SECURITY_HEADERS))headers.set(k,v);
    if(url.pathname.endsWith('.html') || url.pathname==='/' || headers.get('content-type')?.includes('text/html'))
      headers.set('Cache-Control','public, max-age=0, must-revalidate');
    const emptyStatus=[204,205,304].includes(asset.status);
    return new Response(emptyStatus?null:asset.body,{status:asset.status,statusText:asset.statusText,headers});
  }
};
