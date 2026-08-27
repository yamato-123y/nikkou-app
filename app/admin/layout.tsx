import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面",
  icons: {
    icon: "/kanri.jpg",
    apple: "/kanri.jpg",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
