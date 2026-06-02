import { useState } from 'react'
import './Stadiums.css'

const STADIUMS = [
  { name:'Estadio Azteca',      city:'Mexico City',        country:'Mexico', capacity:87500, host:'Opening match' },
  { name:'Rose Bowl',           city:'Los Angeles',        country:'USA',    capacity:88565, host:'Semi-final' },
  { name:'MetLife Stadium',     city:'New York/New Jersey', country:'USA',   capacity:82500, host:'Final' },
  { name:'AT&T Stadium',        city:'Dallas',             country:'USA',    capacity:80000, host:'Group & KO' },
  { name:'SoFi Stadium',        city:'Los Angeles',        country:'USA',    capacity:70240, host:'Group & KO' },
  { name:'Levi\'s Stadium',     city:'San Francisco',      country:'USA',    capacity:68500, host:'Group Stage' },
  { name:'Arrowhead Stadium',   city:'Kansas City',        country:'USA',    capacity:76416, host:'Group Stage' },
  { name:'Allegiant Stadium',   city:'Las Vegas',          country:'USA',    capacity:65000, host:'Group Stage' },
  { name:'Lincoln Financial',   city:'Philadelphia',       country:'USA',    capacity:69596, host:'Group Stage' },
  { name:'Hard Rock Stadium',   city:'Miami',              country:'USA',    capacity:64767, host:'Group Stage' },
  { name:'Gillette Stadium',    city:'Boston',             country:'USA',    capacity:65878, host:'Group Stage' },
  { name:'NRG Stadium',         city:'Houston',            country:'USA',    capacity:72220, host:'Group Stage' },
  { name:'Estadio BBVA',        city:'Monterrey',          country:'Mexico', capacity:53500, host:'Group Stage' },
  { name:'Estadio Akron',       city:'Guadalajara',        country:'Mexico', capacity:49850, host:'Group Stage' },
  { name:'BC Place',            city:'Vancouver',          country:'Canada', capacity:54500, host:'Group Stage' },
  { name:'BMO Field',           city:'Toronto',            country:'Canada', capacity:45000, host:'Group Stage' },
]

const FLAG = { USA:'🇺🇸', Mexico:'🇲🇽', Canada:'🇨🇦' }

export default function Stadiums() {
  const [search, setSearch] = useState('')
  const [countryF, setCountryF] = useState('All')

  const filtered = STADIUMS.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.city.toLowerCase().includes(search.toLowerCase())) return false
    if (countryF !== 'All' && s.country !== countryF) return false
    return true
  })

  return (
    <div className="stadiums-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">World Cup <span>Stadiums</span></h1>
        <p className="page-sub">16 venues across USA 🇺🇸, Mexico 🇲🇽 & Canada 🇨🇦</p>
      </div>

      <div className="st-filters">
        <input placeholder="Search stadium or city…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:260}} />
        <div className="filter-pills">
          {['All','USA','Mexico','Canada'].map(c => (
            <button key={c} className={`fpill ${countryF===c?'active':''}`} onClick={()=>setCountryF(c)}>
              {FLAG[c]||''} {c}
            </button>
          ))}
        </div>
      </div>

      <div className="st-summary">
        <div className="sts-item"><span className="sts-n display">16</span><span className="sts-l">Venues</span></div>
        <div className="sts-item"><span className="sts-n display">3</span><span className="sts-l">Countries</span></div>
        <div className="sts-item"><span className="sts-n display">{Math.max(...STADIUMS.map(s=>s.capacity)).toLocaleString()}</span><span className="sts-l">Largest capacity</span></div>
      </div>

      <div className="stadiums-grid">
        {filtered.map(s => (
          <div key={s.name} className="sc">
            <div className="sc-top">
              <span className="sc-icon">🏟️</span>
              <span className="sc-country">{FLAG[s.country]} {s.country}</span>
            </div>
            <div className="sc-name">{s.name}</div>
            <div className="sc-city">{s.city}</div>
            {s.host && <span className="badge badge-purple" style={{fontSize:9,marginTop:4}}>{s.host}</span>}
            <div className="sc-cap">
              <span className="sc-cap-n display">{s.capacity.toLocaleString()}</span>
              <span className="sc-cap-l">seats</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-state"><div className="empty-icon">🏟️</div><p>No stadiums found.</p></div>}
    </div>
  )
}
