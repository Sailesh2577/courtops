"use client";

// Court board — live status of every court. Reads the shared store, so when a
// flag is resolved (here or on "Needs you") the affected court flips live in
// place. Ported from the design handoff's board.jsx.
import { Icon } from "./Icon";
import { Pill, Avatar, Button, ViewHead } from "./ui";
import { useStore } from "@/lib/store";
import { CATS, clock, mmss, type Court, type Match } from "@/lib/data";

function Side({ names, serving }: { names: string[]; serving?: boolean }) {
  return (
    <div className={"ct-side" + (serving ? " ct-side-serve" : "")}>
      <div className="ct-avs">
        {names.map((n) => (
          <Avatar key={n} name={n} size={26} />
        ))}
      </div>
      <div className="ct-names">
        {names.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      {serving && (
        <span className="ct-serve" title="Serving">
          <Icon name="shuttle" size={14} />
        </span>
      )}
    </div>
  );
}

function Score({ games }: { games: [number, number][] }) {
  if (!games.length) return null;
  return (
    <div className="ct-score">
      {games.map((g, i) => (
        <div className={"ct-game" + (i === games.length - 1 ? " ct-game-now" : "")} key={i}>
          <span className={g[0] > g[1] ? "win" : ""}>{g[0]}</span>
          <span className={g[1] > g[0] ? "win" : ""}>{g[1]}</span>
        </div>
      ))}
    </div>
  );
}

function CourtCard({ court }: { court: Court }) {
  const matches = useStore((s) => s.matches);
  const flags = useStore((s) => s.flags);
  const resolveFlag = useStore((s) => s.resolveFlag);

  const match: Match | null = court.matchId ? matches[court.matchId] : null;
  const cat = match ? CATS[match.cat] : null;
  // the flag wired to this court (drives the idle-court quick action)
  const flag = flags.find((f) => !f.resolved && "courtId" in f.effect && f.effect.courtId === court.id);

  return (
    <div className={"court" + (court.attention ? " court-flag" : "") + " court-" + court.status}>
      <div className="court-head">
        <div className="court-id">
          <span className="court-no">{court.id}</span>
          <span className="court-name">{court.name}</span>
        </div>
        <Pill status={court.status} soft />
      </div>

      {match && match.status === "live" && cat && (
        <div className="court-body">
          <div className="court-meta">
            <span className="court-cat">{cat.long}</span>
            <span className="court-round">{match.round}</span>
          </div>
          <div className="court-match">
            <Side names={match.a} serving={match.serving === "a"} />
            <Score games={match.games} />
            <Side names={match.b} serving={match.serving === "b"} />
          </div>
          <div className="court-foot">
            <span className="court-timer">
              <Icon name="clock" size={14} />
              {mmss(match.elapsedSec)}
            </span>
            {match.overrun ? (
              <span className="court-warn">
                <Icon name="bolt" size={13} fill /> {match.overrun} min over
              </span>
            ) : (
              <span className="court-ontime">on schedule</span>
            )}
          </div>
        </div>
      )}

      {match && (match.status === "ready" || match.status === "warming") && cat && (
        <div className="court-body">
          <div className="court-meta">
            <span className="court-cat">{cat.long}</span>
            <span className="court-round">{match.round}</span>
          </div>
          <div className="court-match court-match-pre">
            <Side names={match.a} />
            <span className="ct-vs">vs</span>
            <Side names={match.b} />
          </div>
          <div className="court-foot">
            <span className="court-soft">
              {court.note || (match.status === "warming" ? "Warming up" : "Ready to start")}
            </span>
            <Button size="sm" variant="soft" icon="signal">
              Start match
            </Button>
          </div>
        </div>
      )}

      {!match && (
        <div className="court-body court-empty">
          {court.attention ? (
            <>
              <div className="court-empty-top">
                <span className="court-empty-ic court-empty-alert">
                  <Icon name="bolt" size={18} fill />
                </span>
                <span className="court-empty-note">{court.note}</span>
              </div>
              {flag && (
                <Button
                  variant="primary"
                  size="sm"
                  icon="arrow"
                  onClick={() => resolveFlag(flag.id, { sent: true, method: "auto" })}
                  full
                >
                  {flag.type === "idle_court" ? "Send ready match here" : "Call players to court"}
                </Button>
              )}
            </>
          ) : (
            <div className="court-open">
              <span className="court-empty-ic">
                <Icon name="court" size={18} />
              </span>
              <span>Open court</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BoardView() {
  const courts = useStore((s) => s.courts);
  const nowMin = useStore((s) => s.nowMin);

  const live = courts.filter((c) => c.status === "live").length;
  const idle = courts.filter((c) => c.status === "idle").length;
  const ready = courts.filter((c) => c.status === "ready" || c.status === "warming").length;
  const usage = Math.round((live / courts.length) * 100);

  return (
    <div className="view view-board">
      <ViewHead
        title="Court board"
        sub={`${courts.length} courts · ${live} live · ${ready} ready · ${idle} idle`}
        right={
          <>
            <div className="board-usage">
              <span className="board-usage-v">{usage}%</span>
              <span className="board-usage-l">court usage</span>
            </div>
            <span className="head-clock">{clock(nowMin)}</span>
          </>
        }
      />
      <div className="board-grid">
        {courts.map((c) => (
          <CourtCard key={c.id} court={c} />
        ))}
      </div>
    </div>
  );
}
