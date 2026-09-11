import fs from "node:fs";
import path from "node:path";

/** Deterministic local project scan: read manifests to detect stacks. No LLM here. */
export interface LocalProject {
  dir: string;
  stack: string[];
  name: string;
}

export async function scanLocalProjects(dirs: string[]): Promise<{ text: string; projects: LocalProject[] }> {
  const projects: LocalProject[] = [];
  for (const d of dirs) {
    try {
      const stack: string[] = [];
      const pkg = path.join(d, "package.json");
      const py = path.join(d, "pyproject.toml");
      const go = path.join(d, "go.mod");
      const cargo = path.join(d, "Cargo.toml");
      if (fs.existsSync(pkg)) {
        stack.push("node");
        try {
          const j = JSON.parse(fs.readFileSync(pkg, "utf8"));
          const deps = Object.keys({ ...(j.dependencies ?? {}), ...(j.devDependencies ?? {}) });
          if (deps.includes("next")) stack.push("nextjs");
          if (deps.includes("react")) stack.push("react");
          if (deps.includes("typescript")) stack.push("typescript");
        } catch { /* ignore */ }
      }
      if (fs.existsSync(py)) stack.push("python");
      if (fs.existsSync(go)) stack.push("go");
      if (fs.existsSync(cargo)) stack.push("rust");
      projects.push({ dir: d, stack, name: path.basename(d) });
    } catch { /* skip unreadable */ }
  }
  const text = projects.map((p) => `- ${p.name} (${p.dir}): ${p.stack.join(", ") || "unknown stack"}`).join("\n");
  return { text, projects };
}
