"use client";
import { Icon } from "./Icon";

export function PrintButton() {
  return (
    <button className="btn btn-primary no-print" onClick={() => window.print()}>
      <Icon name="printer" /> Print or save as PDF
    </button>
  );
}
