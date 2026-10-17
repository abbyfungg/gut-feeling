"use client";
import { Icon } from "./Icon";

export function PrintButton() {
  return (
    <button className="btn btn-primary btn-sm no-print" onClick={() => window.print()} aria-label="Print or save as PDF">
      <Icon name="printer" size={18} /> Print
    </button>
  );
}
