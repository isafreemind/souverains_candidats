import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, CircularProgress, FormControlLabel, MenuItem, Select, Switch, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Activity, ArrowDownToLine, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronRight, CircleHelp, Database, Eye, FileText, Github, LayoutDashboard, Radio, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { ACCOUNTS, dashboardSchema, type Dashboard, type Handle, type Post } from './domain/model';
import { cumulativeViewsSeries, engagement, followerSeries, publicationSeries, summarize, type Granularity } from './domain/statistics';
import { compact, dateLabel, number, percent } from './domain/format';
import MetricChart from './components/MetricChart';
import MediaAppearances from './components/MediaAppearances';
import { filterMediaEvents } from './domain/media';
import { MEDIA_DATASET } from './data/media';

function downloadCsv(posts: Post[]) {
  const fields = ['compte', 'id', 'publication_utc', 'observation_utc', 'texte', 'vues', 'aime', 'reposts', 'reponses', 'citations', 'engagement_pct', 'url'];
  // Prevent spreadsheet formula execution for user-generated text.
  const cell = (value: unknown) => `"${String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  const rows = posts.map(p => [p.handle, p.id, p.publishedAt, p.observedAt, p.text, p.metrics.views, p.metrics.likes, p.metrics.reposts, p.metrics.replies, p.metrics.quotes, engagement(p.metrics), p.url].map(cell).join(';'));
  const url = URL.createObjectURL(new Blob(['\uFEFF' + fields.join(';') + '\r\n' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'stats-souverain-tweets.csv'; a.click(); URL.revokeObjectURL(url);
}

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mediaData = MEDIA_DATASET;
  const [showMedia, setShowMedia] = useState(true);
  const [selected, setSelected] = useState<Handle[]>(ACCOUNTS.map(a => a.handle));
  const [period, setPeriod] = useState('30');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/dashboard.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(dashboardSchema.parse(await response.json()));
    } catch { setError('Les données ne peuvent pas être chargées. Vérifiez la connexion puis réessayez.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { setPage(0); }, [query, sort, period, selected]);
  const since = period === 'all' ? 0 : Date.now() - Number(period) * 86_400_000;
  const posts = useMemo(() => (data?.posts ?? []).filter(p => selected.includes(p.handle) && Date.parse(p.publishedAt) >= since), [data, selected, since]);
  const summary = summarize(posts);
  const samples = (data?.followers ?? []).filter(s => selected.includes(s.handle) && Date.parse(s.observedAt) >= since);
  const latestFollowers = ACCOUNTS.filter(a => selected.includes(a.handle)).map(a => (data?.followers ?? []).findLast(s => s.handle === a.handle));
  const followersTotal = latestFollowers.length && latestFollowers.every(Boolean) ? latestFollowers.reduce((sum, s) => sum + s!.followers, 0) : null;
  const tablePosts = [...posts].filter(p => `${p.text} ${p.handle}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a,b) => sort === 'views' ? (b.metrics.views ?? -1) - (a.metrics.views ?? -1) : sort === 'engagement' ? (engagement(b.metrics) ?? -1) - (engagement(a.metrics) ?? -1) : b.publishedAt.localeCompare(a.publishedAt));
  const stale = data?.generatedAt ? Date.now() - Date.parse(data.generatedAt) > 48 * 3_600_000 : false;
  const firstObservation = data?.followers[0]?.observedAt;
  const mediaEvents = filterMediaEvents(mediaData?.events ?? [], selected, period === 'all' ? '2006-01-01' : new Date(since).toISOString().slice(0, 10), new Date().toISOString().slice(0, 10));
  const chartEvents = showMedia ? mediaEvents : [];
  return <div className="app-shell">
    <a className="skip-link" href="#main">Aller au contenu</a>
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-mark"><BarChart3 size={23} /></span><span>observatoire<span className="brand-sub">STATS SOUVERAIN</span></span></a>
      <div className="nav-group-label">ESPACE D’ANALYSE</div>
      <nav aria-label="Navigation principale">
        <a className="nav-item active" href="#main"><LayoutDashboard size={18} />Vue d’ensemble<span className="nav-count">3</span></a>
        <a className="nav-item" href="#publications"><FileText size={18} />Les publications</a>
        <a className="nav-item" href="#passages-medias"><Radio size={18} />Passages médias</a>
        <a className="nav-item" href="#methodologie"><ShieldCheck size={18} />Méthodologie</a>
      </nav>
      <div className="nav-group-label accounts-label">COMPTES SUIVIS <span>03</span></div>
      {ACCOUNTS.map(a => <a className="sidebar-account" href={`https://fxtwitter.com/${a.handle}`} target="_blank" rel="noreferrer" key={a.handle}><span className="account-dot" style={{ background: a.color }} /><span>{a.short}<small>@{a.handle}</small></span><ArrowUpRight size={13} /></a>)}
      <div className="sidebar-bottom"><div className="source-card"><span className="source-icon"><Database size={18} /></span><strong>Des données traçables.<br />Des passages sourcés.</strong><p>Statistiques via FxTwitter.<br />Archives et sources des passages conservées.</p><a href="#methodologie">Comprendre les données <ChevronRight size={13} /></a></div><span className="sidebar-footer">OBSERVATOIRE INDÉPENDANT <span>v1.0</span></span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Espace d’analyse <ChevronRight size={13} /><strong>Vue d’ensemble</strong></div><div className="topbar-right"><span className="source-tag"><i />Statistiques : FxTwitter</span><a href="#methodologie" aria-label="Aide et méthodologie"><CircleHelp size={19} /></a><span className="user-mark">OS</span></div></header>
      <main id="main">
        <div className="page-heading"><div><div className="eyebrow">L’AUDIENCE, AU FIL DU TEMPS</div><h1>Trois comptes. Une vue d’ensemble<span>.</span></h1><p>Comparez la portée et l’engagement de leurs publications sur X / Twitter.</p></div><Button className="export-button" variant="outlined" startIcon={<ArrowDownToLine size={16} />} onClick={() => downloadCsv(posts)} disabled={!posts.length}>Exporter les tweets</Button></div>
        <div className="controls-panel"><div className="account-filters" aria-label="Comptes affichés">{ACCOUNTS.map(a => <button key={a.handle} className={`account-filter ${selected.includes(a.handle) ? 'selected' : ''}`} aria-pressed={selected.includes(a.handle)} onClick={() => setSelected(prev => prev.includes(a.handle) ? prev.filter(h => h !== a.handle) : [...prev, a.handle])}><span className="filter-avatar" style={{ color: a.color, background: `${a.color}13` }}>{a.initials}</span>{a.short}<span className="filter-check" style={{ background: selected.includes(a.handle) ? a.color : '#dbe0e9' }}><Check size={10} /></span></button>)}</div><div className="date-control"><CalendarDays size={16} /><Select value={period} onChange={e => setPeriod(e.target.value)} size="small" inputProps={{ 'aria-label': 'Période analysée' }}><MenuItem value="7">7 derniers jours</MenuItem><MenuItem value="30">30 derniers jours</MenuItem><MenuItem value="90">90 derniers jours</MenuItem><MenuItem value="all">Tout l’historique</MenuItem></Select></div></div>
        <div className="collection-status"><span><ShieldCheck size={14} />Publications originales <i />Reposts et réponses exclus</span><button onClick={() => void load()} disabled={loading}><RefreshCw size={12} className={loading ? 'spin' : ''} />{data?.generatedAt ? `Relevé du ${dateLabel(data.generatedAt)} à ${new Date(data.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris)` : 'En attente de collecte'}</button></div>
        {error && <Alert severity="error" action={<Button onClick={() => void load()}>Réessayer</Button>}>{error}</Alert>}
        {loading && !data && <div className="loading"><CircularProgress size={24} /><span>Chargement des relevés FxTwitter…</span></div>}
        {stale && <Alert severity="warning">Le dernier relevé date de plus de 48 heures. Les courbes présentent les dernières mesures disponibles.</Alert>}
        {data?.coverage.some(c => c.error || c.invalid || (!c.exhausted && !c.reachedCutoff)) && <Alert severity="info" className="coverage-alert">La collecte couvre un échantillon de publications. Consultez le détail de couverture en bas de page.</Alert>}
        {selected.length === 0 && <Alert severity="info">Sélectionnez au moins un compte pour afficher ses statistiques.</Alert>}
        <div className="kpi-grid">
          <Kpi icon={<Eye size={18} />} title="Vues par publication" value={summary.averageViews === null ? 'N/D' : compact(summary.averageViews)} foot={`${number(summary.viewsCount)} publications avec vues`} detail="Moyenne sur la période" />
          <Kpi icon={<Activity size={18} />} title="Taux d’engagement" value={percent(summary.engagement)} foot={`${number(summary.rateCount)} publications mesurables`} detail="Rapporté aux vues" />
          <Kpi icon={<Users size={18} />} title="Abonnés cumulés" value={followersTotal === null ? 'N/D' : compact(followersTotal)} foot="Somme des derniers relevés disponibles" detail="Audiences non dédupliquées" />
          <Kpi icon={<FileText size={18} />} title="Publications analysées" value={number(summary.count)} foot="Sans reposts ni réponses" detail="Sur la période sélectionnée" />
        </div>
        <div className="section-toolbar"><div><h2>Les tendances en un regard</h2><span>Les mêmes repères pour comparer les trois comptes.</span></div><ToggleButtonGroup exclusive value={granularity} size="small" onChange={(_,v: Granularity | null) => { if(v) setGranularity(v); }} aria-label="Regroupement des publications"><ToggleButton value="day">Jour</ToggleButton><ToggleButton value="week">Semaine</ToggleButton><ToggleButton value="month">Mois</ToggleButton></ToggleButtonGroup></div>
        <div className="media-controls"><FormControlLabel control={<Switch size="small" checked={showMedia} onChange={(_, checked) => setShowMedia(checked)} />} label="Afficher les passages médias" /><a href="#passages-medias">{mediaEvents.length} passage{mediaEvents.length !== 1 ? 's' : ''} documenté{mediaEvents.length !== 1 ? 's' : ''} · Lire les notes</a></div>
        <MetricChart title="Évolution de l’engagement" description="Interactions rapportées aux vues, par date de publication" badge="EN % DES VUES" data={publicationSeries(posts, granularity, 'engagement')} selected={selected} events={chartEvents} percent tall />
        <div className="cumulative-chart" style={{ marginTop: 18 }}><MetricChart title="Vues cumulées dans le temps" description="Somme progressive des vues connues, par date de publication, sur la période sélectionnée" badge={summary.viewsCount ? `${compact(summary.views)} VUES AU TOTAL` : 'VUES CUMULÉES'} data={cumulativeViewsSeries(posts, granularity)} selected={selected} events={chartEvents} tall /></div>
        <div className="observation-note"><Eye size={14} /><span>Le cumul additionne les derniers compteurs connus des tweets publiés jusqu’à chaque date. Il ne mesure pas les vues gagnées ce jour-là. Les vues indisponibles sont exclues du total.</span></div>
        <div className="two-charts"><MetricChart title="Vues par publication" description="Moyenne des compteurs cumulés, par date de publication" badge="VUES" data={publicationSeries(posts, granularity, 'averageViews')} selected={selected} events={chartEvents} /><MetricChart title="Évolution des abonnés" description="Dernier relevé observé chaque jour, sans historique estimé" badge="ABONNÉS" data={followerSeries(samples)} selected={selected} events={chartEvents} /></div>
        {firstObservation && <div className="observation-note"><Radio size={14} /><span>Le suivi des abonnés commence le {dateLabel(firstObservation, true)}. Une courbe se dessinera au fil des prochains relevés.</span></div>}
        <MediaAppearances dataset={mediaData} events={mediaEvents} selected={selected} />
        <section className="panel" id="publications"><div className="panel-heading table-heading"><div><div className="heading-with-count"><h2>Au plus près des publications</h2><span>{tablePosts.length}</span></div><p>Le détail derrière les courbes. Chaque tweet reste consultable.</p></div><div className="table-actions"><div className="search-box"><Search size={15} /><input aria-label="Rechercher une publication" placeholder="Rechercher un tweet…" value={query} onChange={e => setQuery(e.target.value)} /></div><Select size="small" value={sort} onChange={e => setSort(e.target.value)} inputProps={{ 'aria-label': 'Tri des publications' }}><MenuItem value="recent">Plus récents</MenuItem><MenuItem value="views">Plus de vues</MenuItem><MenuItem value="engagement">Plus d’engagement</MenuItem></Select></div></div>
          <div className="table-scroll"><table><thead><tr><th>PUBLICATION</th><th>DATE · UTC</th><th>VUES</th><th>ENGAGEMENT</th><th aria-label="Lien" /></tr></thead><tbody>{tablePosts.slice(page * 8, (page + 1) * 8).map(p => { const a = ACCOUNTS.find(a => a.handle === p.handle)!; return <tr key={p.id}><td><div className="tweet-cell"><span className="filter-avatar" style={{ color: a.color, background: `${a.color}12` }}>{a.initials}</span><div><strong>{a.name} <span>@{a.handle}</span></strong><p title={p.text}>{p.text}</p>{p.isQuote && <small>Publication avec citation</small>}</div></div></td><td>{dateLabel(p.publishedAt)}</td><td className="numeric">{number(p.metrics.views)}</td><td><span className="rate-pill">{percent(engagement(p.metrics))}</span></td><td><a className="tweet-link" href={p.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir le tweet de ${a.short} du ${dateLabel(p.publishedAt)}`}><ArrowUpRight size={17} /></a></td></tr>; })}</tbody></table>{!tablePosts.length && <div className="table-empty">Aucune publication pour ces filtres.</div>}</div>
          <div className="table-footer"><span>{tablePosts.length ? `${page * 8 + 1}–${Math.min((page + 1) * 8, tablePosts.length)} sur ${number(tablePosts.length)} publications` : '0 publication'}</span><div><Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button><Button size="small" disabled={(page + 1) * 8 >= tablePosts.length} onClick={() => setPage(p => p + 1)}>Suivant <ChevronRight size={13} /></Button></div></div>
        </section>
        <section className="methodology" id="methodologie"><div className="method-title"><ShieldCheck size={20} /><h2>Des chiffres, avec leur méthode.</h2></div><div className="method-grid"><div><h3>Un engagement défini</h3><p>(J’aime + reposts + réponses + citations) ÷ vues × 100. Les groupes utilisent le rapport des sommes, pondéré par les vues. Les signets et clics ne sont pas inclus.</p></div><div><h3>Un périmètre transparent</h3><p>Publications des trois auteurs, citations incluses. Reposts, réponses, suites de fils en réponse et entrées non classifiables sont exclus. Les dates des courbes de publications sont en UTC.</p></div><div><h3>Des mesures observées</h3><p>Les vues sont des compteurs cumulés au dernier relevé, pas les vues gagnées le jour indiqué. Les publications récentes ont eu moins de temps pour être vues. Les valeurs manquantes ne valent jamais zéro.</p></div><div><h3>Une mémoire des relevés</h3><p>Tweets, versions de texte, compteurs datés et réponses FxTwitter brutes sont archivés dans le projet. Les abonnés sont mesurés à partir du premier relevé, sans reconstruction du passé.</p></div></div>
          <details><summary>Voir la couverture de la dernière collecte</summary><ul>{data?.coverage.map(c => <li key={c.handle}><strong>@{c.handle}</strong> : {c.pages} pages, {c.accepted} publications retenues, {c.excluded} exclusions, {c.invalid} entrées non classifiables. {c.reachedCutoff ? 'Limite temporelle atteinte.' : c.exhausted ? 'Fin de la pagination renvoyée par FxTwitter.' : 'Pagination limitée : historique potentiellement incomplet.'} {c.error && `Erreur : ${c.error}`}</li>)}</ul><p>L’API peut renvoyer un historique incomplet. Une absence ne prouve ni une absence de publication ni une suppression. Les anciens tweets conservés peuvent avoir des relevés plus anciens que la dernière collecte.</p></details>
        </section>
        <footer className="page-footer"><span><BarChart3 size={14} />Observatoire · Stats Souverain</span><span>Données <a href="https://docs.fxembed.com/api/introduction/" target="_blank" rel="noreferrer">FxTwitter</a><span className="footer-dot">·</span>Conçu pour GitHub Pages <Github size={14} /></span></footer>
      </main>
    </div>
  </div>;
}

function Kpi({ icon, title, value, foot, detail }: { icon: React.ReactNode; title: string; value: string; foot: string; detail: string }) {
  return <section className="panel kpi"><div className="kpi-heading"><span>{title}</span><span className="kpi-icon">{icon}</span></div><strong className="kpi-value">{value}</strong><div className="kpi-detail">{detail}</div><div className="kpi-foot">{foot}</div></section>;
}
