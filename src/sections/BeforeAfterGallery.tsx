import manifest from "@/content/gallery.manifest.json";

type Pair = { label: string; before: string; after: string };
type ManifestItem = { slug: string };

function assetUrl(path: string) {
  return new URL(path, import.meta.url).href;
}

export default function BeforeAfterGallery() {
  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold mb-6">Before & After</h2>

      {(manifest as ManifestItem[]).map((proj) => {
        // Import each job's meta.json (keeps content next to images)
        // @ts-ignore - allow dynamic JSON require in Vite
        const meta = require(`@/assets/before-after/${proj.slug}/meta.json`) as {
          title: string;
          location: string;
          date: string;
          pairs: Pair[];
          altTemplate?: { before: string; after: string };
        };

        const base = `@/assets/before-after/${proj.slug}`;

        return (
          <article key={proj.slug} className="space-y-5 mb-10">
            <header>
              <h3 className="text-xl font-medium">{meta.title}</h3>
              <p className="text-sm opacity-75">
                {meta.location} • {meta.date}
              </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
              {meta.pairs.map((p, i) => {
                const beforeAlt =
                  meta.altTemplate?.before?.replace?.("{{label}}", p.label) ??
                  `${p.label} before cleaning`;
                const afterAlt =
                  meta.altTemplate?.after?.replace?.("{{label}}", p.label) ??
                  `${p.label} after cleaning`;

                return (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <figure>
                      <img
                        src={assetUrl(`${base}/${p.before}`)}
                        alt={beforeAlt}
                        loading="lazy"
                      />
                      <figcaption className="text-xs mt-1">
                        Before — {p.label}
                      </figcaption>
                    </figure>
                    <figure>
                      <img
                        src={assetUrl(`${base}/${p.after}`)}
                        alt={afterAlt}
                        loading="lazy"
                      />
                      <figcaption className="text-xs mt-1">
                        After — {p.label}
                      </figcaption>
                    </figure>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
