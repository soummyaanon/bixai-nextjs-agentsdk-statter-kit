import type { Metadata } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bixai.dev"),
  title: {
    default: "bixai.dev Agent SDK Starter",
    template: "%s | bixai.dev",
  },
  description:
    "Production-ready Next.js + OpenAI Agents SDK starter with tool-first architecture, typed boundaries, and SSE streaming.",
  applicationName: "@bixai/create-agent-sdk-starter",
  authors: [
    {
      name: "Soumyaranjan Panda",
      url: "https://github.com/soummyaanon",
    },
  ],
  creator: "Soumyaranjan Panda",
  publisher: "bixai.dev",
  keywords: [
    "bixai.dev",
    "OpenAI Agents SDK",
    "Next.js starter",
    "AI agent template",
    "SSE streaming",
    "tool-first architecture",
    "@bixai/create-agent-sdk-starter",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "bixai.dev",
    title: "bixai.dev Agent SDK Starter",
    description: "Scaffold a production-ready Next.js + OpenAI Agents SDK app.",
    url: "https://bixai.dev",
    images: [
      {
        url: "/og-image.png",
        width: 3394,
        height: 1902,
        alt: "bixai.dev Agent SDK Starter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "bixai.dev Agent SDK Starter",
    description: "Production-ready Next.js + OpenAI Agents SDK starter template.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Soumyaranjan Panda",
  url: "https://bixai.dev",
  sameAs: ["https://github.com/soummyaanon"],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "bixai.dev Agent SDK Starter",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  creator: {
    "@type": "Person",
    name: "Soumyaranjan Panda",
  },
  publisher: {
    "@type": "Organization",
    name: "bixai.dev",
    url: "https://bixai.dev",
  },
  description:
    "Production-ready Next.js + OpenAI Agents SDK starter with tool-first architecture, typed boundaries, and SSE streaming.",
  url: "https://bixai.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}
