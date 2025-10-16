// src/components/sections/Reviews.tsx
import reviewsStatic from "@/content/reviews.json";
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

function assetUrl(path: string) {
  // Allows "@/assets/..." paths inside JSON to resolve in dev + build
  return new URL(path, import.meta.url).href;
}

export default function Reviews() {
  // (Optional) simple inline lightbox for tap on mobile (no hover there)
  const [openId, setOpenId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>(reviewsStatic || []);

  useEffect(() => {
    try {
      // only show approved reviews
      const q = query(collection(db, 'reviews'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (rows.length) setReviews(rows);
      });
      return () => unsub();
    } catch (e) {
      console.error('Failed to load reviews', e);
    }
  }, []);

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold mb-6">Client Reviews</h2>

      <TooltipProvider>
        <ul className="grid gap-6 md:grid-cols-2">
          {(reviews as any[]).map((r) => {
            const hasScreenshot =
              typeof r.screenshot === "string" && r.screenshot.length > 0;
            const screenshotHref = hasScreenshot ? assetUrl(r.screenshot) : undefined;

            return (
              <li
                key={r.id}
                className="rounded-xl border p-4 bg-white relative"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium">{r.name}</span>

                  {typeof r.rating === "number" && (
                    <span
                      aria-label={`${r.rating} out of 5 stars`}
                      className="text-amber-500"
                    >
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  )}

                  {r.source && (
                    <span className="text-xs opacity-60">• {r.source}</span>
                  )}
                  {r.date && (
                    <span className="text-xs opacity-60">• {r.date}</span>
                  )}
                </div>

                {r.body && <p className="text-sm mb-3 text-plum">{r.body}</p>}

                {screenshotHref && (
                  <>
                    {/* Desktop: show screenshot on hover */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-xs underline text-gold hover:text-gold/80 hidden sm:inline"
                          aria-label="Preview original review screenshot"
                        >
                          View screenshot
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="p-0 bg-transparent border-0">
                        <img
                          src={screenshotHref}
                          alt="Original review screenshot"
                          className="w-72 h-auto rounded-lg shadow-xl border"
                        />
                      </TooltipContent>
                    </Tooltip>

                    {/* Mobile (no hover): tap to toggle inline preview */}
                    <button
                      type="button"
                      onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                      className="text-xs underline text-gold hover:text-gold/80 sm:hidden"
                    >
                      {openId === r.id ? "Hide screenshot" : "View screenshot"}
                    </button>

                    {openId === r.id && (
                      <div className="mt-3 sm:hidden">
                        <img
                          src={screenshotHref}
                          alt="Original review screenshot"
                          className="w-full max-w-xs rounded-lg shadow border"
                        />
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </TooltipProvider>
    </section>
  );
}
