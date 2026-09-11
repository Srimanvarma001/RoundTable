"use client";

export function RunCompare({ a, b }: { a: Record<string, unknown>; b: Record<string, unknown> }) {
  const rows: Array<[string, string, string]> = [
    ["seed", String(a.seedPrompt ?? ""), String(b.seedPrompt ?? "")],
    ["winner", String((a as { winner?: string }).winner ?? ""), String((b as { winner?: string }).winner ?? "")],
    ["score", String((a as { score?: number }).score ?? ""), String((b as { score?: number }).score ?? "")],
    ["cost", String((a as { cost?: number }).cost ?? ""), String((b as { cost?: number }).cost ?? "")],
  ];
  return (
    <table className="w-full text-sm">
      <thead><tr><th className="text-left">metric</th><th className="text-left">A</th><th className="text-left">B</th></tr></thead>
      <tbody>
        {rows.map(([k, x, y]) => (
          <tr key={k} className="border-t" style={{ borderColor: "var(--line)" }}>
            <td>{k}</td><td>{x}</td><td>{y}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
