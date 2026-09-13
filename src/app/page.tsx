import AppShell from "@/components/AppShell";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import ShreeWorkerHero from "@/components/ShreeWorkerHero";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  return (
    <AppShell title="Shree AI Worker" sidebarMode="home">
      <div
        className="flex-1 flex flex-col min-h-0 relative -mx-[26px] -mb-[26px] overflow-hidden"
        id="overviewView"
      >
        {/* Decorative wave art -- purely atmospheric, sits behind the
            content and search bar. */}
        <svg
          className="absolute inset-x-0 bottom-0 w-full h-[52%] pointer-events-none"
          viewBox="0 0 1000 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,160 C220,90 420,210 1000,110 L1000,320 L0,320 Z"
            style={{ fill: "var(--wave-1)" }}
          />
          <path
            d="M0,210 C260,150 560,270 1000,180 L1000,320 L0,320 Z"
            style={{ fill: "var(--wave-2)" }}
          />
        </svg>

        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto relative z-10 pt-2 sm:pt-4">
          <ShreeWorkerHero />
        </div>

        <div className="relative z-10">
          <GlobalSearchBar />
        </div>

      </div>
    </AppShell>
  );
}
