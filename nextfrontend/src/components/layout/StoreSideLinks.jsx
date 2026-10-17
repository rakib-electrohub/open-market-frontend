import { Link } from "@/lib/next-router";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getSafeHttpUrl } from "@/utils/urls";

const DEFAULT_IOTTECHBD_URL = "https://iottechbd.com";

export default function StoreSideLinks() {
  const settings = useAppSettings();
  const pathname = usePathname();
  const iotTechUrl = getSafeHttpUrl(settings.iottechbd_url ?? DEFAULT_IOTTECHBD_URL);
  const printingServiceUrl = getSafeHttpUrl(settings.printing_service_url);
  const [visibleSides, setVisibleSides] = useState({ left: false, right: false });

  useEffect(() => {
    let observedContent = null;
    const resizeObserver = new ResizeObserver(measureSpace);
    resizeObserver.observe(document.documentElement);
    let frame;

    function getPageContent() {
      const main = document.querySelector("main");
      if (main) return main;

      return [...document.querySelectorAll('[class*="max-w-"], .content, .auth-layout, .site-shell')]
        .filter((element) => {
          if (element.closest("header, nav, footer")) return false;
          const bounds = element.getBoundingClientRect();
          return bounds.width > 0 && bounds.height > 180 && bounds.width < window.innerWidth;
        })
        .sort((first, second) => {
          const firstBounds = first.getBoundingClientRect();
          const secondBounds = second.getBoundingClientRect();
          return secondBounds.width * secondBounds.height - firstBounds.width * firstBounds.height;
        })[0] || null;
    }

    function measureSpace() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const content = getPageContent();
        const viewportHasRoom = window.innerWidth >= 768 && window.innerHeight >= 480;
        if (!content || !viewportHasRoom) {
          setVisibleSides((current) => (
            current.left || current.right ? { left: false, right: false } : current
          ));
          return;
        }

        const bounds = content.getBoundingClientRect();
        const nextVisibility = {
          left: bounds.left >= 56,
          right: window.innerWidth - bounds.right >= 56,
        };
        setVisibleSides((current) => (
          current.left === nextVisibility.left && current.right === nextVisibility.right
            ? current
            : nextVisibility
        ));
      });
    }

    function observeMain() {
      const content = getPageContent();
      if (content !== observedContent) {
        if (observedContent) resizeObserver.unobserve(observedContent);
        observedContent = content;
        if (content) resizeObserver.observe(content);
      }
      measureSpace();
    }

    const mutationObserver = new MutationObserver(observeMain);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measureSpace);
    observeMain();

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureSpace);
    };
  }, [iotTechUrl, pathname, printingServiceUrl]);

  return (
    <>
      {visibleSides.left && (
        <aside aria-label="Store links" className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-start gap-1">
          <Link
            to={pathname === "/customer-reviews" ? "/" : "/customer-reviews"}
            className="rounded-r-xl border border-l-0 border-border bg-white px-2.5 py-4 text-xs font-semibold text-foreground shadow-lg transition-colors hover:bg-primary hover:text-white [writing-mode:vertical-rl]"
          >
            <span className="inline-block rotate-180">
              {pathname === "/customer-reviews" ? "Back to Home" : "Customer Reviews"}
            </span>
          </Link>
          <Link
            to="/contact"
            className="rounded-r-xl border border-l-0 border-border bg-white px-2.5 py-4 text-xs font-semibold text-foreground shadow-lg transition-colors hover:bg-primary hover:text-white [writing-mode:vertical-rl]"
          >
            <span className="inline-block rotate-180">Contact</span>
          </Link>
        </aside>
      )}

      {visibleSides.right && (
        <aside aria-label="Business links" className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end gap-1">
          <span className="rounded-l-xl border border-r-0 border-grey-300 bg-green-600 px-1.5 py-3 text-[10px] font-semibold text-white shadow-lg [writing-mode:vertical-rl]">
            <span className="inline-block rotate-180">Developed by IoT-TechBD</span>
          </span>
          {iotTechUrl && (
            <a
              href={iotTechUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-l-xl border border-r-0 border-primary bg-primary px-2.5 py-4 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-primary/90 [writing-mode:vertical-rl]"
            >
              <span className="inline-block rotate-180">IoT-TechBD</span>
            </a>
          )}
          {printingServiceUrl && (
            <a
              href={printingServiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-l-xl border border-r-0 border-border bg-white px-2.5 py-4 text-xs font-semibold text-foreground shadow-lg transition-colors hover:bg-primary hover:text-white [writing-mode:vertical-rl]"
            >
              <span className="inline-block rotate-180">3D Printing Service</span>
            </a>
          )}
        </aside>
      )}
    </>
  );
}
