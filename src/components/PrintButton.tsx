"use client";
import { Icon } from "./Icon";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-tonal btn-sm no-print" onClick={() => window.print()} aria-label="Print or save as PDF">
      <Icon name="printer" size={18} /> Print
    </button>
  );
}
