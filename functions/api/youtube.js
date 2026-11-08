export async function onRequest() {
  const CHANNEL_ID = "UCTJMtzodlcDEYt38qR_0cxQ";
  const UPLOADS_PLAYLIST_ID = "UUCTJMtzodlcDEYt38qR_0cxQ";
  const MUSIC_PLAYLIST_ID = "PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-";
  const GAMING_PLAYLIST_ID = "PLGLaDUSam8Cs";

  function isShort(title, desc) {
    const t = `${title} ${desc || ""}`.toLowerCase();
    return (
      t.includes("#shorts") ||
      t.includes("#short") ||
      t.includes("#warzoneshorts") ||
      t.includes("official short") ||
      t.includes("how to open bunker")
    );
  }

  function isMusic(title, desc) {
    const t = `${title} ${desc || ""}`.toLowerCase();
    return (
      t.includes("official audio") ||
      t.includes("official music") ||
      t.includes("official lyric") ||
      t.includes("full album") ||
      t.startsWith("trgvc -") ||
      t.startsWith("trgvc –") ||
      t.startsWith("trgvc —")
    );
  }

  function parseFeed(xml) {
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries
      .map((match, idx) => {
        const c = match[1];
        const id = (c.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1] || "";
        const title = (c.match(/<title>(.*?)<\/title>/) || [])[1] || "";
        const pub = (c.match(/<published>(.*?)<\/published>/) || [])[1] || "";
        const desc = (c.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "";
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
      const res = await fetch(url, { cf: { cacheTtl: 60, cacheEverything: true } });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseFeed(xml);
    } catch (_) {
      return [];
    }
  }

  async function scrapeChannelVideos() {
    try {
      const res = await fetch("https://www.youtube.com/@TRGVC/videos?hl=en", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept-Language": "en-GB,en;q=0.9"
        },
        cf: { cacheTtl: 60 }
      });
      if (!res.ok) return [];
      const html = await res.text();
      const regex = /"videoRenderer":\{"videoId":"([^"]+)"[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}\][\s\S]*?"publishedTimeText":\{"simpleText":"([^"]+)"\}/g;
      const list = [];
      let m;
      let idx = 0;
      while ((m = regex.exec(html)) !== null) {
        const id = m[1];
        const title = m[2].replace(/\\u0026/g, "&");
        const date = m[3] || "Latest Upload";
        if (!isShort(title, "")) {
          list.push({ id, title, date, timestamp: Date.now() - idx * 60000, description: "" });
          idx++;
        }
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  async function scrapePlaylistPage(playlistId) {
    try {
      const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}&hl=en`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        cf: { cacheTtl: 60 }
      });
      if (!res.ok) return [];
      const html = await res.text();
      const regex = /"playlistVideoRenderer":\{"videoId":"([^"]+)","thumbnail":[\s\S]*?"title":\{"runs":\[\{"text":"([^"]+)"\}/g;
      const list = [];
      let m;
      let idx = 0;
      while ((m = regex.exec(html)) !== null) {
        const id = m[1];
        const title = m[2].replace(/\\u0026/g, "&");
        if (!isShort(title, "")) {
          list.push({ id, title, date: "Latest Upload", timestamp: Date.now() - idx * 60000, description: "" });
          idx++;
        }
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  function deduplicate(arr) {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      if (!v || !v.id || seen.has(v.id)) continue;
      if (isShort(v.title, v.description)) continue;
      seen.add(v.id);
      out.push(v);
    }
    return out;
  }

  try {
    const [channelXml, uploadsXml, musicXml, gamingXml, scrapedChannel, scrapedGaming] = await Promise.all([
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${UPLOADS_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${MUSIC_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${GAMING_PLAYLIST_ID}`),
      scrapeChannelVideos(),
      scrapePlaylistPage(GAMING_PLAYLIST_ID)
    ]);

    const items = deduplicate([...channelXml, ...uploadsXml, ...scrapedChannel]);
    const musicItems = deduplicate([...musicXml, ...items.filter(v => isMusic(v.title, v.description))]);
    const gamingItems = deduplicate([
      ...gamingXml,
      ...scrapedGaming,
      ...items.filter(v => !isMusic(v.title, v.description))
    ]);

    return new Response(JSON.stringify({ items, musicItems, gamingItems }), {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], musicItems: [], gamingItems: [], error: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
