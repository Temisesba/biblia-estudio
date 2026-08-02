"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReadingEntry {
  book_name: string;
  chapter_number: number;
  last_read_at: string | null;
  href: string;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function ReadingCalendar({ entries }: { entries: ReadingEntry[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, ReadingEntry[]>();
    for (const e of entries) {
      if (!e.last_read_at) continue;
      const key = e.last_read_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded p-1 hover:bg-muted">
          <ChevronLeft size={18} />
        </button>
        <p className="font-semibold capitalize">
          {MONTHS[month]} {year}
        </p>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded p-1 hover:bg-muted">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-foreground/50">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = byDay.get(key) ?? [];
          const isSelected = selectedDay === key;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(dayEntries.length ? key : null)}
              className={`aspect-square rounded-md text-sm transition-colors ${
                dayEntries.length ? "bg-primary/20 font-semibold hover:bg-primary/30" : "hover:bg-muted"
              } ${isSelected ? "ring-2 ring-primary" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium">Leído el {selectedDay}</p>
          <ul className="flex flex-col gap-1">
            {(byDay.get(selectedDay) ?? []).map((e, idx) => (
              <li key={idx}>
                <a href={e.href} className="text-sm text-primary hover:underline">
                  {e.book_name} {e.chapter_number}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
