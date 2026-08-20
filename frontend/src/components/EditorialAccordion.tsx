"use client";

import React, { useState } from "react";

export interface AccordionItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  detail: string;
  specs?: { label: string; value: string }[];
}

export function EditorialAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  return (
    <div className="border-t border-[#282722] divide-y divide-[#282722] font-sans">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={`transition-colors duration-150 ${
              isOpen ? "bg-[#141410]/70" : "hover:bg-[#12120F]"
            }`}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full py-6 px-4 -mx-4 flex items-center justify-between text-left group select-none"
            >
              <div className="flex items-center space-x-6 sm:space-x-10">
                <span className="font-mono text-xs text-bone-dim group-hover:text-bone transition-colors">
                  {item.code}
                </span>
                <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-bone uppercase group-hover:text-white transition-colors">
                  {item.title}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="hidden md:inline font-mono text-[11px] text-bone-dim truncate max-w-sm">
                  {item.summary}
                </span>
                <span
                  className={`font-mono text-base text-bone-dim transition-transform duration-200 ${
                    isOpen ? "rotate-45 text-bone" : "group-hover:text-bone"
                  }`}
                >
                  +
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="pb-8 pt-2 px-4 -mx-4 space-y-4 border-t border-[#282722]/50 animate-in fade-in duration-200">
                <p className="text-xs sm:text-sm text-bone-muted max-w-3xl leading-relaxed">
                  {item.detail}
                </p>

                {item.specs && item.specs.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#24231E] font-mono text-[10px]">
                    {item.specs.map((s) => (
                      <div key={s.label}>
                        <span className="text-bone-dim uppercase block">{s.label}</span>
                        <span className="text-bone font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
