async function handleYouTubeApi() {
  const CHANNEL_ID = "UCTJMtzodlcDEYt38qR_0cxQ";
  const UPLOADS_PLAYLIST_ID = "UUTJMtzodlcDEYt38qR_0cxQ";
  const LONGFORM_PLAYLIST_ID = "UULFTJMtzodlcDEYt38qR_0cxQ";
  const LIVESTREAMS_PLAYLIST_ID = "UULVTJMtzodlcDEYt38qR_0cxQ";
  const MUSIC_PLAYLIST_ID = "PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-";
  const GAMING_PLAYLIST_ID = "PLGLaDUSam8Cs";

  const YT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Cookie": "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnPpwY; CONSENT=YES+cb.20230531-07-p0.en+FX+908; PREF=hl=en&gl=GB"
  };

  const KNOWN_SONGS = [
    "one more round","turn it up louder","on tonight","when the lights don't lie","signals in the dark","pulse of the night","velocity horizon","the digital sunrise",
    "midnight pressure","lights don't lie","beautiful confusion","you don't know me","wolves around my dreams","fighting the static","protect your mission","i'm flying","heatwave heart","no sleep tonight","we own the night","when the day is done",
    "steady rise","always mine","chasing the hours","golden hour","keep moving","lift off","move the floor","on the line","paid my debt","the clouds are crying","underground connection","unforgettable vibe",
    "best thing in my life","doing just fine","headphones on, world off","right track","the holiday is coming","the silence is loud","ultraviolet rain","we dancin' everywhere","vibing all day","weekends are the best",
    "aqua motion","burning horizon","diamonds in the blue","feel the sun","neon empire","pictures on the wall","raining in the sunshine","redline euphoria","solar rush","summer holiday","the code","walking on air",
    "30 going on 13","ibiza hype","ibiza waiting for us","let's party","love is driving me crazy","never lose me","now it's cold and rainy","stay with me","the sun is coming up","the time has come","we need to party"
  ];

  function decodeXml(str) {
    return (str || "")
      .replace(/\\u0026/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  function isShort(title, desc) {
    const t = `${title || ""} ${desc || ""}`.toLowerCase();
    return (
      t.includes("#shorts") ||
      t.includes("#short") ||
      t.includes("#warzoneshorts") ||
      t.includes("official short") ||
      t.includes("how to open bunker")
    );
  }

  function isExplicitGaming(title, desc) {
    const t = `${title || ""} ${desc || ""}`.toLowerCase();
    return (
      t.includes("gameplay") ||
      t.includes("walkthrough") ||
      t.includes("playthrough") ||
      t.includes("campaign") ||
      t.includes("warzone") ||
      t.includes("call of duty") ||
      t.includes("modern warfare") ||
      t.includes("mw4") ||
      t.includes("dmz") ||
      t.includes("sniper") ||
      t.includes("throwing knife") ||
      t.includes("montage") ||
      t.includes("rebirth island") ||
      t.includes("wreckfest") ||
      t.includes("rise of the merchants") ||
      t.includes("forza") ||
      t.includes("cyberpunk") ||
      t.includes("kingdom come") ||
      t.includes("silent hill") ||
      t.includes("gears of war") ||
      t.includes("operation iron citadel") ||
      t.includes("early access") ||
      t.includes("1440p") ||
      t.includes("60fps") ||
      t.includes("high-end pc") ||
      t.includes("episode ")
    );
  }

  function isMusic(title, desc) {
    const lowerTitle = (title || "").toLowerCase().trim();
    const t = `${lowerTitle} ${(desc || "").toLowerCase()}`;
    if (isExplicitGaming(title, desc)) return false;
    if (
      t.includes("official audio") ||
      t.includes("official music") ||
      t.includes("official video") ||
      t.includes("official lyric") ||
      t.includes("lyric video") ||
      t.includes("music video") ||
      t.includes("visualizer") ||
      t.includes("full album") ||
      t.includes("new single") ||
      t.includes("distrokid") ||
      t.includes("spotify") ||
      t.includes("apple music") ||
      t.includes("trgvc music") ||
      lowerTitle.startsWith("trgvc -") ||
      lowerTitle.startsWith("trgvc –") ||
      lowerTitle.startsWith("trgvc —") ||
      lowerTitle.endsWith("- trgvc") ||
      lowerTitle.endsWith("– trgvc")
    ) {
      return true;
    }
    for (const song of KNOWN_SONGS) {
      if (lowerTitle.includes(song)) return true;
    }
    return false;
  }

  function parseRelativeDate(text, idx) {
    const now = Date.now();
    if (!text) return now - idx * 60000;
    const lower = text.toLowerCase();
    const m = lower.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/);
    if (!m) return now - idx * 60000;
    const val = parseInt(m[1], 10);
    const unit = m[2];
    const mult = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
      year: 31536000000
    }[unit] || 86400000;
    return now - val * mult - idx * 1000;
  }

  function parseFeed(xml) {
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries
      .map((match, idx) => {
        const c = match[1];
        const id = (c.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1] || "";
        const title = decodeXml((c.match(/<title>(.*?)<\/title>/) || [])[1] || "");
        const pub = (c.match(/<published>(.*?)<\/published>/) || [])[1] || "";
        const desc = decodeXml((c.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "");
        const timestamp = pub ? new Date(pub).getTime() : Date.now() - idx * 1000;
        const date = pub
          ? new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "Latest Upload";
        return { id, title, date, timestamp, description: desc };
      })
      .filter(item => item.id && !isShort(item.title, item.description));
  }

  async function fetchFeed(url) {
    if (!url) return [];
    try {
      const res = await fetch(url, { headers: YT_HEADERS, cf: { cacheTtl: 60 } });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseFeed(xml);
    } catch (_) {
      return [];
    }
  }

  async function scrapeChannelTab(url) {
    try {
      const res = await fetch(url, { headers: YT_HEADERS, cf: { cacheTtl: 60 } });
      if (!res.ok) return [];
      const html = await res.text();
      const parts = html.split('"videoRenderer":{"videoId":"');
      const list = [];
      for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i].slice(0, 5000);
        const idMatch = chunk.match(/^([a-zA-Z0-9_-]{11})"/);
        if (!idMatch) continue;
        if (chunk.includes('"/shorts/')) continue;
        const id = idMatch[1];
        const titleMatch =
          chunk.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/) ||
          chunk.match(/"title":\{"simpleText":"((?:\\.|[^"\\])*)"/);
        if (!titleMatch) continue;
        const title = decodeXml(titleMatch[1]);
        const dateMatch = chunk.match(/"publishedTimeText":\{"simpleText":"([^"]+)"\}/);
        const dateStr = dateMatch ? dateMatch[1] : "Latest Upload";
        const descMatch = chunk.match(/"descriptionSnippet":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/);
        const desc = descMatch ? decodeXml(descMatch[1]) : "";
        if (!isShort(title, desc)) {
          list.push({
            id,
            title,
            date: dateStr,
            timestamp: parseRelativeDate(dateStr, i),
            description: desc
          });
        }
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  async function scrapePlaylistPage(playlistId) {
    if (!playlistId) return [];
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
        headers: YT_HEADERS,
        cf: { cacheTtl: 60 }
      });
      if (!res.ok) return [];
      const html = await res.text();
      const parts = html.split('"playlistVideoRenderer":{"videoId":"');
      const list = [];
      const baseOldTs = Date.now() - 180 * 86400000;
      for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i].slice(0, 4000);
        const idMatch = chunk.match(/^([a-zA-Z0-9_-]{11})"/);
        if (!idMatch) continue;
        if (chunk.includes('"/shorts/')) continue;
        const id = idMatch[1];
        const titleMatch =
          chunk.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/) ||
          chunk.match(/"title":\{"simpleText":"((?:\\.|[^"\\])*)"/);
        if (!titleMatch) continue;
        const title = decodeXml(titleMatch[1]);
        if (!isShort(title, "")) {
          list.push({
            id,
            title,
            date: "Official Playlist",
            timestamp: baseOldTs - i * 60000,
            description: ""
          });
        }
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  function deduplicateAndSort(arr, excludeIds = new Set()) {
    const map = new Map();
    for (const v of arr) {
      if (!v || !v.id || excludeIds.has(v.id)) continue;
      if (isShort(v.title, v.description)) continue;
      if (!map.has(v.id)) {
        map.set(v.id, { ...v });
      } else {
        const existing = map.get(v.id);
        if ((v.timestamp || 0) > (existing.timestamp || 0)) {
          existing.timestamp = v.timestamp;
          if (v.date && v.date !== "Official Playlist") existing.date = v.date;
        }
        if (!existing.description && v.description) existing.description = v.description;
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  try {
    const [
      longFormXml,
      liveStreamsXml,
      uploadsXml,
      channelXml,
      musicXml,
      gamingXml,
      scrapedVideos,
      scrapedStreams,
      scrapedMusic,
      scrapedGaming
    ] = await Promise.all([
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${LONGFORM_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${LIVESTREAMS_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${UPLOADS_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${MUSIC_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${GAMING_PLAYLIST_ID}`),
      scrapeChannelTab("https://www.youtube.com/@TRGVC/videos?hl=en"),
      scrapeChannelTab("https://www.youtube.com/@TRGVC/streams?hl=en"),
      scrapePlaylistPage(MUSIC_PLAYLIST_ID),
      scrapePlaylistPage(GAMING_PLAYLIST_ID)
    ]);

    const items = deduplicateAndSort([
      ...longFormXml,
      ...uploadsXml,
      ...channelXml,
      ...liveStreamsXml,
      ...scrapedVideos,
      ...scrapedStreams
    ]);

    const musicPlaylistIds = new Set([
      ...musicXml.map(v => v.id),
      ...scrapedMusic.map(v => v.id)
    ]);

    const musicItems = deduplicateAndSort([
      ...items.filter(v => musicPlaylistIds.has(v.id) || isMusic(v.title, v.description)),
      ...musicXml,
      ...scrapedMusic
    ]);

    const allMusicIds = new Set([
      ...musicPlaylistIds,
      ...musicItems.map(v => v.id)
    ]);

    const gamingItems = deduplicateAndSort(
      [
        ...gamingXml,
        ...scrapedGaming,
        ...liveStreamsXml,
        ...scrapedStreams,
        ...items.filter(v => !allMusicIds.has(v.id) && !isMusic(v.title, v.description))
      ],
      allMusicIds
    );

    return new Response(JSON.stringify({ items, musicItems, gamingItems }), {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], musicItems: [], gamingItems: [], error: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/youtube" || url.pathname.startsWith("/api/youtube/")) {
      return handleYouTubeApi();
    }
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
