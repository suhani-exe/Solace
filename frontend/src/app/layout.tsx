import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solace — Your AI Companion for Mental Wellness",
  description:
    "A hyper-personalized, emotionally intelligent AI companion that truly listens, remembers, and cares. Not a chatbot — a companion.",
  keywords: ["mental health", "AI companion", "emotional support", "wellness", "therapy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('solace_theme');
                  if (theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
