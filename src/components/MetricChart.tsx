import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACCOUNTS, type Handle } from '../domain/model';
import type { ChartPoint } from '../domain/statistics';
import { compact, dateLabel } from '../domain/format';

type Props = { data: ChartPoint[]; selected: Handle[]; percent?: boolean; title: string; description: string; badge?: string; tall?: boolean };
export default function MetricChart({ data, selected, percent, title, description, badge, tall }: Props) {
  const hasData = data.some(row => selected.some(handle => typeof row[handle] === 'number'));
  return <section className={`panel chart-panel ${tall ? 'chart-large' : ''}`} aria-label={title}>
    <div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{badge && <span className="subtle-badge">{badge}</span>}</div>
    <div className="chart-area" role="img" aria-label={`${title}. ${data.length} dates observées. Les valeurs sont consultables dans le tableau et l’export CSV.`}>
      {hasData ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 16, right: 12, left: -13, bottom: 6 }} accessibilityLayer>
          <CartesianGrid stroke="#edf0f5" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={value => dateLabel(String(value))} tickLine={false} axisLine={false} tick={{ fill: '#8590a3', fontSize: 11 }} minTickGap={38} dy={10} />
          <YAxis tickFormatter={v => percent ? `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %` : compact(Number(v))} tickLine={false} axisLine={false} tick={{ fill: '#8590a3', fontSize: 11 }} width={72} />
          <Tooltip labelFormatter={label => dateLabel(String(label), true)} formatter={(value, name) => [typeof value === 'number' ? percent ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : Math.round(value).toLocaleString('fr-FR') : 'Indisponible', ACCOUNTS.find(a => a.handle === name)?.short ?? name]} contentStyle={{ borderRadius: 12, border: '1px solid #e8ebf2', boxShadow: '0 8px 30px #17234012', fontSize: 12 }} />
          {ACCOUNTS.filter(a => selected.includes(a.handle)).map((a, i) => <Line key={a.handle} type="linear" dataKey={a.handle} name={a.handle} stroke={a.color} strokeWidth={2.5} strokeDasharray={i === 1 ? '7 3' : i === 2 ? '2 3' : undefined} dot={data.length < 35 ? { r: 2.8, strokeWidth: 2, fill: '#fff' } : false} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer> : <div className="empty-chart"><span>Pas encore de données sur cette période</span><p>Les mesures apparaîtront après une collecte FxTwitter réussie.</p></div>}
    </div>
    <div className="chart-legend">{ACCOUNTS.filter(a => selected.includes(a.handle)).map(a => <span key={a.handle}><i style={{ background: a.color }} />{a.short}</span>)}</div>
  </section>;
}
