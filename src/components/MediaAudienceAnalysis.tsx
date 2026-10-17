import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type Dashboard, type Handle } from '../domain/model';
import type { MediaDataset } from '../domain/media';
import { mediaAudienceAnalysis, mediaCounts } from '../domain/media-audience';
import { compact, dateLabel, number, percent } from '../domain/format';

const decimal = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const factor = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const medianLabel = (n: number | null) => n === null ? 'N/D' : decimal(n);
const signedPercent = (n: number | null) => n === null ? 'N/D' : `${n > 0 ? '+' : ''}${percent(n)}`;

export default function MediaAudienceAnalysis({ data, media, selected, since }: {
  data: Dashboard | null; media: MediaDataset; selected: Handle[]; since: number;
}) {
  const end = Date.parse(media.period.end) + 86_400_000;
  const start = Math.max(since ? Date.parse(new Date(since).toISOString().slice(0, 10)) : 0, Date.parse(media.period.start));
  const counts = mediaCounts(media.events, selected, start, end);
  const maximumCount = Math.max(1, ...counts.map(c => c.count));
  const tickStep = [1, 2, 5, 10, 20, 50, 100].find(step => step * 4 >= maximumCount) ?? Math.ceil(maximumCount / 4);
  const analysis = data ? mediaAudienceAnalysis(data, media, selected, since) : null;
  const rows = analysis?.rows ?? [];
  const byViews = [...rows].sort((a, b) => b.views - a.views);
  const byMedia = [...rows].sort((a, b) => b.media.count - a.media.count);
  const byMedian = rows.filter(r => r.medianViews !== null).sort((a, b) => b.medianViews! - a.medianViews!);
  const first = byViews[0], second = byViews[1];
  const decomposition = first && second && first.views > 0 && second.views > 0 && first.averageViews !== null && second.averageViews !== null && second.averageViews > 0;
  const measuredWindows = rows.reduce((sum, row) => sum + row.eventStudy.measuredWindows, 0);
  const increases = rows.reduce((sum, row) => sum + row.eventStudy.increases, 0);
  const withoutAppearance = rows.find(row => row.media.count === 0 && row.medianViews !== null && row.medianViews > 0);
  const similarMedian = withoutAppearance ? rows.find(row => row.media.count > 0 && row.medianViews !== null && row.medianViews > 0 && Math.abs(withoutAppearance.medianViews! / row.medianViews - 1) < 0.05) : undefined;
  const byConcentration = rows.filter(row => row.concentration !== null).sort((a, b) => b.concentration! - a.concentration!);
  const mostConcentrated = byConcentration[0], leastConcentrated = byConcentration.at(-1);
  return <section id="medias-audience" className="media-audience-analysis" aria-label="Analyse des médias et des comptes">
    <div className="section-toolbar"><div><h2>Passages médias et audience sur X</h2><span>Comparer le nombre de participations documentées et les performances des publications.</span></div></div>
    <section className="panel media-count-panel" aria-label="Nombre de passages dans les médias par compte">
      <div className="panel-heading"><div><h2>Passages dans les médias mainstream</h2><p>Dix médias retenus · Du {dateLabel(new Date(start).toISOString(), true)} au {dateLabel(media.period.end, true)} · Annonces non confirmées exclues</p></div><span className="subtle-badge">{counts.reduce((sum, c) => sum + c.count, 0)} PASSAGES DOCUMENTÉS</span></div>
      {counts.length ? <div className="media-count-chart" role="img" aria-label={counts.map(c => `${c.short} : ${c.count} passages documentés`).join('. ')}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={counts} layout="vertical" margin={{ top: 16, right: 35, left: 0, bottom: 8 }} accessibilityLayer>
          <CartesianGrid stroke="#edf0f5" strokeDasharray="4 5" horizontal={false} />
          <XAxis type="number" allowDecimals={false} domain={[0, tickStep * 4]} ticks={[0, tickStep, tickStep * 2, tickStep * 3, tickStep * 4]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#758095' }} />
          <YAxis type="category" dataKey="short" tickFormatter={name => counts.find(c => c.short === name)?.count === 0 ? `${name} (0)` : name} width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#44516c' }} />
          <Tooltip cursor={{ fill: '#f6f7fb' }} formatter={value => [value, 'Passages documentés']} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="count" name="Passages documentés" barSize={30} radius={[0, 5, 5, 0]} isAnimationActive={false}>{counts.map(c => <Cell key={c.handle} fill={c.color} />)}<LabelList dataKey="count" position="right" fill="#44516c" fontSize={13} /></Bar>
        </BarChart>
      </ResponsiveContainer></div> : <p className="analysis-note">Sélectionnez au moins un compte.</p>}
      <ul className="media-count-values">{counts.map(c => <li key={c.handle}><strong>{c.short} : {c.count}</strong><span>{c.broadcaster} sources de diffuseurs · {c.selfReported} comptes rendus après diffusion</span></li>)}</ul>
      <p className="analysis-note">Un passage vaut une participation, quelle que soit sa durée ou l’audience de l’émission. Ce graphique ne mesure donc pas le temps d’antenne ni le nombre de téléspectateurs touchés. Zéro signifie « aucun passage retrouvé » dans ce recensement non exhaustif.</p>
    </section>
    {analysis && <section className="panel audience-findings" aria-label="Analyse comparative sur une période commune">
      <div className="panel-heading"><div><h2>Que montrent les comptes sur une période commune ?</h2><p>Du {dateLabel(analysis.start, true)} au {dateLabel(analysis.lastDay, true)} inclus · {analysis.days} jours UTC complets</p></div></div>
      <p className="analysis-note">Cette comparaison écarte le début non couvert par certaines archives et le jour de collecte en cours. Les passages du tableau sont limités à cette même fenêtre ; leur total peut donc différer du graphique ci-dessus.</p>
      <div className="table-scroll"><table className="audience-summary-table"><thead><tr><th>COMPTE</th><th>PASSAGES</th><th>TWEETS</th><th>TWEETS / SEMAINE</th><th>VUES CONNUES CUMULÉES</th><th>VUES / TWEET</th><th>VUES MÉDIANES</th><th>ENGAGEMENT</th><th>VUES DES 10 % DE TÊTE</th></tr></thead><tbody>{rows.map(row => <tr key={row.handle}><td><strong>{row.name}</strong></td><td>{row.media.count}</td><td>{number(row.count)}</td><td>{decimal(row.postsPerWeek)}</td><td>{number(row.views)}<small className="measurement-count">{number(row.viewsCount)} tweets avec vues</small></td><td>{row.averageViews === null ? 'N/D' : compact(row.averageViews)}</td><td>{medianLabel(row.medianViews)}</td><td>{percent(row.engagement)}<small className="measurement-count">{number(row.rateCount)} tweets mesurables</small></td><td>{percent(row.concentration)}</td></tr>)}</tbody></table></div>
      <div className="audience-conclusions">
        {rows.length > 1 && byMedia[0]?.media.count > 0 && byMedian.length > 1 && <p><strong>{byMedia[0].name}</strong> a le plus de passages recensés sur cette fenêtre ({byMedia[0].media.count}), avec une médiane de {medianLabel(byMedia[0].medianViews)} vues par tweet. La médiane la plus élevée revient à <strong>{byMedian[0].name}</strong> ({medianLabel(byMedian[0].medianViews)}). {byMedia[0].handle !== byMedian[0].handle ? 'Le classement des passages diffère donc de celui des vues médianes.' : 'Ces deux classements concordent dans cette sélection, sans démontrer un lien causal.'}</p>}
        {withoutAppearance && similarMedian && <p>Aucun passage n’a été retrouvé pour <strong>{withoutAppearance.name}</strong> sur cette fenêtre. Sa médiane de {medianLabel(withoutAppearance.medianViews)} vues par tweet ne diffère que d’environ {factor(Math.abs(withoutAppearance.medianViews! / similarMedian.medianViews! - 1) * 100)} % de celle de {similarMedian.name} ({medianLabel(similarMedian.medianViews)}), pour qui {similarMedian.media.count} passages sont documentés.</p>}
        {decomposition && <p><strong>{first.name}</strong> totalise environ {factor(first.views / second.views)} fois les vues connues de {second.name}. Cet écart se décompose en <strong>{factor(first.viewsCount / second.viewsCount)} fois le volume de tweets mesurés</strong> et {factor(first.averageViews! / second.averageViews!)} fois les vues moyennes. Les volumes de vues sont influencés à la fois par l’activité et par la portée de chaque publication.</p>}
        {mostConcentrated && leastConcentrated && mostConcentrated.concentration! - leastConcentrated.concentration! >= 5 && <p>Chez <strong>{mostConcentrated.name}</strong>, les 10 % de tweets de tête génèrent {percent(mostConcentrated.concentration)} des vues, contre {percent(leastConcentrated.concentration)} chez {leastConcentrated.name}. Ses vues sont donc davantage concentrées sur une petite partie de ses publications.</p>}
        {rows.some(r => r.count !== r.viewsCount) && <p>Certains tweets n’ont pas de compteur de vues : la comparaison des volumes utilise uniquement les publications mesurables.</p>}
        <p>Ces écarts décrivent l’archive. Le nombre de passages recensés ne suffit pas à expliquer les performances des comptes : sujets, notoriété préalable, rythme de publication et ancienneté des tweets peuvent aussi intervenir. Les vues sont des compteurs cumulés, pas des personnes uniques.</p>
      </div>
      <div className="panel-heading"><div><h2>Observe-t-on une hausse après les passages ?</h2><p>Sept jours avant et sept jours après, sans le jour du passage · Au moins cinq tweets avec vues de chaque côté</p></div></div>
      <div className="table-scroll"><table className="isolated-event-table"><thead><tr><th>COMPTE</th><th>FENÊTRES COMPLÈTES</th><th>PASSAGES ISOLÉS MESURABLES</th><th>HAUSSES DE LA MÉDIANE</th><th>VARIATION MÉDIANE DES VUES / TWEET</th><th>ÉCART MÉDIAN D’ENGAGEMENT</th></tr></thead><tbody>{rows.map(row => <tr key={row.handle}><td><strong>{row.name}</strong></td><td>{row.eventStudy.fullWindows}</td><td>{row.eventStudy.measuredWindows}</td><td>{row.eventStudy.measuredWindows ? `${row.eventStudy.increases} / ${row.eventStudy.measuredWindows}` : 'N/D'}</td><td>{signedPercent(row.eventStudy.medianViewsChange)}</td><td>{row.eventStudy.medianEngagementChangePoints === null ? 'N/D' : `${decimal(row.eventStudy.medianEngagementChangePoints)} point(s)`}</td></tr>)}</tbody></table></div>
      {measuredWindows > 0 && <div className="audience-conclusions"><p>Les vues médianes augmentent dans {increases} des {measuredWindows} fenêtres isolées retenues. {increases < measuredWindows ? 'Une hausse n’apparaît donc pas après chaque passage dans cet échantillon.' : 'Toutes les fenêtres disponibles montrent une hausse.'} Ce petit échantillon ne permet ni d’attribuer les variations aux médias ni d’écarter un effet.</p></div>}
      <p className="analysis-note">Un passage est isolé si aucun autre passage documenté du même compte n’est recensé dans les quatorze jours avant ou après, y compris le même jour. La variation affichée est la médiane des variations individuelles, sans double comptage des fenêtres. Les faibles effectifs ne permettent pas d’établir un effet moyen des médias. Les tweets postérieurs sont plus récents et leurs compteurs ont eu moins de temps pour croître ; les actualités concomitantes et les passages manquants restent des facteurs possibles.</p>
      <details className="isolated-event-details"><summary>Voir les fenêtres isolées utilisées</summary><ul>{rows.flatMap(row => row.eventStudy.windows.map(window => <li key={window.id}><a href={`#media-event-${window.id}`}>{row.name} · {dateLabel(window.date, true)}</a> : {number(window.beforeMedian)} → {number(window.afterMedian)} vues médianes ({signedPercent(window.medianViewsChange)}) · {window.beforeMeasured} → {window.afterMeasured} tweets avec vues.</li>))}</ul>{!rows.some(r => r.eventStudy.measuredWindows) && <p>Aucune fenêtre isolée mesurable dans la sélection.</p>}</details>
      <p className="analysis-note">Les relevés d’abonnés commencent au premier jour de collecte : on ne peut pas mesurer ici les gains historiques liés aux passages sur l’année. Les chiffres ne sont comparables qu’à la couverture des archives près ; « période commune » ne signifie pas « collecte exhaustive ».</p>
    </section>}
    {!analysis && <p className="analysis-note">Une analyse comparative nécessite des publications archivées et au moins un jour UTC complet dans la période commune aux comptes sélectionnés.</p>}
  </section>;
}
