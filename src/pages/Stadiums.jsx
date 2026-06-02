import { useState } from 'react'
import './Stadiums.css'
const STADIUMS = [
  {name:'Estadio Azteca',city:'Mexico City',country:'Mexico',capacity:87500,host:'Match d\'ouverture'},
  {name:'Rose Bowl',city:'Los Angeles',country:'USA',capacity:88565,host:'Demi-finale'},
  {name:'MetLife Stadium',city:'New York/New Jersey',country:'USA',capacity:82500,host:'Finale'},
  {name:'AT&T Stadium',city:'Dallas',country:'USA',capacity:80000,host:'Groupes & K.O.'},
  {name:'SoFi Stadium',city:'Los Angeles',country:'USA',capacity:70240,host:'Groupes & K.O.'},
  {name:"Levi's Stadium",city:'San Francisco',country:'USA',capacity:68500,host:'Phase de groupes'},
  {name:'Arrowhead Stadium',city:'Kansas City',country:'USA',capacity:76416,host:'Phase de groupes'},
  {name:'Allegiant Stadium',city:'Las Vegas',country:'USA',capacity:65000,host:'Phase de groupes'},
  {name:'Lincoln Financial',city:'Philadelphia',country:'USA',capacity:69596,host:'Phase de groupes'},
  {name:'Hard Rock Stadium',city:'Miami',country:'USA',capacity:64767,host:'Phase de groupes'},
  {name:'Gillette Stadium',city:'Boston',country:'USA',capacity:65878,host:'Phase de groupes'},
  {name:'NRG Stadium',city:'Houston',country:'USA',capacity:72220,host:'Phase de groupes'},
  {name:'Estadio BBVA',city:'Monterrey',country:'Mexico',capacity:53500,host:'Phase de groupes'},
  {name:'Estadio Akron',city:'Guadalajara',country:'Mexico',capacity:49850,host:'Phase de groupes'},
  {name:'BC Place',city:'Vancouver',country:'Canada',capacity:54500,host:'Phase de groupes'},
  {name:'BMO Field',city:'Toronto',country:'Canada',capacity:45000,host:'Phase de groupes'},
]
const FLAG = {USA:'🇺🇸',Mexico:'🇲🇽',Canada:'🇨🇦'}
export default function Stadiums() {
  const [search, setSearch] = useState('')
  const [cf, setCf] = useState('Tous')
  const filtered = STADIUMS.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.city.toLowerCase().includes(search.toLowerCase())) return false
    if (cf !== 'Tous' && s.country !== cf) return false
    return true
  })
  return (
    <div className="stadiums-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Stades de la <span>Compétition</span></h1>
        <p className="page-sub">16 stades · USA 🇺🇸 · Mexique 🇲🇽 · Canada 🇨🇦</p>
      </div>
      <div className="st-filters">
        <input placeholder="Rechercher un stade ou une ville..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:280}} />
        <div className="filter-pills">{['Tous','USA','Mexico','Canada'].map(c=><button key={c} className={`fpill ${cf===c?'active':''}`} onClick={()=>setCf(c)}>{FLAG[c]||''} {c}</button>)}</div>
      </div>
      <div className="st-summary">
        <div className="sts-item"><span className="sts-n display">16</span><span className="sts-l">Stades</span></div>
        <div className="sts-item"><span className="sts-n display">3</span><span className="sts-l">Pays</span></div>
        <div className="sts-item"><span className="sts-n display">{Math.max(...STADIUMS.map(s=>s.capacity)).toLocaleString()}</span><span className="sts-l">Plus grande capacité</span></div>
      </div>
      <div className="stadiums-grid">
        {filtered.map(s=>(
          <div key={s.name} className="sc">
            <div className="sc-top"><span className="sc-icon">🏟️</span><span className="sc-country">{FLAG[s.country]} {s.country}</span></div>
            <div className="sc-name">{s.name}</div>
            <div className="sc-city">{s.city}</div>
            {s.host&&<span className="badge badge-purple" style={{fontSize:9,marginTop:4}}>{s.host}</span>}
            <div className="sc-cap"><span className="sc-cap-n display">{s.capacity.toLocaleString()}</span><span className="sc-cap-l">places</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
