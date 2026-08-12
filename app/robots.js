export default function robots() {
  return {
    rules: [
      // Allow the good crawlers, including AI assistants (GEO).
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    ],
    sitemap: "https://vamossanmiguel.com/sitemap.xml",
    host: "https://vamossanmiguel.com",
  };
}
