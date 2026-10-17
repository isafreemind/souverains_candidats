import { ACCOUNTS, type Handle } from '../domain/model';
import { MEDIA_OUTLETS, type MediaDataset, type MediaEvent, type NumberedMediaEvent } from '../domain/media';
import { dateLabel } from '../domain/format';

export default function MediaAppearances({ dataset, events, selected, announcements = [] }: { dataset: MediaDataset; events: NumberedMediaEvent[]; selected: Handle[]; announcements?: MediaEvent[] }) {
  return <section className="panel media-panel" id="passages-medias" aria-label="Notes des passages dans les médias">
    <div className="panel-heading"><div><h2>Passages dans les médias</h2><p>Les numéros des repères verticaux renvoient aux notes ci-dessous.</p></div><span className="subtle-badge">{events.length} PASSAGE{events.length !== 1 ? 'S' : ''} DOCUMENTÉ{events.length !== 1 ? 'S' : ''}</span></div>
    <div className="media-content">
        <p className="media-period">Recherche du {dateLabel(dataset.period.start, true)} au {dateLabel(dataset.period.end, true)} · Vérifiée le {dateLabel(dataset.researchedAt, true)}.</p>
        <div className="media-outlets">{MEDIA_OUTLETS.map(outlet => <span key={outlet.id}>{outlet.name}</span>)}</div>
        <p className="media-period">Notes pour la période sélectionnée : {ACCOUNTS.filter(a => selected.includes(a.handle)).map(a => `${a.short} : ${events.filter(e => e.handle === a.handle).length}`).join(' · ') || 'aucun compte sélectionné'}.</p>
        {!events.length && <p className="media-empty">Aucun passage documenté pour les comptes et la période sélectionnés. Cela ne signifie pas qu’aucun passage n’a eu lieu.</p>}
        <ol className="media-events">{events.map(event => {
          const account = ACCOUNTS.find(a => a.handle === event.handle)!;
          const outlet = MEDIA_OUTLETS.find(o => o.id === event.outletId)!;
          return <li id={`media-event-${event.id}`} key={event.id}>
            <span className="media-event-number" style={{ color: account.color, borderColor: account.color }}>{event.number}</span>
            <div><div className="media-event-title"><strong>{dateLabel(event.date, true)} · {account.short} · {outlet.name}</strong><span className="subtle-badge">{event.sourceType === 'official-replay' ? 'SOURCE DU MÉDIA' : 'DÉCLARÉ PAR LE COMPTE'}</span></div>
              <p>{event.title}</p><p>{event.dateEvidence}</p><p>{event.evidence}</p>
              <a href={event.sourceUrl} target="_blank" rel="noreferrer">Consulter la source du passage ↗</a>
              {event.supportingUrls?.filter(url => url !== event.sourceUrl).map((url, index) => <a className="media-additional-source" key={url} href={url} target="_blank" rel="noreferrer">Source complémentaire {index + 1} ↗</a>)}
            </div>
          </li>;
        })}</ol>
        {announcements.length > 0 && <details className="media-announcements"><summary>{announcements.length} annonce{announcements.length > 1 ? 's' : ''} de passage sans confirmation retrouvée</summary><p>Ces annonces sont conservées pour vérification. Elles ne sont comptées ni dans les passages documentés ni dans les repères et comparaisons des courbes.</p><ul>{announcements.map(event => <li key={event.id}><strong>{dateLabel(event.date, true)} · {ACCOUNTS.find(a => a.handle === event.handle)?.short} · {MEDIA_OUTLETS.find(o => o.id === event.outletId)?.name}</strong><p>{event.title}</p><p>{event.dateEvidence}</p><a href={event.sourceUrl} target="_blank" rel="noreferrer">Consulter l’annonce ↗</a></li>)}</ul></details>}
        <p className="media-caveat">La proximité d’un passage et d’une variation des courbes ne démontre pas un effet causal. Une invitation annoncée, une simple mention ou une date de passage incertaine ne crée pas de repère.</p>
        <details><summary>Périmètre et limites de la recherche</summary><p>{dataset.selectionBasis}</p><p>Le recensement est documentaire et non exhaustif. Les déclarations de passages déjà effectués sont distinguées des sources publiées par les médias. Cette recherche est datée ; elle n’est pas actualisée automatiquement par les relevés de publications.</p><ul>{dataset.coverage.map(c => <li key={`${c.handle}-${c.outletId}`}><strong>{ACCOUNTS.find(a => a.handle === c.handle)?.short} · {MEDIA_OUTLETS.find(o => o.id === c.outletId)?.name}</strong> : {c.notes}{c.status === 'limited' && ' Accès ou couverture limités.'}</li>)}</ul></details>
    </div>
  </section>;
}
