import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "蛋壳跟练 AI 体态评估 | EggFitness",
  description: "上传正面、侧面和背面照片，约 2 分钟获得 AI 体态报告与个性化训练方向。",
  icons: {
    icon: "/images/brand/logo.jpg",
    shortcut: "/images/brand/logo.jpg",
  },
  openGraph: {
    title: "2 分钟，看懂你的体态",
    description: "AI 标注关键关节、身体对称性与受限等级，获得个性化训练方向。",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "2 分钟，看懂你的体态",
    description: "EggFitness AI 体态评估",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
