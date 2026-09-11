/** CLI: run the profile pipeline without the UI. */
import { ingestGithub } from "../src/lib/profile/github";
import { readTasteNotes } from "../src/lib/profile/notes";
import { extractItems } from "../src/lib/profile/extract";

async function main() {
  console.log("ingesting github…");
  const gh = await ingestGithub();
  console.log(gh.text.slice(0, 1000));
  console.log("taste notes:", readTasteNotes().slice(0, 500) || "(empty — edit data/notes/taste.md)");
  const items = await extractItems("github", gh.text);
  console.log(`extracted ${items.length} items`);
  console.log(JSON.stringify(items, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
