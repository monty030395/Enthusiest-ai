import { ImageResponse } from "next/og";
import { computeCharacterScore } from "../../_lib/analysis";
import { getShared } from "../../_lib/shareStore";

export const alt = "Motormind check";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens, restated here because the OG renderer has no Tailwind.
// Satori rules: every element with more than one child needs an explicit
// display, and `{a} {b}` counts as three children — keep text nodes single.
const CARBON = "#0b0b0c";
const CARD = "#121214";
const INK = "#f4f2ed";
const INK_MUTED = "#a39f96";
const INK_FAINT = "#6e6a63";
const EMBER = "#e89a2b";
const LINE = "rgba(255,255,255,0.10)";

const root: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  background: CARBON,
  padding: 64,
  borderTop: `6px solid ${EMBER}`,
};

const row: React.CSSProperties = { display: "flex", alignItems: "center" };
const col: React.CSSProperties = { display: "flex", flexDirection: "column" };

function scoreColour(score: number | null): string {
  if (score === null) return INK_FAINT;
  if (score >= 7) return "#93dbad";
  if (score >= 5) return "#ffc96b";
  return "#ff9d8a";
}

function Wordmark() {
  return (
    <div style={{ ...row, gap: 14 }}>
      <div style={{ ...row, fontSize: 30, fontWeight: 800 }}>
        <span style={{ color: INK }}>MOTOR</span>
        <span style={{ color: EMBER }}>MIND</span>
      </div>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)" }} />
      <div style={{ fontSize: 17, color: INK_FAINT, letterSpacing: 4 }}>NZ CAR COPILOT</div>
    </div>
  );
}

function ScoreBlock({ label, score }: { label: string; score: number | null }) {
  return (
    <div style={{ ...col, gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", color: scoreColour(score) }}>
        <span style={{ fontSize: 58, fontWeight: 800 }}>{score ?? "?"}</span>
        <span style={{ fontSize: 24, color: INK_FAINT }}>/10</span>
      </div>
      <div style={{ fontSize: 17, color: INK_FAINT, letterSpacing: 3 }}>{label.toUpperCase()}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const payload = await getShared((await params).id);

  if (!payload) {
    return new ImageResponse(
      (
        <div style={root}>
          <Wordmark />
          <div style={{ fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.1 }}>
            Is this car worth your money?
          </div>
          <div style={{ fontSize: 26, color: INK_MUTED }}>www.motormind.nz</div>
        </div>
      ),
      size
    );
  }

  if (payload.kind === "check") {
    const a = payload.analysis;
    const v = a.vehicle;
    const strap = [v.year, v.importStatus, v.location].filter(Boolean).join("  ·  ").toUpperCase();
    return new ImageResponse(
      (
        <div style={root}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Wordmark />
            {v.price ? (
              <div style={{ ...col, alignItems: "flex-end", background: EMBER, borderRadius: 10, padding: "10px 20px" }}>
                <span style={{ fontSize: 15, color: "rgba(11,11,12,0.65)", letterSpacing: 3 }}>ASKING</span>
                <span style={{ fontSize: 38, fontWeight: 800, color: CARBON }}>{v.price}</span>
              </div>
            ) : null}
          </div>

          <div style={{ ...col, gap: 18 }}>
            <div style={{ fontSize: 22, color: INK_FAINT, letterSpacing: 5 }}>{strap}</div>
            <div style={{ fontSize: 76, fontWeight: 800, color: INK, lineHeight: 1.05 }}>
              {`${v.make} ${v.model}`}
            </div>
            {a.label ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  border: `1px solid ${EMBER}`,
                  color: EMBER,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 20,
                  letterSpacing: 4,
                }}
              >
                {a.label.toUpperCase()}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 72, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "26px 40px" }}>
            <ScoreBlock label="Investment" score={a.investmentScore ?? null} />
            <ScoreBlock label="Character" score={computeCharacterScore(a)} />
            <ScoreBlock label="Street Cred" score={a.vibeScore ?? null} />
          </div>
        </div>
      ),
      size
    );
  }

  // Tally card
  const { a, b, h2h } = payload;
  const winner = h2h ? (h2h.winner === "a" ? a : b) : null;

  const side = (x: typeof a, dimmed: boolean) => (
    <div style={{ ...col, gap: 10, flex: 1 }}>
      <div style={{ fontSize: 20, color: INK_FAINT, letterSpacing: 4 }}>{x.vehicle.year}</div>
      <div style={{ fontSize: 44, fontWeight: 800, color: dimmed ? INK_MUTED : INK, lineHeight: 1.1 }}>
        {`${x.vehicle.make} ${x.vehicle.model}`}
      </div>
      {x.vehicle.price ? <div style={{ fontSize: 26, color: EMBER }}>{x.vehicle.price}</div> : null}
    </div>
  );

  return new ImageResponse(
    (
      <div style={root}>
        <Wordmark />
        <div style={{ ...row, gap: 36 }}>
          {side(a, Boolean(winner) && winner !== a)}
          <div style={{ fontSize: 40, fontWeight: 800, color: EMBER }}>V</div>
          {side(b, Boolean(winner) && winner !== b)}
        </div>
        <div style={{ ...col, gap: 8, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "24px 32px" }}>
          <div style={{ fontSize: 19, color: INK_FAINT, letterSpacing: 4 }}>
            {h2h ? "THE HEAD-TO-HEAD CALLS IT" : "THE TALLY"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: INK }}>
            {winner ? `${winner.vehicle.make} ${winner.vehicle.model}` : "Two cars, ten rows, one winner."}
          </div>
        </div>
      </div>
    ),
    size
  );
}
