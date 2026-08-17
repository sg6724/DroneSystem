import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import StarsBackground from "@/components/stars-background";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden relative bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      <div className="absolute inset-0 pointer-events-none">
        <StarsBackground />
      </div>
      <div className="relative z-10 flex w-full h-full min-w-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="relative z-20 flex-1 min-w-0 overflow-x-hidden overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
