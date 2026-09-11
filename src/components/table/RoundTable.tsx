"use client";
import { LayoutGroup } from "framer-motion";
import { placeSeats, RADIUS_X, RADIUS_Y } from "@/lib/layout/seats";
import { TableSurface } from "./TableSurface";
import { Seat, type SeatVisual } from "./Seat";
import { CenterPlinth } from "./CenterPlinth";
import type { AgentDTO } from "@/shared/types";
import type { StepName } from "@/shared/constants";

export function RoundTable({ agents, seats, step, weights, ranking, onOpenSeat, openSeatId }: {
  agents: AgentDTO[];
  seats: Record<string, { status: SeatVisual; take: string }>;
  step: StepName;
  weights: Record<string, number>;
  ranking: Array<{ title: string; score: number; accent: string }>;
  onOpenSeat: (id: string) => void;
  openSeatId: string | null;
}) {
  const placements = placeSeats(Math.max(agents.length, 1), RADIUS_X, RADIUS_Y);
  return (
    <LayoutGroup>
      <div className="bg-grid relative mx-auto w-full max-w-[1100px]" style={{ aspectRatio: "16 / 10" }} role="group" aria-label="Round table">
        <TableSurface step={step} />
        {agents.map((a, i) => {
          const p = placements[i];
          if (!p) return null;
          const s = seats[a.id] ?? { status: (a.enabled ? "idle" : "disabled") as SeatVisual, take: "" };
          return (
            <div key={a.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}>
              <Seat agent={a} state={s.status} take={s.take}
                weightPct={weights[a.id] ?? 0}
                onOpen={() => onOpenSeat(a.id)} drawerOpen={openSeatId === a.id} />
            </div>
          );
        })}
        <CenterPlinth step={step} ranking={ranking} />
      </div>
    </LayoutGroup>
  );
}
