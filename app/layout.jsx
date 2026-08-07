export const metadata = {
  metadataBase: new URL("https://vamossanmiguel.com"),
  title: "Vamos San Miguel — San Miguel de Allende, Gto.",
  description:
    "The insider's guide to San Miguel de Allende — what's on and what's good. Events, news, and hand-picked local favorites, in English and Spanish.",
  openGraph: {
    title: "Vamos San Miguel",
    description: "The insider's San Miguel de Allende — what's on and what's good.",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
