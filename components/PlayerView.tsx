"use client";

// Player phone view — "my next match" as the player sees it on their phone.
// It reads the same store as the organizer screens, so the instant Aanya is
// sent to Court 3 (from "Needs you" or the board) this screen flips to "You're
// up now" and flashes.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Avatar } from "./ui";
import { useStore } from "@/lib/store";
import {
  CATS,
  EVENT,
  PLAYER,
  clockShort,
  type Match,
  type PlayerScheduleItem,
} from "@/lib/data";

function NextMatchCard({
  match,
  nowMin,
  flash,
}: {
  match: Match;
  nowMin: number;
  flash: boolean;
}) {
  const assigned = match.status === "live" || !!match.court;
  const mins = Math.max(0, (match.planStartMin ?? nowMin) - nowMin);
  const cat = CATS[match.cat];
  return (
    <div className={"pl-hero" + (assigned ? " pl-hero-go" : "") + (flash ? " pl-flash" : "")}>
      <div className="pl-hero-band">
        {assigned ? (
          <>
            <span className="pl-hero-dot" /> You&apos;re up now
          </>
        ) : (
          <>Up next · about {mins} min</>
        )}
      </div>
      <div className="pl-hero-body">
        <div className="pl-hero-cat">
          {cat.long} · {match.round}
        </div>
        <div className="pl-hero-vs">
          <Avatar name={match.a[0]} size={34} accent />
          <span className="pl-hero-vstxt">vs</span>
          <Avatar name={match.b[0]} size={34} />
        </div>
        <div className="pl-hero-opp">
          {match.a[0]} vs {match.b[0]}
        </div>

        <div className="pl-hero-where">
          {assigned && match.court ? (
            <>
              <div className="pl-court">
                <span className="pl-court-l">COURT</span>
                <span className="pl-court-n">{match.court.replace("C", "")}</span>
              </div>
              <div className="pl-where-cta">
                <Icon name="pin" size={16} />
                <span>Head over now</span>
              </div>
            </>
          ) : (
            <>
              <div className="pl-court pl-court-tbd">
                <span className="pl-court-l">COURT</span>
                <span className="pl-court-n">—</span>
              </div>
              <div className="pl-where-soft">
                We&apos;ll ping you the moment your court is ready.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WarmRow({ active }: { active: boolean }) {
  return (
    <div className={"pl-warm" + (active ? " pl-warm-on" : "")}>
      <span className="pl-warm-ic">
        <Icon name="warm" size={17} fill />
      </span>
      <div className="pl-warm-txt">
        <b>{active ? "Warm up now" : "Warm up soon"}</b>
        <span>{active ? "Your match is on, get loose." : "Start stretching in a few minutes."}</span>
      </div>
    </div>
  );
}

function DayRow({
  item,
  matches,
}: {
  item: PlayerScheduleItem;
  matches: Record<string, Match>;
}) {
  const m = matches[item.id];
  const cat = CATS[item.cat];
  const isNext = item.state === "next";
  return (
    <div className={"pl-day-row pl-day-" + item.state}>
      <span className="pl-day-mark">
        {item.state === "done" ? (
          <Icon name="check" size={14} stroke={2.4} />
        ) : isNext ? (
          <span className="pl-day-now" />
        ) : (
          <Icon name="dot" size={8} fill />
        )}
      </span>
      <div className="pl-day-main">
        <div className="pl-day-top">
          <span className="pl-day-round">
            {cat.short} · {item.round}
          </span>
          {isNext && <span className="pl-day-badge">NEXT</span>}
        </div>
        <div className="pl-day-sub">
          {item.state === "done" && item.result}
          {isNext && (m && m.court ? `Court ${m.court.replace("C", "")} · now` : "Court TBD · soon")}
          {item.state === "upcoming" && `${item.when}${item.note ? " · " + item.note : ""}`}
        </div>
      </div>
    </div>
  );
}

export function PlayerView() {
  const matches = useStore((s) => s.matches);
  const nowMin = useStore((s) => s.nowMin);

  const match = matches[PLAYER.matchId];
  const assigned = match.status === "live" || !!match.court;

  const prev = useRef(assigned);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (assigned && !prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1400);
      prev.current = assigned;
      return () => clearTimeout(t);
    }
    prev.current = assigned;
  }, [assigned]);

  return (
    <div className="view view-player">
      <div className="view-head">
        <div>
          <h1 className="view-title">My next match</h1>
          <p className="view-sub">What the player sees on their phone. Live, no asking around.</p>
        </div>
        <div className="view-head-right">
          <span className="live-dot">
            <span className="live-dot-i" /> Synced
          </span>
        </div>
      </div>

      <div className="pl-stage">
        <div className="phone">
          <div className="phone-island" />
          <div className="phone-screen">
            <div className="phone-status">
              <span>{clockShort(nowMin)}</span>
              <span className="phone-status-r">
                <Icon name="signal" size={13} stroke={2} />
                <span className="phone-batt">
                  <i />
                </span>
              </span>
            </div>

            <div className="pl-app">
              <div className="pl-appbar">
                <div>
                  <div className="pl-event">{EVENT.name}</div>
                  <div className="pl-event-sub">
                    {EVENT.day} · {EVENT.courts} courts
                  </div>
                </div>
                <div className="pl-me">
                  <Avatar name={PLAYER.name} size={32} accent />
                  <span className="pl-seed">#{PLAYER.seed}</span>
                </div>
              </div>

              <NextMatchCard match={match} nowMin={nowMin} flash={flash} />
              <WarmRow active={assigned} />

              <div className="pl-day">
                <div className="pl-day-h">Your day</div>
                {PLAYER.schedule.map((it) => (
                  <DayRow key={it.id} item={it} matches={matches} />
                ))}
              </div>

              <div className="pl-foot">
                <Icon name="bell" size={14} />
                <span>Notifications on, we&apos;ll text before you&apos;re up.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-caption">
          <Icon name={assigned ? "check" : "sparkle"} size={15} fill={assigned} />
          <span>
            {assigned
              ? "Aanya's phone updated the instant you sent her to Court 3."
              : "Clear the “Court 3 open” flag and watch this screen update live."}
          </span>
        </div>
      </div>
    </div>
  );
}
