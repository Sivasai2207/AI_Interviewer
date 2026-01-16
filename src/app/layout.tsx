import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Interviewer - Ruthless Mock Interview Practice",
  description:
    "Practice for your next technical interview with our ruthless AI interviewer. Get detailed feedback, identify weaknesses, and prepare to ace your placement interviews.",
  keywords: [
    "mock interview",
    "technical interview",
    "AI interviewer",
    "placement preparation",
    "interview practice",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
