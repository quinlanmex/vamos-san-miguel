export default function robots() {
  return {
    rules: [
      // Allow the good crawlers, including AI assistants (GEO).
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: "https://www.vamossanmiguel.com/sitemap.xml",
    host: "https://www.vamossanmiguel.com",
  };
}
