import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('DEIN-PROJEKT'))
const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null

const emptyGear = { name:'', category:'', weight_g:'', quantity:1, location:'', brand:'', price_chf:'', notes:'' }
const emptyWish = { name:'', category:'', weight_g:'', price_chf:'', url:'', priority:'Mittel', notes:'' }
const money = value => Number(value || 0).toLocaleString('de-CH', { style:'currency', currency:'CHF' })
const weight = value => Number(value || 0) >= 1000 ? `${(Number(value)/1000).toLocaleString('de-CH',{maximumFractionDigits:2})} kg` : `${Math.round(Number(value || 0))} g`

function App(){
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState('dashboard')
  const [gear,setGear]=useState([])
  const [lists,setLists]=useState([])
  const [listItems,setListItems]=useState([])
  const [wishlist,setWishlist]=useState([])
  const [message,setMessage]=useState('')

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>setSession(newSession))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(session) refreshAll(); else {setGear([]);setLists([]);setListItems([]);setWishlist([])} },[session])

  async function refreshAll(){
    setLoading(true)
    const [g,l,li,w]=await Promise.all([
      supabase.from('gear').select('*').order('created_at',{ascending:false}),
      supabase.from('pack_lists').select('*').order('created_at',{ascending:false}),
      supabase.from('pack_list_items').select('*'),
      supabase.from('wishlist').select('*').order('created_at',{ascending:false})
    ])
    const err=g.error||l.error||li.error||w.error
    if(err) setMessage(`Fehler: ${err.message}`)
    setGear(g.data||[]);setLists(l.data||[]);setListItems(li.data||[]);setWishlist(w.data||[])
    setLoading(false)
  }

  if(!configured) return <SetupNotice />
  if(loading && !session) return <div className="center"><div className="spinner"/>Lade…</div>
  if(!session) return <Auth />

  const props={gear,lists,listItems,wishlist,refreshAll,setMessage,session}
  return <>
    <header><div><h1>PackLager Cloud</h1><p>Gemeinsame Ausrüstung auf allen Geräten</p></div><button className="ghost" onClick={()=>supabase.auth.signOut()}>Abmelden</button></header>
    <nav>{[['dashboard','Übersicht'],['gear','Ausrüstung'],['lists','Packlisten'],['wishlist','Wunschliste'],['compare','Vergleich'],['import','CSV-Import']].map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{label}</button>)}</nav>
    <main>
      {message&&<div className="notice" onClick={()=>setMessage('')}>{message}</div>}
      {loading&&<div className="loadingbar"/>}
      {view==='dashboard'&&<Dashboard {...props}/>} 
      {view==='gear'&&<GearView {...props}/>} 
      {view==='lists'&&<ListsView {...props}/>} 
      {view==='wishlist'&&<WishlistView {...props}/>} 
      {view==='compare'&&<CompareView {...props}/>} 
      {view==='import'&&<ImportView {...props}/>} 
    </main>
  </>
}

function SetupNotice(){return <div className="auth-shell"><div className="auth-card"><h1>PackLager Cloud</h1><h2>Supabase noch nicht verbunden</h2><p>Lege die Variablen <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in Netlify oder in einer lokalen <code>.env</code>-Datei an.</p><p>Die vollständige Anleitung und die Datenbankvorlage liegen im Projektordner.</p></div></div>}

function Auth(){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [mode,setMode]=useState('login');const [msg,setMsg]=useState('')
  async function submit(e){e.preventDefault();setMsg('')
    const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password})
    if(result.error)setMsg(result.error.message);else if(mode==='signup')setMsg('Konto erstellt. Prüfe gegebenenfalls deine E-Mail zur Bestätigung.')
  }
  return <div className="auth-shell"><form className="auth-card" onSubmit={submit}><h1>PackLager Cloud</h1><p>Mit demselben Login auf allen Geräten dieselben Daten nutzen.</p><label>E-Mail</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label>Passwort</label><input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)}/>{msg&&<div className="notice">{msg}</div>}<button className="primary" type="submit">{mode==='login'?'Anmelden':'Konto erstellen'}</button><button className="link" type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Noch kein Konto? Registrieren':'Bereits registriert? Anmelden'}</button></form></div>
}

function Dashboard({gear,lists,wishlist,listItems}){
  const total=gear.reduce((s,g)=>s+Number(g.weight_g)*Number(g.quantity),0)
  const cat=Object.entries(gear.reduce((a,g)=>({...a,[g.category||'Ohne Kategorie']:(a[g.category||'Ohne Kategorie']||0)+Number(g.weight_g)*Number(g.quantity)}),{})).sort((a,b)=>b[1]-a[1]).slice(0,6)
  return <><div className="stats"><Stat n={gear.length} label="Artikel"/><Stat n={weight(total)} label="Gesamtgewicht Lager"/><Stat n={lists.length} label="Packlisten"/><Stat n={wishlist.length} label="Wünsche"/></div><div className="grid"><section className="card span7"><h2>Letzte Artikel</h2>{gear.slice(0,6).map(g=><div className="rowcard" key={g.id}><div><strong>{g.name}</strong><small>{g.category||'Ohne Kategorie'} · {g.location||'Kein Lagerplatz'}</small></div><b>{weight(g.weight_g*g.quantity)}</b></div>)}{!gear.length&&<Empty/>}</section><section className="card span5"><h2>Schwerste Kategorien</h2>{cat.map(([name,val])=><div className="category" key={name}><div><span>{name}</span><b>{weight(val)}</b></div><progress max={cat[0]?.[1]||1} value={val}/></div>)}{!cat.length&&<Empty/>}</section></div></>
}
function Stat({n,label}){return <div className="stat"><strong>{n}</strong><span>{label}</span></div>}
function Empty(){return <div className="empty">Noch keine Daten vorhanden.</div>}

function GearView({gear,refreshAll,setMessage}){
 const [form,setForm]=useState(emptyGear);const [editId,setEditId]=useState(null);const [q,setQ]=useState('');const [categoryFilter,setCategoryFilter]=useState('');const [locationFilter,setLocationFilter]=useState('')
 const categories=[...new Set(gear.map(g=>g.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'))
 const locations=[...new Set(gear.map(g=>g.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'))
 const filtered=gear.filter(g=>`${g.name} ${g.category} ${g.location} ${g.brand} ${g.notes}`.toLowerCase().includes(q.toLowerCase())&&(!categoryFilter||g.category===categoryFilter)&&(!locationFilter||g.location===locationFilter))
 async function save(e){e.preventDefault();const payload={...form,weight_g:Number(form.weight_g)||0,quantity:Math.max(0,Number(form.quantity)||0),price_chf:Number(form.price_chf)||0}
  const r=editId?await supabase.from('gear').update(payload).eq('id',editId):await supabase.from('gear').insert(payload)
  if(r.error)setMessage(r.error.message);else{setForm(emptyGear);setEditId(null);await refreshAll()}}
 async function updateQuantity(id,value){const quantity=Math.max(0,Math.round(Number(value)||0));const r=await supabase.from('gear').update({quantity}).eq('id',id);if(r.error)setMessage(r.error.message);else refreshAll()}
 async function del(id){if(!confirm('Artikel wirklich löschen?'))return;const r=await supabase.from('gear').delete().eq('id',id);if(r.error)setMessage(r.error.message);else refreshAll()}
 function edit(g){setEditId(g.id);setForm({name:g.name,category:g.category||'',weight_g:g.weight_g,quantity:g.quantity,location:g.location||'',brand:g.brand||'',price_chf:g.price_chf||'',notes:g.notes||''});window.scrollTo({top:0,behavior:'smooth'})}
 function printList(){window.print()}
 return <div className="grid"><form className="card span4 no-print" onSubmit={save}><h2>{editId?'Artikel bearbeiten':'Artikel erfassen'}</h2><Field label="Artikelname"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div className="two"><Field label="Kategorie"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></Field><Field label="Gewicht (g)"><input type="number" min="0" value={form.weight_g} onChange={e=>setForm({...form,weight_g:e.target.value})}/></Field><Field label="Menge"><input type="number" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field><Field label="Lagerplatz"><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></Field><Field label="Hersteller"><input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></Field><Field label="Preis (CHF)"><input type="number" step="0.05" min="0" value={form.price_chf} onChange={e=>setForm({...form,price_chf:e.target.value})}/></Field></div><Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><div className="actions"><button className="primary">Speichern</button>{editId&&<button type="button" className="secondary" onClick={()=>{setEditId(null);setForm(emptyGear)}}>Abbrechen</button>}</div></form><section className="card span8 print-card"><div className="section-title"><div><h2>Ausrüstungslager</h2><p className="print-only">Gefilterte Artikelliste · {new Date().toLocaleDateString('de-CH')}</p></div><button type="button" className="secondary no-print" onClick={printList}>Artikelliste drucken</button></div><div className="filterbar no-print"><input className="search" placeholder="Artikel, Hersteller oder Notizen suchen" value={q} onChange={e=>setQ(e.target.value)}/><select aria-label="Kategorie filtern" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">Alle Kategorien</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><select aria-label="Lagerplatz filtern" value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}><option value="">Alle Lagerplätze</option>{locations.map(l=><option key={l} value={l}>{l}</option>)}</select><button type="button" className="secondary" onClick={()=>{setQ('');setCategoryFilter('');setLocationFilter('')}}>Filter zurücksetzen</button></div><div className="filter-summary">{filtered.length} von {gear.length} Artikeln</div><div className="tablewrap"><table className="gear-table"><thead><tr><th>Artikel</th><th>Kategorie</th><th>Menge</th><th>Einzelgewicht</th><th>Gesamtgewicht</th><th>Lagerplatz</th><th className="no-print"></th></tr></thead><tbody>{filtered.map(g=><tr key={g.id} draggable onDragStart={e=>e.dataTransfer.setData('gearId',g.id)}><td><strong>{g.name}</strong><small>{g.brand}</small></td><td>{g.category||'–'}</td><td><input className="qty-input no-print" type="number" min="0" value={g.quantity} onChange={e=>updateQuantity(g.id,e.target.value)}/><span className="print-only">{g.quantity}</span></td><td>{weight(g.weight_g)}</td><td>{weight(g.weight_g*g.quantity)}</td><td>{g.location||'–'}</td><td className="no-print"><button className="smallbtn" onClick={()=>edit(g)}>Bearbeiten</button><button className="smallbtn danger" onClick={()=>del(g.id)}>Löschen</button></td></tr>)}</tbody></table></div>{!filtered.length&&<Empty/>}</section></div>
}

function ListsView({gear,lists,listItems,refreshAll,setMessage}){
 const [name,setName]=useState('');const [desc,setDesc]=useState('');const [q,setQ]=useState('');const [openLists,setOpenLists]=useState({})
 async function create(e){e.preventDefault();const r=await supabase.from('pack_lists').insert({name,description:desc});if(r.error)setMessage(r.error.message);else{setName('');setDesc('');refreshAll()}}
 async function add(listId,gearId){if(!gearId)return;const existing=listItems.find(x=>x.pack_list_id===listId&&x.gear_id===gearId);const maxQty=gear.find(g=>g.id===gearId)?.quantity||1;const next=Math.min(maxQty,(existing?.quantity||0)+1);const r=existing?await supabase.from('pack_list_items').update({quantity:next}).eq('id',existing.id):await supabase.from('pack_list_items').insert({pack_list_id:listId,gear_id:gearId,quantity:1});if(r.error)setMessage(r.error.message);else refreshAll()}
 async function updateListQuantity(item,value){const available=gear.find(g=>g.id===item.gear_id)?.quantity||0;const quantity=Math.max(0,Math.min(available,Math.round(Number(value)||0)));if(quantity===0)return remove(item.id);const r=await supabase.from('pack_list_items').update({quantity}).eq('id',item.id);if(r.error)setMessage(r.error.message);else refreshAll()}
 async function remove(id){const r=await supabase.from('pack_list_items').delete().eq('id',id);if(r.error)setMessage(r.error.message);else refreshAll()}
 async function deleteList(id){if(confirm('Packliste löschen?')){const r=await supabase.from('pack_lists').delete().eq('id',id);if(r.error)setMessage(r.error.message);else refreshAll()}}
 const filteredGear=gear.filter(g=>`${g.name} ${g.location} ${g.category}`.toLowerCase().includes(q.toLowerCase()))
 return <div className="grid"><aside className="card span4"><form onSubmit={create}><h2>Neue Packliste</h2><Field label="Name"><input required value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Beschreibung"><textarea value={desc} onChange={e=>setDesc(e.target.value)}/></Field><button className="primary">Erstellen</button></form><hr/><h3>Artikel ziehen</h3><input className="search" placeholder="Artikel suchen" value={q} onChange={e=>setQ(e.target.value)}/><div className="drag-list">{filteredGear.map(g=><div draggable onDragStart={e=>e.dataTransfer.setData('gearId',g.id)} className="drag-item" key={g.id}><strong>{g.name}</strong><small>{weight(g.weight_g)} · Menge {g.quantity} · {g.location||'Kein Lagerplatz'}</small></div>)}</div></aside><section className="span8">{lists.map(l=>{const items=listItems.filter(i=>i.pack_list_id===l.id);const total=items.reduce((s,i)=>s+(gear.find(g=>g.id===i.gear_id)?.weight_g||0)*i.quantity,0);const open=Boolean(openLists[l.id]);return <article className={`card listcard ${open?'expanded':'collapsed'}`} key={l.id} draggable onDragStart={e=>e.dataTransfer.setData('listId',l.id)} onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drop')}} onDragLeave={e=>e.currentTarget.classList.remove('drop')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drop');add(l.id,e.dataTransfer.getData('gearId'))}}><div className="listhead"><div><h2>{l.name}</h2><p>{l.description}</p><small>{items.length} verschiedene Artikel</small></div><div className="list-actions"><b>{weight(total)}</b><button className="secondary" onClick={()=>setOpenLists({...openLists,[l.id]:!open})}>{open?'Inhalt ausblenden':'Inhalt anzeigen'}</button><button className="smallbtn danger" onClick={()=>deleteList(l.id)}>Löschen</button></div></div>{open&&<><div className="drop-hint">Artikel hier ablegen</div><Field label="Artikel über Dropdown hinzufügen"><select defaultValue="" onChange={e=>{add(l.id,e.target.value);e.target.value=''}}><option value="">Artikel auswählen</option>{gear.map(g=><option key={g.id} value={g.id}>{g.name} – Menge {g.quantity} – {weight(g.weight_g)} – {g.location||'kein Lagerplatz'}</option>)}</select></Field><div className="tablewrap"><table><thead><tr><th>Artikel</th><th>Menge in Liste</th><th>Verfügbar</th><th>Gewicht</th><th></th></tr></thead><tbody>{items.map(i=>{const g=gear.find(x=>x.id===i.gear_id);return g?<tr key={i.id}><td>{g.name}<small>{g.location||'Kein Lagerplatz'}</small></td><td><input className="qty-input" type="number" min="0" max={g.quantity} value={i.quantity} onChange={e=>updateListQuantity(i,e.target.value)}/></td><td>{g.quantity}</td><td>{weight(g.weight_g*i.quantity)}</td><td><button className="smallbtn danger" onClick={()=>remove(i.id)}>Entfernen</button></td></tr>:null})}</tbody></table></div>{!items.length&&<Empty/>}</>}</article>})}{!lists.length&&<div className="card"><Empty/></div>}</section></div>
}

function WishlistView({wishlist,refreshAll,setMessage}){
 const [form,setForm]=useState(emptyWish);const [editId,setEditId]=useState(null)
 async function save(e){e.preventDefault();const payload={...form,weight_g:Number(form.weight_g)||0,price_chf:Number(form.price_chf)||0};const r=editId?await supabase.from('wishlist').update(payload).eq('id',editId):await supabase.from('wishlist').insert(payload);if(r.error)setMessage(r.error.message);else{setForm(emptyWish);setEditId(null);refreshAll()}}
 async function del(id){await supabase.from('wishlist').delete().eq('id',id);refreshAll()}
 return <div className="grid"><form className="card span4" onSubmit={save}><h2>Wunsch erfassen</h2><Field label="Artikelname"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><div className="two"><Field label="Kategorie"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></Field><Field label="Gewicht (g)"><input type="number" value={form.weight_g} onChange={e=>setForm({...form,weight_g:e.target.value})}/></Field><Field label="Preis (CHF)"><input type="number" step="0.05" value={form.price_chf} onChange={e=>setForm({...form,price_chf:e.target.value})}/></Field><Field label="Priorität"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>Hoch</option><option>Mittel</option><option>Tief</option></select></Field></div><Field label="Produktlink"><input value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></Field><Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><button className="primary">Speichern</button></form><section className="card span8"><h2>Wunschliste</h2><div className="tablewrap"><table><thead><tr><th>Artikel</th><th>Gewicht</th><th>Preis</th><th>Priorität</th><th></th></tr></thead><tbody>{wishlist.map(w=><tr key={w.id}><td>{w.url?<a href={w.url} target="_blank">{w.name}</a>:w.name}<small>{w.category}</small></td><td>{weight(w.weight_g)}</td><td>{money(w.price_chf)}</td><td>{w.priority}</td><td><button className="smallbtn" onClick={()=>{setEditId(w.id);setForm({...w})}}>Bearbeiten</button><button className="smallbtn danger" onClick={()=>del(w.id)}>Löschen</button></td></tr>)}</tbody></table></div>{!wishlist.length&&<Empty/>}</section></div>
}

function CompareView({gear,lists,listItems}){
 const [a,setA]=useState(''),[b,setB]=useState(''),[la,setLa]=useState(''),[lb,setLb]=useState('')
 const listWeight=id=>listItems.filter(i=>i.pack_list_id===id).reduce((s,i)=>s+(gear.find(g=>g.id===i.gear_id)?.weight_g||0)*i.quantity,0)
 const itemA=gear.find(g=>g.id===a),itemB=gear.find(g=>g.id===b),listA=lists.find(l=>l.id===la),listB=lists.find(l=>l.id===lb)
 const gearLabel=g=>`${g.name} – Menge ${g.quantity} – ${weight(g.weight_g)} – ${g.location||'kein Lagerplatz'}`
 return <div className="stack"><section className="card"><h2>Artikel vergleichen</h2><p className="muted">Artikel per Drag-and-drop ablegen oder bequem über die Dropdowns auswählen.</p><div className="compare-selects"><Field label="Artikel A auswählen"><select value={a} onChange={e=>setA(e.target.value)}><option value="">Bitte auswählen</option>{gear.map(g=><option key={g.id} value={g.id}>{gearLabel(g)}</option>)}</select></Field><Field label="Artikel B auswählen"><select value={b} onChange={e=>setB(e.target.value)}><option value="">Bitte auswählen</option>{gear.map(g=><option key={g.id} value={g.id}>{gearLabel(g)}</option>)}</select></Field></div><DropCompare title="Artikel A" item={itemA} onDrop={setA} type="gearId"/><DropCompare title="Artikel B" item={itemB} onDrop={setB} type="gearId"/>{itemA&&itemB&&<Result a={itemA.weight_g} b={itemB.weight_g} an={itemA.name} bn={itemB.name}/>}<h3 className="drag-title">Artikel zum Ziehen</h3><div className="drag-grid">{gear.map(g=><div className="drag-item" draggable onDragStart={e=>e.dataTransfer.setData('gearId',g.id)} key={g.id}><strong>{g.name}</strong><small>{weight(g.weight_g)} · Menge {g.quantity} · {g.location||'Kein Lagerplatz'}</small></div>)}</div>{!gear.length&&<Empty/>}</section><section className="card"><h2>Packlisten vergleichen</h2><p className="muted">Packlisten per Drag-and-drop ablegen oder über die Dropdowns auswählen.</p><div className="compare-selects"><Field label="Packliste A auswählen"><select value={la} onChange={e=>setLa(e.target.value)}><option value="">Bitte auswählen</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name} – {listItems.filter(i=>i.pack_list_id===l.id).length} Artikel – {weight(listWeight(l.id))}</option>)}</select></Field><Field label="Packliste B auswählen"><select value={lb} onChange={e=>setLb(e.target.value)}><option value="">Bitte auswählen</option>{lists.map(l=><option key={l.id} value={l.id}>{l.name} – {listItems.filter(i=>i.pack_list_id===l.id).length} Artikel – {weight(listWeight(l.id))}</option>)}</select></Field></div><DropCompare title="Packliste A" item={listA} onDrop={setLa} type="listId" displayWeight={la?listWeight(la):null}/><DropCompare title="Packliste B" item={listB} onDrop={setLb} type="listId" displayWeight={lb?listWeight(lb):null}/>{listA&&listB&&<Result a={listWeight(la)} b={listWeight(lb)} an={listA.name} bn={listB.name}/>}<h3 className="drag-title">Packlisten zum Ziehen</h3><div className="drag-grid">{lists.map(l=><div className="drag-item" draggable onDragStart={e=>e.dataTransfer.setData('listId',l.id)} key={l.id}><strong>{l.name}</strong><small>{listItems.filter(i=>i.pack_list_id===l.id).length} Artikel · {weight(listWeight(l.id))}</small></div>)}</div>{!lists.length&&<Empty/>}</section></div>
}
function DropCompare({title,item,onDrop,type,displayWeight}){return <div className="compare-drop" onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drop')}} onDragLeave={e=>e.currentTarget.classList.remove('drop')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drop');const id=e.dataTransfer.getData(type);if(id)onDrop(id)}}><span>{title}</span>{item?<><strong>{item.name}</strong><b>{weight(displayWeight??item.weight_g)}</b></>:<em>Hier ablegen oder oben auswählen</em>}</div>}
function Result({a,b,an,bn}){const diff=Math.abs(a-b),text=a===b?'Beide sind gleich schwer.':a<b?`${an} ist ${weight(diff)} leichter.`:`${bn} ist ${weight(diff)} leichter.`;return <div className="result"><div><strong>{an}</strong><b>{weight(a)}</b></div><div><strong>{bn}</strong><b>{weight(b)}</b></div><p>{text}</p></div>}

function ImportView({refreshAll,setMessage}){
 const [file,setFile]=useState(null);const [mode,setMode]=useState('add');const [status,setStatus]=useState('')
 async function run(){if(!file)return setStatus('Bitte zuerst eine CSV-Datei auswählen.');try{const text=await file.text();const rows=parseCsv(text);if(rows.length<2)throw new Error('Keine Datenzeilen gefunden.');const headers=rows[0].map(normalize);const aliases={name:['name','itemname','artikel','artikelname'],category:['category','kategorie'],description:['desc','description','beschreibung'],qty:['qty','quantity','menge','anzahl'],weight:['weight','gewicht','gewichtg'],unit:['unit','einheit'],url:['url','link'],price:['price','preis','preischf'],worn:['worn','getragen'],consumable:['consumable','verbrauchsartikel'],location:['location','lagerplatz','lagerort'],brand:['brand','hersteller','marke'],notes:['notes','notizen']};const idx={};Object.entries(aliases).forEach(([k,v])=>idx[k]=headers.findIndex(h=>v.includes(h)));if(idx.name<0)throw new Error('Spalte Item Name, Name oder Artikelname fehlt.');const existing=(await supabase.from('gear').select('id,name')).data||[];let added=0,updated=0,skipped=0;for(const row of rows.slice(1)){const val=k=>idx[k]>=0?String(row[idx[k]]??'').trim():'';if(!val('name')){skipped++;continue}let g=num(val('weight'));const u=val('unit').toLowerCase();if(u==='kg')g*=1000;else if(['oz','ounce','ounces'].includes(u))g*=28.349523125;else if(['lb','lbs'].includes(u))g*=453.59237;const notes=[val('description'),val('notes'),val('url')&&`Link: ${val('url')}`,truthy(val('worn'))&&'Getragen',truthy(val('consumable'))&&'Verbrauchsartikel'].filter(Boolean).join(' · ');const payload={name:val('name'),category:val('category')||'Ohne Kategorie',weight_g:Math.round(g),quantity:Math.max(1,Math.round(num(val('qty'))||1)),location:val('location'),brand:val('brand'),price_chf:num(val('price')),notes};const match=existing.find(x=>x.name.trim().toLowerCase()===payload.name.trim().toLowerCase());if(mode==='update'&&match){const r=await supabase.from('gear').update(payload).eq('id',match.id);r.error?skipped++:updated++}else{const r=await supabase.from('gear').insert(payload);r.error?skipped++:added++}}setStatus(`${added} ergänzt, ${updated} aktualisiert, ${skipped} übersprungen.`);refreshAll()}catch(e){setStatus(e.message)}}
 return <section className="card import-card"><h2>CSV-Import</h2><p>Unterstützt dein LighterPack-Format mit <code>Item Name, Category, desc, qty, weight, unit, url, price, worn, consumable</code> sowie deutsche Spaltennamen.</p><Field label="CSV-Datei"><input type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files[0])}/></Field><Field label="Importverhalten"><select value={mode} onChange={e=>setMode(e.target.value)}><option value="add">Alle Artikel ergänzen</option><option value="update">Gleichnamige Artikel aktualisieren</option></select></Field><button className="primary" onClick={run}>CSV importieren</button>{status&&<div className="notice">{status}</div>}</section>
}

function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
const normalize=s=>String(s).toLowerCase().replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/[^a-z0-9]/g,'')
const num=s=>{let v=String(s||'').trim().replace(/\s/g,'');if(v.includes(',')&&!v.includes('.'))v=v.replace(',','.');else if(v.includes(',')&&v.includes('.'))v=v.lastIndexOf(',')>v.lastIndexOf('.')?v.replace(/\./g,'').replace(',','.'):v.replace(/,/g,'');return Number(v)||0}
const truthy=s=>['1','true','yes','ja','x'].includes(String(s).trim().toLowerCase())
function parseCsv(text){const first=(text.split(/\r?\n/).find(l=>l.trim())||'');const candidates=[';',',','\t'];const delimiter=candidates.sort((a,b)=>(first.split(b).length-first.split(a).length))[0];const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'){if(quote&&n==='"'){cell+='"';i++}else quote=!quote}else if(c===delimiter&&!quote){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);return rows}

createRoot(document.getElementById('root')).render(<App />)
