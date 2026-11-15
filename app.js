"use strict";
// TRGVC front end: no third-party request occurs until a visitor enables the relevant service.
const MUSIC_PLAYLIST_ID = "PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-";
const GAMING_PLAYLIST_ID = "PLGLaDUSam8Cs";
const PRIVACY_KEY = "trgvc-privacy-choices-v1";
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const ALBUM_ID_RE = /^[A-Za-z0-9]+$/;

    const ALBUM_DATA = {
      lights: {
        title: "When the Lights Don't Lie",
        meta: "September 2026 • 14 Songs",
        albumId: "2pYr1NYOShOIZ3zMRmfVVV",
        tracks: ["Midnight Pressure","Lights Don't Lie","Beautiful Confusion","You Don't Know Me","Wolves Around My Dreams","Tired","Fighting the Static","Forward","Protect Your Mission","I'm Flying","Heatwave Heart","No Sleep Tonight","We Own the Night","When the Day Is Done"]
      },
      signals: {
        title: "Signals in the Dark",
        meta: "May 2026 • 14 Songs",
        albumId: "4AC3K4l4IN7mg8Ttu57tCx",
        tracks: ["Steady Rise","Always Mine","Back Up","Chasing the Hours","Golden Hour","Keep Moving","Lift Off","Midnight","Move The Floor","On the Line","Paid My Debt","The Clouds Are Crying","Underground Connection","Unforgettable Vibe"]
      },
      pulse: {
        title: "Pulse of the Night",
        meta: "April 2026 • 10 Songs",
        albumId: "06l7DRPWtlW0LC3tgCxRsJ",
        tracks: ["Best Thing In My Life","Doing Just Fine","Headphones On, World Off","Right Track (Get It Right Back)","The holiday is coming","The Silence is Loud","Ultraviolet Rain","We dancin' everywhere","We’re vibing all day, we’re vibing all night!","Weekends are the best"]
      },
      velocity: {
        title: "Velocity Horizon",
        meta: "March 2026 • 15 Songs",
        albumId: "0dq1fWEkpHQAHCLto4FB2m",
        tracks: ["Aqua Motion","Burning Horizon","Diamonds in the Blue","Feel the sun","Footprints","Neon Empire","Pictures on the wall","Raining in the Sunshine","Redline Euphoria","Solar Rush","Summer Holiday","The Code","The Code - Extended Remix","Walking on Air","We Own the Night"]
      },
      sunrise: {
        title: "The Digital Sunrise",
        meta: "February 2026 • 17 Songs",
        albumId: "3wj0OkKqr1DJ9pjOwQBWT7",
        tracks: ["30 Going on 13","Balance","Dreams","Forever","Happines","I know what I said","Ibiza Hype","Ibiza Waiting for Us","Let's Party","Lonely","Love Is Driving Me Crazy","Never Lose Me","Now It's Cold and Rainy","Stay with Me","The Sun Is Coming Up","The time has come","We Need To Party"]
      }
    };

    const ALL_SONGS = [
      { title: "One More Round", albumTitle: "On Tonight (New Single)", key: "ontonight", ytId: "videoseries?list=PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-" },
      { title: "Turn It Up Louder", albumTitle: "On Tonight (Lead Single)", key: "ontonight", ytId: "_9-fsug6184" }
    ];
    Object.keys(ALBUM_DATA).forEach(k => {
      ALBUM_DATA[k].tracks.forEach(t => {
        ALL_SONGS.push({ title: t, albumTitle: ALBUM_DATA[k].title, albumId: ALBUM_DATA[k].albumId, key: k });
      });
    });



const privacyBox = document.getElementById("privacy-controls");
const privacyCheckboxes = {
  youtube: document.getElementById("opt-youtube"),
  spotify: document.getElementById("opt-spotify")
};
function loadChoices() {
  try {
    const value = JSON.parse(localStorage.getItem(PRIVACY_KEY) || "null");
    if (value && typeof value.youtube === "boolean" && typeof value.spotify === "boolean") return value;
  } catch (_) { /* Storage disabled: don't enable embeds */ }
  return null;
}
let preferences = loadChoices();
let consent = preferences || {youtube:false, spotify:false};
let latestSyncedMusic = [];
let latestSyncedGaming = [];
let currentTopMode = "music";
let currentVideo = null;
let currentSpotifyAlbum = "2pYr1NYOShOIZ3zMRmfVVV";
let modalKey = null;
let lastFocus = null;
let feedsPending = false;

function setPanel(open) {
  privacyBox.hidden = !open;
  if (open) {
    privacyCheckboxes.youtube.checked = consent.youtube;
    privacyCheckboxes.spotify.checked = consent.spotify;
  }
}
function hasConsent(service) { return Boolean(consent[service]); }
function applyChoices(next) {
  const old = {...consent};
  consent = {youtube:Boolean(next.youtube), spotify:Boolean(next.spotify)};
  preferences = {...consent};
  try { localStorage.setItem(PRIVACY_KEY, JSON.stringify(consent)); } catch (_) { /* Choice is valid for this page only */ }
  setPanel(false);
  if (consent.youtube) {
    if (!old.youtube) syncFeeds();
    else showPlayer(currentTopMode, false);
  } else {
    latestSyncedMusic = [];
    latestSyncedGaming = [];
    showPlayer(currentTopMode, false);
    showVideoPlaceholders();
  }
  updateSpotifyContent();
  // Cover artwork is always served locally; only Spotify players depend on consent.
}

function createButton(text, action, value, cssClass='btn-neon') {
  const b = document.createElement('button');
  b.type='button';b.className=cssClass;b.textContent=text;
  b.dataset[action]=value;
  return b;
}
function emptyHint(service, text) {
  const block=document.createElement('div');block.className='privacy-placeholder';
  const p=document.createElement('p');p.textContent=text;
  block.append(p,createButton(`Enable ${service==='youtube'?'YouTube':'Spotify'}`, 'consentService',service,`btn-neon ${service==='youtube'?'cyan':'spotify'}`));
  return block;
}
function currentList(mode) { return mode==='gaming' ? latestSyncedGaming:latestSyncedMusic; }
function playlistId(mode) { return mode==='gaming' ? GAMING_PLAYLIST_ID:MUSIC_PLAYLIST_ID; }
function ytUrl(mode, videoId, autoplay) {
  const id=playlistId(mode);
  const params=new URLSearchParams({list:id, rel:'0', autoplay: autoplay?'1':'0', playsinline:'1', modestbranding:'1', enablejsapi:'1'});
  if (typeof location !== 'undefined' && location.origin) params.set('origin', location.origin);
  if (videoId && YT_ID_RE.test(videoId)) return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
}
function showPlayer(mode, autoplay=false) {
  currentTopMode=mode;
  const mount=document.getElementById('main-yt-player');
  document.getElementById('btn-mode-music').classList.toggle('active',mode==='music');
  document.getElementById('btn-mode-gaming').classList.toggle('active',mode==='gaming');
  document.getElementById('btn-mode-music').setAttribute('aria-pressed',String(mode==='music'));
  document.getElementById('btn-mode-gaming').setAttribute('aria-pressed',String(mode==='gaming'));
  const first=currentVideo && currentVideo.mode===mode ? currentVideo:currentList(mode)[0];
  document.getElementById('now-playing-title').textContent = first
    ? `${mode==='gaming'?'TRGVC Gaming':'TRGVC Music'} — ${first.title}`
    : `${mode==='gaming'?'TRGVC Gaming':'TRGVC Music'} — official playlist`;
  document.getElementById('now-playing-badge').textContent = hasConsent('youtube')?'Playlist sync enabled':'Privacy protected';
  const fallback=document.getElementById('video-fallback-link');
  if (fallback) fallback.href = first && YT_ID_RE.test(first.id) ? `https://www.youtube.com/watch?v=${first.id}` : `https://www.youtube.com/playlist?list=${playlistId(mode)}`;
  mount.replaceChildren();
  if (!hasConsent('youtube')) {
    mount.append(emptyHint('youtube','YouTube content is disabled until you choose to enable it. You can also open the playlist directly on YouTube.'));
    return;
  }
  if (!first || !YT_ID_RE.test(first.id)) {
    const msg=document.createElement('div');msg.className='privacy-placeholder';
    const strong=document.createElement('strong');strong.textContent='Open the official YouTube playlist';
    const note=document.createElement('p');note.textContent='A featured video is not available yet. The playlist remains accessible directly on YouTube.';
    const link=document.createElement('a');link.className='btn btn-outline';link.textContent='Watch on YouTube ↗';
    link.href=`https://www.youtube.com/playlist?list=${playlistId(mode)}`;link.target='_blank';link.rel='noopener noreferrer';
    msg.append(strong,note,link);mount.append(msg);return;
  }
  const iframe=document.createElement('iframe');
  iframe.title=`TRGVC ${mode==='gaming'?'Gaming':'Music'} YouTube playlist`;
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.loading='lazy';
  iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen=true;
  iframe.src=ytUrl(mode,first && first.id,autoplay);
  mount.append(iframe);
}
function switchTopPlayer(mode) {
  currentVideo=null;
  showPlayer(mode,true);
}
function playVideoInDashboard(videoId,title,isMusic) {
  const mode=isMusic?'music':'gaming';
  if (videoId !== 'videoseries' && !YT_ID_RE.test(videoId)) return;
  currentVideo=videoId==='videoseries'?null:{id:videoId,title:String(title||'Video'),mode};
  if (!hasConsent('youtube')) { setPanel(true); return; }
  showPlayer(mode,true);
  document.getElementById('master-theater').scrollIntoView({behavior:'smooth',block:'center'});
}
function showVideoPlaceholders() {
  for (const [id,mode] of [['music-video-grid','music'],['gaming-video-grid','gaming']]) {
    const container=document.getElementById(id);container.replaceChildren();
    const box=document.createElement('div');box.className='yt-grid-empty';
    const heading=document.createElement('strong');heading.textContent=`TRGVC ${mode==='music'?'Music':'Gaming'} videos`;
    const p=document.createElement('p');p.textContent='See the official playlist or enable YouTube to load the latest videos here automatically.';
    const a=document.createElement('a');a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open the YouTube playlist';a.href=`https://www.youtube.com/playlist?list=${playlistId(mode)}`;
    box.append(heading,p,a,document.createTextNode('  '),createButton('Enable YouTube','consentService','youtube','btn-neon cyan'));
    container.append(box);
  }
}
function renderGrid(containerId,list,isMusic) {
  const container=document.getElementById(containerId);container.replaceChildren();
  if (!list.length) {
    const b=document.createElement('div');b.className='yt-grid-empty';
    const heading=document.createElement('strong');heading.textContent='Playlist preview not available';
    const p=document.createElement('p');p.textContent='The official playlist can still be opened. To display new-video cards automatically, configure a YouTube Data API key and ensure the playlist is public and valid.';
    const a=document.createElement('a');a.href=`https://www.youtube.com/playlist?list=${isMusic?MUSIC_PLAYLIST_ID:GAMING_PLAYLIST_ID}`;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open official YouTube playlist';
    b.append(heading,p,a);container.append(b);return;
  }
  list.slice(0,8).forEach((item,index)=>{
    if (!YT_ID_RE.test(item.id)) return;
    const b=document.createElement('button');b.type='button';b.className=`yt-card ${isMusic?'music-yt':''}`;
    const thumb=document.createElement('div');thumb.className='yt-thumb';
    const ranking=document.createElement('span');ranking.className='yt-rank';ranking.textContent=index===0?'Newest':`#${index+1}`;
    const img=document.createElement('img');img.src=`https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
    thumb.append(ranking,img);
    const body=document.createElement('div');body.className='yt-body';
    const title=document.createElement('div');title.className='yt-title';title.textContent=item.title;
    const date=document.createElement('div');date.className='yt-date';date.textContent=item.date||'YouTube upload';
    body.append(title,date);b.append(thumb,body);
    b.addEventListener('click',()=>playVideoInDashboard(item.id,item.title,isMusic));
    container.append(b);
  });
}
async function syncFeeds() {
  if (!hasConsent('youtube')||feedsPending) return;
  feedsPending=true;
  try {
    const result=await fetch('/api/youtube',{headers:{accept:'application/json'}});
    if (!result.ok) throw Error('API unavailable');
    const data=await result.json();
    const clean=arr=>(Array.isArray(arr)?arr:[]).filter(x=>x && YT_ID_RE.test(x.id) && typeof x.title==='string').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
    latestSyncedMusic=clean(data.musicItems);
    latestSyncedGaming=clean(data.gamingItems);
  } catch (_) {
    // Never claim cached/fabricated content is the latest.
    latestSyncedMusic=[];latestSyncedGaming=[];
  } finally {
    renderGrid('music-video-grid',latestSyncedMusic,true);
    renderGrid('gaming-video-grid',latestSyncedGaming,false);
    showPlayer(currentTopMode,false);
    feedsPending=false;
  }
}
function updateSpotifyContent() {
  const box=document.getElementById('spotify-player-box');
  box.replaceChildren();
  if (!hasConsent('spotify')) {
    box.append(emptyHint('spotify','Your browser will not contact Spotify until you enable the player.'));
  } else {
    const id=currentSpotifyAlbum;
    const url=id && ALBUM_ID_RE.test(id)
      ? `https://open.spotify.com/embed/album/${id}?theme=0`
      : 'https://open.spotify.com/embed/artist/4r17VtPq9uwHDU81ER0E9o?theme=0';
    box.append(makeSpotifyFrame(url,'TRGVC featured album Spotify player',352));
  }
  updateModalPlayer();
}
function makeSpotifyFrame(src,title,height) {
  const iframe=document.createElement('iframe');iframe.title=title;iframe.src=src;
  iframe.loading='lazy';iframe.width='100%';iframe.height=String(height);
  iframe.style.border='0';iframe.style.borderRadius='12px';
  iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  return iframe;
}
function loadSpotifyAlbum(albumId) {
  if (!ALBUM_ID_RE.test(albumId)) return;
  currentSpotifyAlbum=albumId;
  if (!hasConsent('spotify')) { setPanel(true); return; }
  updateSpotifyContent();
  document.getElementById('spotify-player-box').scrollIntoView({behavior:'smooth',block:'center'});
}
function updateModalPlayer() {
  const mount=document.getElementById('modal-spotify-iframe');
  mount.replaceChildren();
  if (!modalKey || !ALBUM_DATA[modalKey]) return;
  if (!hasConsent('spotify')) {
    mount.append(emptyHint('spotify','Enable Spotify to load this album player.'));
  } else {
    mount.append(makeSpotifyFrame(`https://open.spotify.com/embed/album/${ALBUM_DATA[modalKey].albumId}?theme=0`,`${ALBUM_DATA[modalKey].title} Spotify player`,152));
  }
}
function openTracklistModal(key) {
  const album=ALBUM_DATA[key];if(!album)return;
  modalKey=key;
  lastFocus=document.activeElement;
  document.getElementById('modal-title').textContent=album.title;
  document.getElementById('modal-meta').textContent=album.meta;
  const tracks=document.getElementById('modal-track-list');tracks.replaceChildren();
  album.tracks.forEach((track,i)=>{
    const b=document.createElement('button');b.type='button';b.className='track-item';b.style.width='100%';
    const a=document.createElement('span');
    const num=document.createElement('strong');num.textContent=`#${String(i+1).padStart(2,'0')} `;
    a.append(num,document.createTextNode(track));
    const stream=document.createElement('span');stream.textContent='▶ Stream';stream.style.color='#1db954';
    b.append(a,stream);b.addEventListener('click',()=>loadSpotifyAlbum(album.albumId));tracks.append(b);
  });
  updateModalPlayer();
  const modal=document.getElementById('tracklist-modal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  modal.querySelector('[data-close-modal]').focus();
}
function closeTracklistModal() {
  const modal=document.getElementById('tracklist-modal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
  modalKey=null;const embed=document.getElementById('modal-spotify-iframe');embed.replaceChildren();
  if (lastFocus && typeof lastFocus.focus==='function') lastFocus.focus();
}
function handleSongSearch(q) {
  const panel=document.getElementById('search-results-panel');panel.replaceChildren();
  const query=String(q||'').trim().toLocaleLowerCase();
  if(!query){panel.classList.remove('active');return;}
  const hits=ALL_SONGS.filter(s=>s.title.toLocaleLowerCase().includes(query)||s.albumTitle.toLocaleLowerCase().includes(query));
  if(!hits.length){const p=document.createElement('p');p.textContent='No matching songs found.';panel.append(p);}
  for (const song of hits) {
    const row=document.createElement('div');row.className='sr-row';
    const name=document.createElement('div');
    const strong=document.createElement('strong');strong.textContent=song.title;
    const album=document.createElement('span');album.style.color='#b4bbc8';album.textContent=` • ${song.albumTitle}`;
    name.append(strong,album);
    const btn=createButton(song.ytId?'▶ Open video':'☰ Open album',song.ytId?'playSong':'tracklist',song.ytId?String(song.ytId):song.key,'album-btn');
    btn.addEventListener('click',()=>{
      if(song.ytId)playVideoInDashboard(YT_ID_RE.test(song.ytId)?song.ytId:'videoseries',song.title,true);
      else openTracklistModal(song.key);
    });
    row.append(name,btn);panel.append(row);
  }
  panel.classList.add('active');
}
function setQuickSearch(term) {
  const input=document.getElementById('live-song-input');input.value=term;handleSongSearch(term);input.focus();
}
function filterSite(zone,shouldScroll=true) {
  for(const value of ['all','music','gaming']) {
    const tab=document.getElementById(`tab-${value}`);tab.classList.toggle('active',zone===value);
    tab.setAttribute('aria-pressed',String(zone===value));
  }
  const music=document.getElementById('music-hub'),gaming=document.getElementById('gaming-hub');
  music.classList.toggle('hidden-section',zone==='gaming');
  gaming.classList.toggle('hidden-section',zone==='music');
  if(zone==='music'||zone==='gaming') {
    currentVideo=null;showPlayer(zone,false);
    if (shouldScroll) document.getElementById(zone+'-hub').scrollIntoView({behavior:'smooth'});
  }
}

// Delegated handlers for static HTML controls (no unsafe inline onclick).
document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-open-privacy], [data-consent-service], [data-filter], [data-mode], [data-tracklist], [data-spotify-album], [data-search], [data-video-id], [data-close-modal]');
  if (!btn) return;
  if(btn.hasAttribute('data-open-privacy')) return setPanel(true);
  if(btn.dataset.consentService) {
    setPanel(true);
    if(btn.dataset.consentService==='youtube')privacyCheckboxes.youtube.checked=true;
    if(btn.dataset.consentService==='spotify')privacyCheckboxes.spotify.checked=true;
    return;
  }
  if(btn.dataset.filter){if(btn.classList.contains('brand-logo'))event.preventDefault();filterSite(btn.dataset.filter);return;}
  if(btn.dataset.mode){switchTopPlayer(btn.dataset.mode);if(btn.dataset.scrollPlayer)document.getElementById('master-theater').scrollIntoView({behavior:'smooth'});return;}
  if(btn.dataset.tracklist)return openTracklistModal(btn.dataset.tracklist);
  if(btn.dataset.spotifyAlbum)return loadSpotifyAlbum(btn.dataset.spotifyAlbum);
  if(btn.dataset.search)return setQuickSearch(btn.dataset.search);
  if(btn.dataset.videoId)return playVideoInDashboard(btn.dataset.videoId,btn.dataset.videoTitle,btn.dataset.videoMusic==='true');
  if(btn.dataset.closeModal)return closeTracklistModal();
});
privacyBox.addEventListener('click',e=>e.stopPropagation());
document.getElementById('privacy-save').addEventListener('click',()=>applyChoices({youtube:privacyCheckboxes.youtube.checked,spotify:privacyCheckboxes.spotify.checked}));
document.getElementById('privacy-reject').addEventListener('click',()=>applyChoices({youtube:false,spotify:false}));
document.getElementById('privacy-accept').addEventListener('click',()=>applyChoices({youtube:true,spotify:true}));
document.getElementById('live-song-input').addEventListener('input',e=>handleSongSearch(e.target.value));
document.getElementById('tracklist-modal').addEventListener('click',e=>{if(e.target.id==='tracklist-modal')closeTracklistModal();});
window.addEventListener('keydown',e=>{
  const modal=document.getElementById('tracklist-modal');
  if(e.key==='Escape'&&modal.classList.contains('open')){e.preventDefault();closeTracklistModal();return;}
  if(modal.classList.contains('open')&&e.key==='Tab'){
    const items=[...modal.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);
    if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }
  if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!modal.classList.contains('open')){
    e.preventDefault();document.getElementById('live-song-input').focus();
  }
});

// Initial values and only first-party resources until permission is granted.
// Album artwork is served from first-party files in all consent states.
filterSite('all',false);
showVideoPlaceholders();
showPlayer(currentTopMode,false);
updateSpotifyContent();
setPanel(!preferences || location.hash === "#privacy-controls");
window.addEventListener("hashchange",()=>{if(location.hash==="#privacy-controls")setPanel(true);});
if (hasConsent('youtube'))syncFeeds();
window.setInterval(()=>{if(hasConsent('youtube')&&document.visibilityState==='visible')syncFeeds();},300000);
