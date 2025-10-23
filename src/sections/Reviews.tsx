// src/components/sections/Reviews.tsx
import reviewsStatic from "@/content/reviews.json";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase"; // ← use your alias path, not ../lib/firebase

function assetUrl(path: string) {
  return new URL(path, import.meta.url).href;
}

export default function Reviews() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>(reviewsStatic || []);

  useEffect(() => {
    // Only show approved, newest first by PUBLISHED time
    const q = query(
      collection(db, "reviews"),
      where("status", "==", "approved"),
      orderBy("publishedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (rows.length) setReviews(rows);
      },
      (err) => console.error("Failed to load reviews", err)
    );

    return () => unsub();
  }, []);

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold mb-6">Client Reviews</h2>

      <ul className="grid gap-6 md:grid-cols-2">
        {reviews.map((r: any) => {
          const hasScreenshot = typeof r.screenshot === "string" && r.screenshot.length > 0;
          const screenshotHref = hasScreenshot ? assetUrl(r.screenshot) : undefined;

          return (
            <li key={r.id} className="rounded-xl border p-4 bg-white relative">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-medium">{r.name || "Anonymous"}</span>
                {typeof r.rating === "number" && (
                  <span aria-label={`${r.rating} out of 5 stars`} className="text-amber-500">
                    {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                  </span>
                )}
                {r.source && <span className="text-xs opacity-60">• {r.source}</span>}
                {r.publishedAt?.toDate && (
                  <span className="text-xs opacity-60">
                    • {r.publishedAt.toDate().toLocaleDateString()}
                  </span>
                )}
              </div>

              {r.body && <p className="text-sm mb-3 text-plum">{r.body}</p>}

              {screenshotHref && (
                <>
                  {/* Desktop hover preview */}
                  <button
                    type="button"
                    className="text-xs underline text-gold hover:text-gold/80 hidden sm:inline"
                    aria-label="Preview original review screenshot"
                    onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                  >
                    {openId === r.id ? "Hide screenshot" : "View screenshot"}
                  </button>

                  {/* Mobile / inline */}
                  <button
                    type="button"
                    onClick={() => setOpenId((id) => (id === r.id ? null : r.id))}
                    className="text-xs underline text-gold hover:text-gold/80 sm:hidden"
                  >
                    {openId === r.id ? "Hide screenshot" : "View screenshot"}
                  </button>

                  {openId === r.id && (
                    <div className="mt-3">
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
    </section>
  );
}
