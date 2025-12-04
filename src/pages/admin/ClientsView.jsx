import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientDetailsModal from "./components/ClientDetailsModal";
import {
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function ClientsView() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  // sorting state
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const navigate = useNavigate();

  // Load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      const qRef = query(collection(db, "profiles"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qRef);
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setProfiles(items);
    };
    loadProfiles();
  }, []);

  // Segment logic
  const getSegments = (profile) => {
    const segs = [];

    if ((profile.ltv || 0) >= 300)
      segs.push({ type: "high", label: "High value" });

    if (profile.lastBookingAt)
      segs.push({ type: "active", label: "Recently active" });

    const createdMs = profile.createdAt?.toMillis?.() ?? 0;

    if (Date.now() - createdMs < 1000 * 60 * 60 * 24 * 14)
      segs.push({ type: "new", label: "New" });

    return segs;
  };

  // Sorting logic
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...profiles];

    arr.sort((a, b) => {
      let A = a[sortField];
      let B = b[sortField];

      if (A?.toDate) A = A.toDate();
      if (B?.toDate) B = B.toDate();

      if (typeof A === "string") A = A.toLowerCase();
      if (typeof B === "string") B = B.toLowerCase();

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [profiles, sortField, sortDir]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return sorted;

    return sorted.filter((p) => {
      const name = (p.name || "Unnamed client").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [sorted, search]);

  // Summary metrics
  const metrics = useMemo(() => {
    const total = profiles.length;
    const highValue = profiles.filter((p) => (p.ltv || 0) >= 300).length;
    const active = profiles.filter((p) => p.lastBookingAt).length;

    return { total, highValue, active };
  }, [profiles]);

  return (
    <section className="w-full">
      <h1 className="text-2xl font-semibold text-plum mb-1">Clients</h1>
      <p className="text-plum/70 mb-6">
        View all customers who’ve created an account.
      </p>

      {/* SUMMARY METRICS */}
      <div className="flex gap-3 mb-6">
        <div className="bg-plum/5 px-4 py-2 rounded-lg text-plum text-sm font-medium">
          {metrics.total} total
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-lg text-green-800 text-sm font-medium">
          {metrics.highValue} high-value
        </div>
        <div className="bg-amber-50 px-4 py-2 rounded-lg text-amber-700 text-sm font-medium">
          {metrics.active} active
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <Input
          className="max-w-xs bg-white text-sm"
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border p-2 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="text-left text-plum/70 border-b">
              {[
                ["name", "Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["ltv", "LTV"],
                ["createdAt", "Member since"],
              ].map(([field, label]) => (
                <th
                  key={field}
                  className="py-2 px-3 cursor-pointer select-none hover:text-plum transition-colors"
                  onClick={() => toggleSort(field)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortField === field &&
                      (sortDir === "asc" ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      ))}
                  </div>
                </th>
              ))}
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const created =
                p.createdAt?.toDate?.().toLocaleDateString() ?? "—";
              const segs = getSegments(p);

              return (
                <tr
                  key={p.id}
                  className="border-b hover:bg-plum/5 transition"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium">
                      {p.name || "Unnamed client"}
                    </div>

                    {/* Segments */}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {segs.map((s) => (
                        <span
                          key={s.label}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            s.type === "high"
                              ? "bg-green-100 text-green-800"
                              : s.type === "active"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-3">{p.email || "—"}</td>
                  <td className="py-3 px-3">{p.phone || "—"}</td>

                  {/* COLOR-CODED LTV */}
                  <td
                    className={`py-3 px-3 font-medium ${
                      (p.ltv || 0) >= 300
                        ? "text-green-700"
                        : (p.ltv || 0) === 0
                        ? "text-plum/40"
                        : "text-plum"
                    }`}
                  >
                    {money(p.ltv || 0)}
                  </td>

                  <td className="py-3 px-3">{created}</td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-2">

                      {/* View */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer hover:bg-plum/10 hover:border-plum/30 transition-colors"
                        onClick={() => setSelectedClient(p)}
                      >
                        View
                      </Button>

                      {/* Bookings */}
                      <Button
                        size="sm"
                        className="bg-plum text-white cursor-pointer hover:bg-plum/80 hover:shadow-md transition-all"
                        onClick={() =>
                          navigate(
                            `/admin-client-bookings?email=${encodeURIComponent(
                              p.email
                            )}`
                          )
                        }
                      >
                        Bookings
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-plum/50">
                  No clients match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAILS MODAL */}
      <ClientDetailsModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </section>
  );
}


