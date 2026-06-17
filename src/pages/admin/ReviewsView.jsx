import React from "react";
import { Star } from "lucide-react";
import reviews from "@/content/reviews.json";

function Stars({ rating }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`w-4 h-4 ${
            index < Number(rating || 0)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </span>
  );
}

export default function ReviewsView() {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Reviews</h2>
        <p className="text-sm text-plum/70">
          Demo review moderation view using local testimonial content.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review, index) => (
          <article key={review.id || index} className="rounded-2xl bg-white border border-plum/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold text-plum">
                  {review.name || review.author || "Demo Client"}
                </h3>
                <p className="text-xs text-plum/60">
                  {review.service || "Cleaning service"}
                </p>
              </div>
              <Stars rating={review.rating || 5} />
            </div>
            <p className="text-sm text-plum/80">{review.body || review.quote}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#EEF5FB] px-2 py-1 text-xs text-[#0B283D]">
              Approved demo review
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
