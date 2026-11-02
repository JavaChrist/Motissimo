"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setBirthYear, useAgeStatus } from "@/lib/promo/age-gate";

/** Question neutre posée une fois : elle ne dit pas à quoi sert la réponse. */
export function AgeGate() {
  const status = useAgeStatus();
  const [year, setYear] = useState("");

  if (status !== "unknown") return null;

  const current = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => current - i);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#FFF8ED] p-8 text-center shadow-2xl">
        <h2 className="mb-1 text-2xl font-black" style={{ color: "#3D3227" }}>
          Bienvenue !
        </h2>
        <p className="mb-5 text-sm" style={{ color: "#8B7D6B" }}>
          Quelle est ton année de naissance ? Elle reste sur cet appareil.
        </p>
        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Année de naissance"
          className="mb-5 w-full rounded-xl border-2 bg-white p-3 text-base font-bold"
          style={{ borderColor: "rgba(139,125,107,0.3)", color: "#3D3227" }}
        >
          <option value="">Choisir</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <Button
          disabled={!year}
          onClick={() => setBirthYear(Number(year))}
          className="w-full rounded-xl font-bold text-white"
          style={{ background: "#0e7490" }}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
