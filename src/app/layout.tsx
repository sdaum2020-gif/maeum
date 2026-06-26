import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마음정원 - 감정일기",
  description: "감정을 기록하고 마음정원에 꽃을 심어보세요",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <div className="max-w-md mx-auto min-h-screen bg-ivory/50">
          {children}
        </div>
      </body>
    </html>
  );
}