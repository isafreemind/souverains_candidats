import { useState } from 'react';
import { MenuItem, Select } from '@mui/material';
import { ACCOUNTS, type FollowerSample, type Handle, type Post } from '../domain/model';
import type { Granularity } from '../domain/statistics';
import { advancedSeries, compareMediaWindows, concentration, interactionBreakdown, weeklyFollowerGrowth } from '../domain/advanced-statistics';
import { compact, dateLabel, number, percent } from '../domain/format';
import { MEDIA_OUTLETS, type NumberedMediaEvent } from '../domain/media';
import MetricChart from './MetricChart';

const interactionLabels = { likes: 'J’aime', reposts: 'Reposts', replies: 'Réponses', quotes: 'Citations' };
const interactionColors = ['#5068de', '#159581', '#d88a36', '#a268bf'];

export default function AdvancedStatistics({ posts, allPosts, samples, since, selected, granularity, events, showMedia, availableUntil }: {
  posts: Post[]; allPosts: Post[]; samples: FollowerSample[]; since: number; selected: Handle[]; granularity: Granularity;
  events: NumberedMediaEvent[]; showMedia: boolean; availableUntil: string;
}) {
  const [growthMetric, setGrowthMetric] = useState<'gain' | 'percent'>('gain');
  const markers = showMedia ? events : [];
  const accounts = ACCOUNTS.filter(a => selected.includes(a.handle));
  return <section id="analyses-complementaires" className="advanced-statistics" aria-label="Analyses complémentaires">
    <div className="section-toolbar"><div><h2>Comprendre la portée des publications</h2><span>Audience habituelle, activité et poids des succès ponctuels.</span></div></div>
    <div className="two-charts">
      <MetricChart title="Vues médianes par publication" description="La moitié des tweets mesurés se situe sous cette valeur, l’autre moitié au-dessus" badge="MÉDIANE" data={advancedSeries(posts, granularity, 'median')} selected={selected} events={markers} />
      <MetricChart title="Rythme de publication hebdomadaire" description="Nombre de publications archivées par semaine UTC, à partir du lundi" badge="TWEETS / SEMAINE" data={advancedSeries(posts, 'week', 'count')} selected={selected} events={markers} />
    </div>
    <p className="analysis-note">Les semaines en cours et aux bornes du filtre peuvent être partielles. L’archive est incomplète pour certaines périodes : une absence de données reste inconnue.</p>
    <div className="two-charts">
      <MetricChart title="Concentration des vues" description="Part des vues portée par les 10 % de tweets les plus vus de chaque groupe" badge="EN % DES VUES" data={advancedSeries(posts, granularity, 'concentration')} selected={selected} events={markers} percent />
      <MetricChart title="Vues rapportées aux abonnés" description="Vues moyennes par tweet pour 100 abonnés, aux dates des relevés des compteurs" badge="POUR 100 ABONNÉS" data={advancedSeries(posts, granularity, 'reach', samples)} selected={selected} events={markers} percent />
    </div>
    <p className="analysis-note">Pour la concentration, les 10 % sont arrondis au tweet supérieur. Avec moins de dix tweets, un seul tweet compose le groupe de tête ; privilégiez le regroupement mensuel. Le rapport vues/abonnés utilise un relevé d’abonnés antérieur au compteur de vues et datant de 24 heures au plus. Il ne représente ni les abonnés à la publication ni une proportion de personnes uniques et peut dépasser 100 %.</p>
    <section className="panel" aria-label="Répartition des interactions et concentration">
      <div className="panel-heading"><div><h2>Ce qui compose l’engagement</h2><p>Répartition et concentration sur la période sélectionnée, par compte.</p></div></div>
      <div className="interaction-grid">{accounts.map(account => {
        const items = posts.filter(p => p.handle === account.handle);
        const breakdown = interactionBreakdown(items);
        const top = concentration(items);
        return <article className="interaction-card" key={account.handle}>
          <h3><i style={{ background: account.color }} />{account.short}</h3>
          <p>{number(breakdown.measured)} tweets avec interactions complètes · {number(breakdown.total)} interactions</p>
          <div className="interaction-bar" role="img" aria-label={breakdown.parts.map(part => `${interactionLabels[part.key]} : ${percent(part.share)}`).join(', ')}>{breakdown.parts.map((part, i) => <span key={part.key} style={{ width: `${part.share ?? 0}%`, background: interactionColors[i] }} />)}</div>
          <ul>{breakdown.parts.map((part, i) => <li key={part.key}><span><i style={{ background: interactionColors[i] }} />{interactionLabels[part.key]}</span><strong>{percent(part.share)} <small>({number(part.count)})</small></strong></li>)}</ul>
          <p className="concentration-summary">Les <strong>{number(top.topCount)} tweets</strong> de tête sur {number(top.measured)} mesurés génèrent <strong>{percent(top.share)}</strong> des vues connues.</p>
        </article>;
      })}</div>
      <p className="analysis-note">Likes, reposts, réponses et citations reçus par les publications originales. Seuls les tweets dont les quatre compteurs sont connus entrent dans la répartition ; les signets sont exclus.</p>
    </section>
    <div className="section-toolbar"><div><h2>Progression des abonnés</h2><span>Comparaison des derniers relevés disponibles dans deux semaines consécutives.</span></div><Select size="small" value={growthMetric} onChange={e => setGrowthMetric(e.target.value as 'gain' | 'percent')} inputProps={{ 'aria-label': 'Mesure de progression des abonnés' }}><MenuItem value="gain">Gain net</MenuItem><MenuItem value="percent">Croissance en %</MenuItem></Select></div>
    <MetricChart title={growthMetric === 'gain' ? 'Gains nets hebdomadaires d’abonnés' : 'Croissance hebdomadaire des abonnés'} description="Dernier relevé de la semaine moins celui de la semaine précédente ; semaine en cours provisoire" badge={growthMetric === 'gain' ? 'ABONNÉS' : 'EN %'} data={weeklyFollowerGrowth(samples, growthMetric).filter(row => Date.parse(row.date) + 7 * 86_400_000 > since)} selected={selected} percent={growthMetric === 'percent'} emptyMessage="Deux semaines consécutives avec des relevés d’abonnés sont nécessaires." />
    <p className="analysis-note">Deux semaines consécutives avec des relevés sont nécessaires. Aucun historique d’abonnés n’est reconstitué et aucune semaine manquante n’est interpolée.</p>
    <section className="panel media-comparison" aria-label="Comparaison autour des passages médias">
      <div className="panel-heading"><div><h2>Avant et après les passages médias</h2><p>Sept jours UTC avant et sept jours après, en excluant le jour du passage.</p></div><span className="subtle-badge">FENÊTRES DE 7 JOURS</span></div>
      <div className="table-scroll"><table><thead><tr><th>PASSAGE</th><th>TWEETS AVANT → APRÈS</th><th>VUES MÉDIANES AVANT → APRÈS</th><th>ENGAGEMENT AVANT → APRÈS</th><th>FENÊTRE</th></tr></thead><tbody>{events.map(event => {
        const comparison = compareMediaWindows(event, allPosts, availableUntil);
        const account = ACCOUNTS.find(a => a.handle === event.handle)!;
        return <tr key={event.id}><td><a href={`#media-event-${event.id}`}>#{event.number} · {dateLabel(event.date)}</a><br /><strong>{account.short}</strong> · {MEDIA_OUTLETS.find(o => o.id === event.outletId)?.name}</td><td>{number(comparison.before.count)} → {number(comparison.after.count)}</td><td>{comparison.before.medianViews === null ? 'N/D' : compact(comparison.before.medianViews)} → {comparison.after.medianViews === null ? 'N/D' : compact(comparison.after.medianViews)}<small className="measurement-count">{comparison.before.viewsCount} → {comparison.after.viewsCount} tweets avec vues</small></td><td>{percent(comparison.before.engagement)} → {percent(comparison.after.engagement)}<small className="measurement-count">{comparison.before.rateCount} → {comparison.after.rateCount} tweets mesurables</small></td><td>{comparison.completeWindow ? 'Bornes couvertes' : 'Fenêtre incomplète'}</td></tr>;
      })}</tbody></table>{!events.length && <p className="analysis-note">Aucun passage pour les comptes et la période sélectionnés.</p>}</div>
      <p className="analysis-note">Les fenêtres utilisent toute l’archive, même au-delà du filtre de dates. « Bornes couvertes » indique que l’archive s’étend de part et d’autre de la fenêtre, sans garantir son exhaustivité. Les fenêtres de passages proches peuvent se chevaucher. Les compteurs sont ceux des derniers relevés : les tweets plus récents ont moins de temps pour accumuler des vues. Cette comparaison ne démontre pas un effet causal des passages.</p>
    </section>
    <p className="analysis-note">Les performances à 24 heures et à sept jours nécessitent des relevés effectués à ces âges. Les compteurs actuels ne permettent pas de reconstruire ces performances pour les anciens tweets.</p>
  </section>;
}
