export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/.git" || url.pathname.startsWith("/.git/")) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
