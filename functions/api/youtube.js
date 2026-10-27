export async function onRequest() {
  const CHANNEL_ID = "UCTJMtzodlcDEYt38qR_0cxQ";
  const MUSIC_PLAYLIST_ID = "PL5mv7FjsynbzKMH3jYHHn2i7EziEFpo7-";
  const GAMING_PLAYLIST_ID = "PLGLaDUSam8Cs";

  function parseFeed(xml) {
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries.map(match => {
      const c = match[1];
      const id = (c.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1] || "";
      const title = (c.match(/<title>(.*?)<\/title>/) || [])[1] || "";
      const pub = (c.match(/<published>(.*?)<\/published>/) || [])[1] || "";
      const desc = (c.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "";
      const date = pub ? new Date(pub).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Recent";
      return { id, title, date, description: desc };
    });
  }

  async function fetchFeed(url) {
    if (!url) return [];
    try {
      const res = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseFeed(xml);
    } catch (_) {
      return [];
    }
  }

  try {
    const [items, musicItems, gamingItems] = await Promise.all([
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${MUSIC_PLAYLIST_ID}`),
      fetchFeed(`https://www.youtube.com/feeds/videos.xml?playlist_id=${GAMING_PLAYLIST_ID}`)
    ]);
    return new Response(JSON.stringify({ items, musicItems, gamingItems }), {
      headers: { "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "public, max-age=300" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ items: [], musicItems: [], gamingItems: [], error: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
