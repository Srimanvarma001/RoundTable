import { BudgetExceededError } from "../llm/types";

export interface BudgetState {
  usedUsd: number;
  limitUsd: number;
  tokensUsed: number;
  tokenLimit: number;
  callsUsed: number;
  callLimit: number;
}

/** Guard checks BEFORE dispatch, never mid-call. Warns at 80%. */
export class BudgetGuard {
  warned = false;
  constructor(private s: BudgetState, private onWarning?: (pct: number) => void) {}

  get state(): BudgetState {
    return this.s;
  }

  checkBeforeDispatch(): void {
    const { usedUsd, limitUsd, tokensUsed, tokenLimit, callsUsed, callLimit } = this.s;
    if (usedUsd / limitUsd >= 0.8 && !this.warned) {
      this.warned = true;
      this.onWarning?.(usedUsd / limitUsd);
    }
    if (usedUsd >= limitUsd || tokensUsed >= tokenLimit || callsUsed >= callLimit) {
      throw new BudgetExceededError();
    }
  }

  record(costUsd: number, tokensIn: number, tokensOut: number): void {
    this.s.usedUsd += costUsd;
    this.s.tokensUsed += tokensIn + tokensOut;
    this.s.callsUsed += 1;
  }
}
