"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, Clipboard, Compass, Heart, LayoutGrid, Leaf, LoaderCircle, MapPin, Music2, Plus, RefreshCw, Scale, Sparkles, Users, X } from "lucide-react";
import { SwarmTimeline } from "@hackathon/ui";
import { demoFavorites } from "@/lib/demo";
import type { Candidate, EventView, Favorite, Plan } from "@/lib/types";
import styles from "./quorum.module.css";

const percent = (n: number) => Math.round(n * 100);
type InviteInfo = { id: string; name: string; city: string; date: string; mode: "demo" | "live"; count: number; event?: EventView };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  let data;
  try { data = await response.json(); } catch { throw new Error("The server returned an unreadable response. Please retry."); }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data as T;
}
const colors = ["#e7dffe", "#e0ead6", "#f7dfcc", "#dce5fa", "#f0ddea", "#d8efed", "#faebc9", "#e9dbe6"];

export default function QuorumApp({ invite }: { invite?: string }) {
  const [event, setEvent] = useState<EventView | null>(null);
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("artist");
  const [results, setResults] = useState<Favorite[]>(demoFavorites);
  const [selected, setSelected] = useState<Favorite[]>([]);
  const [replay, setReplay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [syncError, setSyncError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      setLoading(true);
      try {
        if (invite) {
          const data = await api<InviteInfo>(`/api/join/${encodeURIComponent(invite)}`, { signal: controller.signal });
          if (!controller.signal.aborted) { setInfo(data); setEvent(data.event ?? null); }
        } else {
          let id: string | null = null;
          try { id = window.localStorage.getItem("quorum-event"); } catch { /* Cookies still provide access when storage is unavailable. */ }
          if (id) {
            const data = await api<EventView>(`/api/events/${encodeURIComponent(id)}`, { signal: controller.signal });
            if (!controller.signal.aborted) setEvent(data);
          }
        }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Your saved event could not be restored."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void restore();
    return () => controller.abort();
  }, [invite]);
  useEffect(() => {
    if (!event || busy || editing) return;
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try { const updated = await api<EventView>(`/api/events/${event!.id}`, { signal: controller.signal }); if (!controller.signal.aborted) { setEvent(updated); setSyncError(""); } }
      catch { if (!controller.signal.aborted) setSyncError("Live refresh is paused. Your view may be out of date; use Refresh to retry."); }
      finally { inFlight = false; }
    }
    const timer = setInterval(() => void refresh(), 4000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [event?.id, busy, editing]);
  useEffect(() => {
    const element = dialog.current;
    if (!modal || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, [modal]);
  useEffect(() => {
    if (replay === null || !event?.plan) return;
    if (replay >= event.plan.steps.length) { setReplay(null); return; }
    const timer = setTimeout(() => setReplay(replay + 1), 500);
    return () => clearTimeout(timer);
  }, [replay, event?.plan]);
  useEffect(() => {
    if (!info) return;
    setSearchError("");
    setSearching(false);
    if (info.mode === "demo") { setResults(demoFavorites.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))); return; }
    if (search.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    setResults([]);
    setSearching(true);
    const timer = setTimeout(() => api<{ results: Favorite[] }>(`/api/search?mode=live&type=${searchType}&q=${encodeURIComponent(search)}&invite=${encodeURIComponent(invite!)}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setResults(data.results); }).catch(e => { if (!controller.signal.aborted) setSearchError(e.message); }).finally(() => { if (!controller.signal.aborted) setSearching(false); }), 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, searchType, info, invite]);

  async function action(name: string, work: () => Promise<void>) { setBusy(name); setError(""); setNotice(""); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(""); } }
  function remember(data: EventView) { setEvent(data); setTab("overview"); setReplay(null); try { window.localStorage.setItem("quorum-event", data.id); } catch { setNotice("Your event is saved on the server. Browser storage is unavailable; keep its link open."); } setModal(false); }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fields = new FormData(e.currentTarget);
    await action("create", async () => remember(await api<EventView>("/api/events", { method: "POST", body: JSON.stringify({ name: fields.get("name"), city: fields.get("city"), budget: Number(fields.get("budget")), date: fields.get("date"), type: fields.get("type"), mode: fields.get("mode") }) })));
  }
  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fields = new FormData(e.currentTarget);
    await action("join", async () => { remember(await api<EventView>(`/api/join/${encodeURIComponent(invite!)}`, { method: "POST", body: JSON.stringify({ name: fields.get("name"), favorites: selected }) })); setEditing(false); });
  }
  async function editTaste() {
    await action("edit", async () => {
      const data = await api<InviteInfo>(`/api/join/${encodeURIComponent(invite!)}`);
      const self = data.event?.attendees.find(a => a.id === data.event?.selfId);
      if (!self) throw new Error("Your attendee session expired. Reopen the invitation to join again.");
      setInfo(data); setSelected(self.favorites); setEditing(true); setSearch("");
    });
  }
  async function copyInvite() {
    if (!event?.joinPath) return;
    const url = `${window.location.origin}${event.joinPath}`;
    try { await navigator.clipboard.writeText(url); setNotice("Private invite link copied. Open it in another browser to join as an attendee."); }
    catch { setNotice(`Private invite: ${url}`); }
  }
  const plan = event?.plan;
  const picks = plan?.picks.map(id => plan.candidates.find(c => c.id === id)!).filter(Boolean) ?? [];
  const nav = [{ id: "overview", label: "Your plan", icon: LayoutGrid }, { id: "group", label: "The group", icon: Users }, { id: "fairness", label: "Happiness matrix", icon: Scale }, { id: "timeline", label: "Swarm timeline", icon: Sparkles }];

  return <div className={styles.app}>
    <aside className={styles.sidebar}>
      <a href="/" className={styles.logo}><span className={styles.logoMark}>q</span>quorum<span className={styles.logoDot}>.</span></a>
      <div className={styles.workspace}><span className={styles.workspaceIcon}>Q</span><div><strong>Your workspace</strong><small>Good plans, together</small></div></div>
      <p className={styles.navLabel}>MAKE ROOM FOR EVERYONE</p>
      <nav>{nav.map(item => <button key={item.id} className={`${styles.navButton} ${tab === item.id ? styles.activeNav : ""}`} aria-pressed={tab === item.id} title={item.label} onClick={() => setTab(item.id)}><item.icon size={18} />{item.label}{item.id === "group" && event && <span>{event.attendees.length}</span>}</button>)}</nav>
      <button className={styles.newEvent} onClick={() => setModal(true)}><Plus size={17} /> Create an event</button>
      <div className={styles.sideNote}><div className={styles.noteIcon}><Heart size={21} /></div><strong>Less compromise.<br />More common ground.</strong><p>Everyone gets a voice in where the group goes next.</p><span>Built with cultural intelligence <ArrowUpRight size={13} /></span></div>
      <div className={styles.profile}><span>AK</span><div><strong>Local workspace</strong><small>Private prototype</small></div><Leaf size={16} /></div>
    </aside>
    <main className={styles.main}>
      <header className={styles.topbar}><span>Workspace <ChevronRight size={13} /> {tab === "overview" ? "Your plan" : nav.find(n => n.id === tab)?.label}</span><span className={styles.demoBadge}><i />{event?.mode === "live" ? "Live Qloo · unverified integration" : "Synthetic demo"}</span></header>
      <div className={styles.content}>
        {error && <div className={styles.error} role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
        {notice && <div className={styles.notice} role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={16} /></button></div>}

        {loading ? <div className={styles.empty} role="status"><LoaderCircle className={styles.spin} size={26} /><h2>Opening your workspace…</h2></div> : info && (!event || editing) ? <>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>YOU'RE INVITED</p><h1>A little taste of you.</h1><p>{editing ? "Update your taste for" : "Join"} {info.name} in {info.city}. No account needed.</p></div><span className={styles.headerIllustration}><Users size={38} /></span></div>
          <form className={styles.joinCard} onSubmit={join}><div><span className={styles.stepLabel}>01 / INTRODUCE YOURSELF</span><h2>What should we call you?</h2><label className={styles.srOnly} htmlFor="attendee-name">Your name</label><input id="attendee-name" name="name" autoComplete="given-name" defaultValue={editing ? event?.attendees.find(a => a.id === event.selfId)?.name : ""} required minLength={1} maxLength={40} placeholder="Your first name" /></div><div><span className={styles.stepLabel}>02 / SHARE YOUR TASTE</span><h2>Pick 3–5 things you love.</h2><p>{info.mode === "demo" ? "These fictional favorites are hand-authored examples. Your choices map to a synthetic taste profile." : "Search Qloo for artists, films, books and brands. Your name is never sent to Qloo."}</p><p className={styles.privacyNote}>Your name, selected favorites, and affinity scores are visible to this event’s group. Choose only tastes you want to share.</p><div className={styles.searchRow}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists, films, books…" aria-label="Search favorites" />{info.mode === "live" && <select value={searchType} onChange={e => setSearchType(e.target.value)} aria-label="Favorite type"><option value="artist">Artists</option><option value="movie">Movies</option><option value="book">Books</option><option value="brand">Brands</option></select>}</div><div className={styles.selectedList} aria-label="Selected favorites">{selected.map(f => <button type="button" key={f.id} onClick={() => setSelected(selected.filter(s => s.id !== f.id))} aria-label={`Remove ${f.name}`}>{f.name}<X size={12} /></button>)}</div>{searching && <p role="status">Searching Qloo…</p>}{searchError && <p role="alert" className={styles.inlineError}>{searchError}</p>}{!searching && !searchError && !results.length && <p role="status">{info.mode === "live" && search.length < 2 ? "Type at least two characters to search." : "No favorites found. Try another search."}</p>}<div className={styles.favoriteGrid}>{results.map(f => { const active = selected.some(s => s.id === f.id); return <button type="button" key={f.id} className={active ? styles.favoriteSelected : styles.favorite} aria-pressed={active} disabled={(!active && selected.length >= 5) || Boolean(busy)} onClick={() => setSelected(active ? selected.filter(s => s.id !== f.id) : selected.length < 5 ? [...selected, f] : selected)}><span>{f.type === "artist" ? "♫" : f.type === "movie" ? "◒" : "✳"}</span><strong>{f.name}</strong><small>{f.type}</small>{active && <Check size={16} />}</button>; })}</div><p aria-live="polite">{selected.length} of 5 selected · minimum 3</p></div><button className={styles.primary} disabled={selected.length < 3 || Boolean(busy)}>{busy === "join" ? <LoaderCircle className={styles.spin} size={18} /> : <Heart size={18} />} {editing ? "Save my taste" : "Add my voice"}</button>{editing && <button type="button" className={styles.secondary} onClick={() => setEditing(false)} disabled={Boolean(busy)}>Cancel changes</button>}</form>
        </> : invite && !event ? <div className={styles.empty}><Users size={28} /><h2>This invitation could not be opened.</h2><p>Check the private link with your organizer, or refresh this page to retry.</p><a href="/" className={styles.inviteLink}>Go to your workspace</a></div> : !event ? <>
          <div className={`${styles.pageHeading} ${styles.heroDark}`}><div><p className={styles.eyebrow}>QUORUM · A BETTER WAY TO GET TOGETHER</p><h1>Great plans.<br />Everyone included<span>.</span></h1><p>Give every taste a seat at the table. Quorum scores real Qloo taste affinity,<br className={styles.desktop} /> runs a transparent maximin fairness rule, and can add optional LLM narration—no fake bookings.</p><div className={styles.heroActions}><button className={styles.primary} disabled={Boolean(busy)} onClick={() => action("demo", async () => remember(await api<EventView>("/api/demo", { method: "POST" })))}>{busy === "demo" ? <LoaderCircle size={18} className={styles.spin} /> : <Sparkles size={18} />} Try the working demo <ArrowRight size={17} /></button><button className={styles.secondary} onClick={() => setModal(true)}>Plan something new <Plus size={17} /></button></div><div className={styles.heroProof}><div className={styles.avatars}>{["M", "L", "N", "S"].map((a, i) => <span key={a} style={{ background: colors[i] }}>{a}</span>)}</div><span>Four different tastes. One really good evening.</span></div></div><div className={styles.orbit}><div className={styles.orbitRing} /><div className={styles.orbitCenter}><Sparkles size={26} /><strong>Common<br />ground.</strong><span>A plan for all of us</span></div><div className={`${styles.floating} ${styles.floatA}`}><span style={{ background: colors[0] }}>M</span><div><strong>Maya's taste</strong><small>Creative & curious</small></div><Heart size={14} /></div><div className={`${styles.floating} ${styles.floatB}`}><span style={{ background: colors[1] }}>L</span><div><strong>Leo's taste</strong><small>A little adventure</small></div><Music2 size={14} /></div><div className={`${styles.floating} ${styles.floatC}`}><span style={{ background: colors[2] }}>N</span><div><strong>Nina's taste</strong><small>Slow moments</small></div><Leaf size={14} /></div><div className={styles.orbitLabel}><Check size={13} /> EVERY VOICE COUNTS</div></div></div>
          <div className={styles.sectionTitle}><h2>From “what should we do?” to “let's go.”</h2><span>One shared plan. Three simple steps.</span></div>
          <div className={styles.howGrid}>{[{ icon: Users, title: "Bring your people", detail: "Create an event and share a private invite. Friends join without an account." }, { icon: Heart, title: "Let taste do the talking", detail: "A few Qloo favorites become signals for dining, activity, and playlist candidates." }, { icon: Scale, title: "Find your common ground", detail: "Compare complete plans and maximize the lowest personal mean affinity—not a happiness survey." }].map((item, i) => <div className={styles.howCard} key={item.title}><span className={styles.cardNumber}>0{i + 1}</span><span className={styles.howIcon}><item.icon size={23} /></span><h3>{item.title}</h3><p>{item.detail}</p></div>)}</div>
          <div className={styles.honesty}><Compass size={21} /><div><strong>Demo is synthetic; live mode calls Qloo on the server.</strong><p>The demo uses fictional entities and hand-authored affinities. Live mode needs <code>QLOO_API_KEY</code>, <code>QUORUM_ENABLE_LIVE=true</code>, and the hackathon base URL. Missing affinity fields are skipped instead of inventing scores.</p></div><span>TRANSPARENCY FIRST</span></div>
        </> : <>
          <div className={styles.pageHeading}><div><p className={styles.eyebrow}>YOUR NEXT GOOD MEMORY</p><h1>{event.name}<span>.</span></h1><div className={styles.eventMeta}><span><MapPin size={15} />{event.city}</span><span><CalendarDays size={15} />{event.date}</span><span><Users size={15} />{event.attendees.length} people</span><span>${event.budget} / person brief</span></div></div><div className={styles.headingActions}>{event.role === "attendee" && invite && <button className={styles.secondary} disabled={Boolean(busy)} onClick={editTaste}><Heart size={16} /> Edit my taste</button>}<button className={styles.secondary} disabled={Boolean(busy)} onClick={() => action("refresh", async () => setEvent(await api<EventView>(`/api/events/${event.id}`)))} aria-label="Refresh event"><RefreshCw size={17} /></button>{event.role === "organizer" && <button className={styles.secondary} onClick={copyInvite}><Clipboard size={16} /> Invite your people</button>}</div></div>
          {syncError && <div className={styles.notice} role="status">{syncError}</div>}<div className={styles.modeNote}><span><i />{event.mode === "demo" ? "HAND-AUTHORED SYNTHETIC EVIDENCE" : "LIVE QLOO EVIDENCE"}</span><p>{event.mode === "demo" ? "Fictional places and demo affinities. These are not Qloo predictions or bookable venues." : "Affinity is aggregate taste evidence, not a promise of an individual's happiness. Verify costs and availability."}</p></div>
          {(tab === "overview" || tab === "group") && <section className={styles.groupStrip}><div><span className={styles.stepLabel}>THE PEOPLE BEHIND THE PLAN</span><h2>Different tastes. Equal say.</h2></div><div className={styles.people}>{event.attendees.map((a, i) => <div key={a.id} className={styles.person}><span style={{ background: colors[i] }}>{a.name.slice(0, 1).toUpperCase()}</span><strong>{a.name}</strong><small>{a.favorites.length} favorites</small></div>)}{!event.attendees.length && <p>Your people haven't joined yet. Share the private invite to get started.</p>}{event.role === "organizer" && <button className={styles.addPerson} onClick={copyInvite} aria-label="Copy invite link"><Plus size={22} /></button>}</div></section>}
          {tab === "group" && <div className={styles.memberGrid}>{event.attendees.map((a, i) => <article className={styles.memberCard} key={a.id}><span className={styles.memberAvatar} style={{ background: colors[i] }}>{a.name[0]}</span><h3>{a.name}'s taste</h3><p>A voice in every decision.</p>{a.favorites.map(f => <div className={styles.favoriteLine} key={f.id}><Heart size={14} /><span>{f.name}</span><small>{f.type}</small></div>)}</article>)}</div>}
          {(tab === "overview" || tab === "fairness") && plan && <div className={styles.metrics}><div><span className={styles.metricIcon}><Heart size={19} /></span><div><small>Lowest mean taste fit</small><strong>{percent(plan.minimum)}<em>/ 100</em></strong></div><span className={styles.metricPill}>Everyone counts</span></div><div><span className={styles.metricIcon}><Users size={19} /></span><div><small>Group average</small><strong>{percent(plan.average)}<em>/ 100</em></strong></div></div><div><span className={styles.metricIcon}><Scale size={19} /></span><div><small>Vs. average-first plan</small><strong>+{percent(Math.max(0, plan.minimum - plan.baselineMinimum))}<em>points for the minimum</em></strong></div></div></div>}
          {(tab === "overview" || tab === "fairness") && plan && <ImpactPanel plan={plan} names={Object.fromEntries(event.attendees.map(a => [a.id, a.name]))} />}
          {tab === "overview" && <>
            <div className={styles.sectionTitle}><div><span className={styles.stepLabel}>THE COMMON GROUND</span><h2>{plan ? "An evening with a little bit of everyone." : "Your next plan starts with the group."}</h2></div>{event.role === "organizer" && <button className={styles.primary} disabled={Boolean(busy) || !event.attendees.length} onClick={() => action("plan", async () => { const updated = await api<EventView>(`/api/events/${event.id}/plan`, { method: "POST" }); setEvent(updated); setReplay(0); })}>{busy === "plan" ? <LoaderCircle size={17} className={styles.spin} /> : <Sparkles size={17} />}{busy === "plan" ? "Negotiating…" : plan ? "Negotiate again" : "Find our common ground"}</button>}</div>
            {!plan ? <div className={styles.empty}><Sparkles size={35} /><h3>{event.attendees.length ? "Ready when your group is." : "Make room at the table."}</h3><p>{event.role === "organizer" ? "Invite your people, collect three favorites each, then let the taste agents compare the possibilities." : "Your taste is saved. The organizer can now generate a plan for the group. This view refreshes automatically."}</p>{event.joinPath && <a className={styles.inviteLink} href={event.joinPath} target="_blank" rel="noreferrer">Open attendee invite <ArrowUpRight size={15} /></a>}</div> : <div className={styles.picksGrid}>{picks.map((pick, i) => <PickCard key={pick.id} pick={pick} index={i} />)}</div>}
            {plan && <div className={styles.nextRow}><div><Scale size={24} /><div><h3>Fairness you can see.</h3><p>We compared {plan.combinations} complete plans. Explore the evidence behind every pick.</p></div></div><button className={styles.secondary} onClick={() => setTab("fairness")}>See the happiness matrix <ArrowRight size={16} /></button></div>}
          </>}
          {tab === "fairness" && (plan ? <><div className={styles.sectionTitle}><div><span className={styles.stepLabel}>NO TASTE LEFT BEHIND</span><h2>The happiness matrix</h2></div><span className={styles.smallText}>{event.mode === "demo" ? "Synthetic affinity" : "Qloo affinity"} · higher is a closer fit</span></div><div className={styles.matrixWrap}><table className={styles.matrix}><caption className={styles.srOnly}>{event.mode === "demo" ? "Synthetic" : "Qloo"} affinity scores from 0 to 100 for every attendee and selected pick.</caption><thead><tr><th scope="col">Every voice</th>{picks.map(p => <th scope="col" key={p.id}>{p.name}<small>{p.category}</small></th>)}<th scope="col">Personal mean</th></tr></thead><tbody>{event.attendees.map((a, i) => <tr key={a.id}><th scope="row"><span style={{ background: colors[i] }}>{a.name[0]}</span>{a.name}</th>{picks.map(p => <td key={p.id}><span style={{ background: `rgba(132, 108, 188, ${.09 + p.scores[a.id] * .23})` }}>{percent(p.scores[a.id])}</span></td>)}<td><strong>{percent(plan.happiness[a.id])}</strong></td></tr>)}</tbody></table></div><div className={styles.fairnessExplain}><Scale size={26} /><div><h3>The fairest complete plan, by a transparent rule.</h3><p>For each plan, we average each attendee's scores across its picks. We choose the plan with the highest minimum personal average. Equal minima use Borda points: each person's within-category ranking gets an equal vote. A stable ID order resolves any final tie.</p><p>The comparison plan maximizes group average. It achieves a minimum of {percent(plan.baselineMinimum)}; this plan achieves {percent(plan.minimum)}. These scores describe taste evidence, not measured happiness.</p></div></div></> : <EmptyPlan />)}
          {tab === "timeline" && (plan ? <><div className={styles.sectionTitle}><div><span className={styles.stepLabel}>A DECISION WITH A PAPER TRAIL</span><h2>Watch the group find its way.</h2></div><button className={styles.secondary} onClick={() => setReplay(0)} disabled={replay !== null}><RefreshCw size={16} /> Replay saved trace</button></div><p className={styles.smallText}>Historical trace from {new Date(plan.createdAt).toLocaleString()}. Replay shows saved steps only. Templates are deterministic; set <code>QUORUM_ENABLE_LLM=true</code> for optional LLM-written objections.</p><div className={styles.timeline}><SwarmTimeline title="Swarm timeline" steps={plan.steps.slice(0, replay ?? plan.steps.length).map(s => ({ id: `${plan.id}-${s.seq}`, seq: s.seq, name: s.agent, detail: s.detail, status: s.status === "complete" ? "completed" as const : "failed" as const }))} /></div></> : <EmptyPlan />)}
          <footer className={styles.footer}><span><Leaf size={14} /> Thoughtful plans. Transparent decisions.</span><span>{event.integration.status}</span></footer>
        </>}
      </div>
    </main>
    {modal && <dialog ref={dialog} className={styles.overlay} aria-labelledby="create-title" onCancel={e => { e.preventDefault(); if (!busy) setModal(false); }} onClick={e => { if (e.target === e.currentTarget && !busy) setModal(false); }}><section className={styles.modal}><button className={styles.closeModal} aria-label="Close create event" disabled={Boolean(busy)} onClick={() => setModal(false)}><X size={20} /></button><span className={styles.stepLabel}>GOOD THINGS START HERE</span><h2 id="create-title">Bring your people together.</h2><p>Create a local event. You'll get a private link to share.</p>{error && <div className={styles.error} role="alert">{error}</div>}<form onSubmit={create}><label>Event name<input autoFocus required name="name" minLength={2} maxLength={80} placeholder="Our next good evening" /></label><div className={styles.formRow}><label>City<input required name="city" minLength={2} maxLength={80} placeholder="Where are we meeting?" /></label><label>Event date<input required type="date" name="date" /></label></div><div className={styles.formRow}><label>Per-person budget brief ($)<input required type="number" name="budget" min={0} max={10000} defaultValue={50} /></label><label>What are we planning?<select name="type"><option value="social">Group social</option><option value="dinner">Dinner together</option><option value="trip">Weekend trip</option></select></label></div><label>Evidence source<select name="mode"><option value="demo">Synthetic demo · fictional sample data</option><option value="live">Live Qloo · requires server configuration</option></select></label><p className={styles.formHint}>Budget is a brief—not verified pricing. Local dev uses signed organizer cookies; hosted deploys use <a href="/auth/sign-in">Neon Auth</a> for organizers and signed cookies for attendees.</p><button disabled={Boolean(busy)} className={styles.primary}>{busy === "create" ? <LoaderCircle size={17} className={styles.spin} /> : <Plus size={17} />} Create private event <ArrowRight size={16} /></button></form></section></dialog>}
  </div>;
}
function EmptyPlan() { return <div className={styles.empty}><Sparkles size={30} /><h3>A little more taste first.</h3><p>Generate a plan from “Your plan” to see the group's evidence here.</p></div>; }
function PickCard({ pick, index }: { pick: Candidate; index: number }) {
  const icon = pick.category === "playlist" ? <Music2 size={35} /> : pick.category === "activity" ? <Sparkles size={35} /> : pick.category === "destination" ? <MapPin size={35} /> : <Leaf size={35} />;
  const minimum = Math.min(...Object.values(pick.scores));
  return <article className={styles.pickCard}><div className={`${styles.pickVisual} ${styles[`visual${index % 4}`]}`}><span className={styles.pickCategory}>{pick.category === "dining" ? `DINING PICK ${index + 1}` : pick.category.toUpperCase()}</span><div className={styles.visualArt}>{icon}<i /><i /><i /></div><span className={styles.syntheticLabel}>{pick.source === "synthetic" ? "FICTIONAL DEMO PICK" : "QLOO ENTITY"}</span></div><div className={styles.pickBody}><div className={styles.pickTitle}><h3>{pick.name}</h3><ArrowUpRight size={18} /></div><p>{pick.description}</p><div className={styles.tags}>{pick.tags.map(t => <span key={t}>{t}</span>)}</div><div className={styles.pickFit}><Heart size={14} /><span>Lowest individual fit</span><strong>{percent(minimum)}<small>/100</small></strong></div></div></article>;
}

function ImpactPanel({ plan, names }: { plan: Plan; names: Record<string, string> }) {
  const lift = percent(plan.minimum) - percent(plan.baselineMinimum);
  const base = plan.baselineHappiness ?? {};
  const helped = Object.keys(plan.happiness).filter(id => base[id] !== undefined && plan.happiness[id] > base[id] + 1e-9);
  const worst = Object.entries(plan.happiness).sort((a, b) => a[1] - b[1])[0];
  const cells = [
    { k: "Least-happy person", v: `${percent(plan.baselineMinimum)} → ${percent(plan.minimum)}`, d: lift > 0 ? `+${lift} pts vs a popularity vote` : "Popularity vote already fair here" },
    { k: "Group average", v: plan.baselineAverage !== undefined ? `${percent(plan.average)} vs ${percent(plan.baselineAverage)}` : `${percent(plan.average)}`, d: "Cost of fairness to the average, shown honestly" },
    { k: "Jain fairness index", v: plan.jainIndex !== undefined ? plan.jainIndex.toFixed(3) : "—", d: plan.baselineJainIndex !== undefined ? `Popularity plan: ${plan.baselineJainIndex.toFixed(3)} (1.000 = perfectly even)` : "1.000 = perfectly even" },
    { k: "Plans compared", v: String(plan.combinations), d: "Every complete combination, not a sample" },
    { k: plan.mode === "live" ? "Qloo requests" : "Evidence", v: plan.qlooCalls ? `${plan.qlooCalls.live + plan.qlooCalls.cached}` : plan.mode === "live" ? "live" : "synthetic", d: plan.qlooCalls ? `${plan.qlooCalls.live} live · ${plan.qlooCalls.cached} cached in Neon` : "Demo mode makes no Qloo calls" },
  ];
  return <section aria-labelledby="impact-title" style={{ margin: "24px 0", padding: 24, borderRadius: 4, background: "#1c1710", color: "#f6ecdc", border: "1px solid #e0a04a55" }}>
    <span style={{ letterSpacing: ".14em", fontSize: 12, color: "#e0a04a" }}>MEASURED IMPACT · THIS PLAN</span>
    <h2 id="impact-title" style={{ margin: "6px 0 16px" }}>{lift > 0 ? `The quietest voice got ${lift} points happier.` : "Everyone already agreed. No one was overruled."}</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>{cells.map(c => <div key={c.k} style={{ background: "#ffffff0d", padding: 14, borderRadius: 4 }}><small style={{ opacity: .7 }}>{c.k}</small><strong style={{ display: "block", fontSize: 26, color: "#f3c27a" }}>{c.v}</strong><small style={{ opacity: .75 }}>{c.d}</small></div>)}</div>
    <p style={{ marginTop: 14, fontSize: 14, opacity: .8 }}>{helped.length ? `Better off than under a popularity vote: ${helped.map(id => names[id] ?? "attendee").join(", ")}. ` : ""}{worst ? `Lowest fit now: ${names[worst[0]] ?? "attendee"} at ${percent(worst[1])}. ` : ""}All numbers are computed live from {plan.mode === "live" ? "Qloo affinity scores" : "synthetic demo scores"} for this plan; the baseline is the plan with the highest group average.</p>
  </section>;
}
