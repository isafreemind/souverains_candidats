import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACCOUNTS, type Handle } from '../domain/model';
import type { ChartPoint } from '../domain/statistics';
import { compact, dateLabel } from '../domain/format';
import { groupMediaMarkers, MEDIA_OUTLETS, type NumberedMediaEvent } from '../domain/media';

type Props = { data: ChartPoint[]; selected: Handle[]; percent?: boolean; title: string; description: string; badge?: string; tall?: boolean; events?: NumberedMediaEvent[]; emptyMessage?: string };
export default function MetricChart({ data, selected, percent, title, description, badge, tall, events = [], emptyMessage = 'Les mesures apparaîtront après une collecte réussie.' }: Props) {
  const hasData = data.some(row => selected.some(handle => typeof row[handle] === 'number'));
  const markers = groupMediaMarkers(events);
  const chartData = data.map(row => ({ ...row, timestamp: Date.parse(row.date) }));
  const timestamps = [...chartData.map(row => row.timestamp), ...markers.map(marker => marker.timestamp)];
  const minimum = Math.min(...timestamps);
  const maximum = Math.max(...timestamps);
  const domain = minimum === maximum ? [minimum - 43_200_000, maximum + 43_200_000] : [minimum, maximum];
  return <section className={`panel chart-panel ${tall ? 'chart-large' : ''}`} aria-label={title}>
    <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{badge && <span className="subtle-badge">{badge}</span>}</div>
    <div className="chart-area" role="img" aria-label={`${title}. ${data.length} dates observées. Les valeurs sont consultables dans les infobulles du graphique.`}>
      {hasData ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={chartData} margin={{ top: markers.length ? 42 : 16, right: 12, left: -13, bottom: 6 }} accessibilityLayer>
          <CartesianGrid stroke="#edf0f5" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey="timestamp" type="number" scale="time" domain={domain} tickFormatter={value => dateLabel(new Date(Number(value)).toISOString())} tickLine={false} axisLine={false} tick={{ fill: '#8590a3', fontSize: 11 }} minTickGap={38} dy={10} />
          <YAxis tickFormatter={v => percent ? `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %` : compact(Number(v))} tickLine={false} axisLine={false} tick={{ fill: '#8590a3', fontSize: 11 }} width={72} />
          <Tooltip labelFormatter={label => dateLabel(new Date(Number(label)).toISOString(), true)} formatter={(value, name) => [typeof value === 'number' ? percent ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : Math.round(value).toLocaleString('fr-FR') : 'Indisponible', ACCOUNTS.find(a => a.handle === name)?.short ?? name]} contentStyle={{ borderRadius: 12, border: '1px solid #e8ebf2', boxShadow: '0 8px 30px #17234012', fontSize: 12 }} />
          {markers.map((marker, index) => {
            const first = marker.events[0];
            const color = marker.events.every(e => e.handle === first.handle) ? ACCOUNTS.find(a => a.handle === first.handle)!.color : '#7b879c';
            const label = marker.events.map(e => `#${e.number}`).join(' · ');
            const note = marker.events.map(e => `${dateLabel(e.date, true)} : ${ACCOUNTS.find(a => a.handle === e.handle)?.short}, ${MEDIA_OUTLETS.find(o => o.id === e.outletId)?.name}. ${e.title}`).join('\n');
            return <ReferenceLine key={marker.date} x={marker.timestamp} stroke={color} strokeOpacity={0.7} strokeDasharray="3 4" label={props => {
              const box = props.viewBox as { x: number; y: number };
              return <g className="media-chart-marker"><a href={`#media-event-${first.id}`} aria-label={note}><title>{note}</title><rect x={box.x - 15} y={box.y - 17 - (index % 2) * 14} width={Math.max(30, label.length * 5.5)} height={14} rx={3} fill="white" stroke={color} strokeOpacity={0.35} /><text x={box.x - 11} y={box.y - 7 - (index % 2) * 14} fill={color} fontSize={9}>{label}</text></a></g>;
            }} />;
          })}
          {ACCOUNTS.filter(a => selected.includes(a.handle)).map((a, i) => <Line key={a.handle} type="linear" dataKey={a.handle} name={a.handle} stroke={a.color} strokeWidth={2.5} strokeDasharray={i === 1 ? '7 3' : i === 2 ? '2 3' : undefined} dot={data.length < 35 ? { r: 2.8, strokeWidth: 2, fill: '#fff' } : false} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer> : <div className="empty-chart"><span>Pas encore de données sur cette période</span><p>{emptyMessage}</p></div>}
    </div>
    <div className="chart-legend">{ACCOUNTS.filter(a => selected.includes(a.handle)).map(a => <span key={a.handle}><i style={{ background: a.color }} />{a.short}</span>)}</div>
    {markers.length > 0 && <a className="media-chart-note" href="#passages-medias">Repères pointillés : passages dans les médias · Cliquer sur un numéro pour lire sa note.</a>}
  </section>;
}
