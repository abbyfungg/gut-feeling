// Deletes the local SQLite database so the next server start re-seeds fresh demo data
// (demo histories are generated relative to "now", so reset before a demo).
// Stop the server first. Usage: npm run reset-demo
import fs from "node:fs";
import path from "node:path";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
let removed = 0;
for (const f of ["gut-feeling.db", "gut-feeling.db-wal", "gut-feeling.db-shm"]) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    removed++;
  }
}
console.log(removed ? `Removed the database in ${dir}. Start the server to re-seed demo data.` : `No database found in ${dir}.`);
