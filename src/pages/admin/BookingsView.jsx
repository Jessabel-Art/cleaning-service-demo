import React, { useMemo, useState } from "react";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusPill from "./components/StatusPill";
import { getAllDemoAppointments } from "@/data/demoRuntime";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BookingsView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => getAllDemoAppointments(), []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => status === "all" || row.status === status)
      .filter((row) => {
        if (!needle) return true;
        return [
          row.clientName,
          row.serviceName,
          row.contact?.email,
          row.addressLine,
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [rows, search, status]);

  const exportCsv = () => {
    const header = ["ID", "Client", "Service", "Status", "Date", "Total", "Address"];
    const csv = [
      header.join(","),
      ...filtered.map((row) =>
        [
          row.id,
          row.clientName,
          row.serviceName,
          row.status,
          formatDate(row.startAt),
          row.total,
          row.addressLine,
        ]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cleanpro-demo-bookings.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Bookings</h2>
        <p className="text-sm text-plum/70">
          Demo appointment list generated from local sample data.
        </p>
      </div>

      <Card className="bg-white border-plum/10">
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-plum">All appointments</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-plum/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="bg-white pl-9"
                placeholder="Search bookings"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white min-w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv} className="border-plum text-plum">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-plum/60 border-b border-plum/10">
              <tr>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
                <th className="py-3 pr-4">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plum/10">
              {filtered.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-3 pr-4 whitespace-nowrap text-plum">
                    {formatDate(row.startAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-plum">{row.clientName}</p>
                    <p className="text-xs text-plum/60">{row.contact?.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-plum">{row.serviceName}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-3 pr-4 text-right text-plum">{money(row.total)}</td>
                  <td className="py-3 pr-4 text-plum/75 min-w-64">{row.addressLine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
