"use client";
import { Hammer, Dices, TrendingUp, Blocks, Swords, Compass, Radar, UserRound } from "lucide-react";
import { initials } from "@/lib/avatars/dicebear";

const ICONS: Record<string, typeof Hammer> = {
  seat_me: UserRound, seat_pragmatist: Hammer, seat_wildcard: Dices,
  seat_market: TrendingUp, seat_architect: Blocks, seat_contrarian: Swords,
  seat_mentor: Compass, seat_trend: Radar,
};

export function Avatar({ agent, svg }: { agent: { seatKey: string; name: string; avatarStyle: string; accentColor: string }; svg?: string }) {
  if (agent.avatarStyle === "lucide") {
    const Icon = ICONS[agent.seatKey] ?? Hammer;
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background: `${agent.accentColor}22` }}>
        <Icon size={26} color={agent.accentColor} />
      </div>
    );
  }
  if (agent.avatarStyle === "initials" || !svg) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full text-lg font-bold"
        style={{ background: `${agent.accentColor}22`, color: agent.accentColor }}>
        {initials(agent.name)}
      </div>
    );
  }
  return <div className="h-full w-full overflow-hidden rounded-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
