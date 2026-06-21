import { useState, useEffect } from 'react'
import api from '../lib/api'

function PartyBadge({ party }) {
  const cls = party === 'democrat' ? 'badge-dem' : party === 'republican' ? 'badge-rep' : 'badge-ind'
  const label = party === 'democrat' ? 'D' : party === 'republican' ? 'R' : 'I'
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function Politicians() {
  const [politicians, setPoliticians] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chamber, setChamber] = useState('')
  const [party, setParty] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const fetch = async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit, offset })
    if (search) params.set('search', search)
    if (chamber) params.set('chamber', chamber)
    if (party) params.set('party', party)
    const res = await api.get(`/politicians/?${params}`)
    setPoliticians(res.data.politicians)
    setTotal(res.data.total)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [search, chamber, party, offset])

  const resetFilters = () => {
    setSearch('')
    setChamber('')
    setParty('')
    setOffset(0)
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
          The <span className="text-red">Players</span>
        </h1>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {total} members of the 119th Congress available to draft
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-1" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 240 }}
          placeholder="Search by name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOffset(0) }} />
        <select className="form-input" style={{ maxWidth: 160 }}
          value={chamber} onChange={e => { setChamber(e.target.value); setOffset(0) }}>
          <option value="">All Chambers</option>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </select>
        <select className="form-input" style={{ maxWidth: 180 }}
          value={party} onChange={e => { setParty(e.target.value); setOffset(0) }}>
          <option value="">All Parties</option>
          <option value="democrat">Democrat</option>
          <option value="republican">Republican</option>
          <option value="independent">Independent</option>
        </select>
        {(search || chamber || party) && (
          <button className="btn btn-secondary" onClick={resetFilters}>Clear</button>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {politicians.map(p => (
              <div key={p.id} className="card flex items-center gap-2" style={{ padding: '0.75rem 1rem' }}>
                <PartyBadge party={p.party} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.title} {p.full_name}</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                    {p.state}{p.district ? `-${p.district}` : ''}
                  </span>
                </div>
                <span className="badge badge-senate">
                  {p.chamber === 'senate' ? 'SEN' : 'REP'}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}>
              ← Previous
            </button>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button className="btn btn-secondary"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}>
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
