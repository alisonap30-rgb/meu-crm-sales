import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, Gauge, Clock, RotateCcw, 
  FileSpreadsheet, History, X, ArrowRightCircle, CheckCircle2, 
  AlertCircle, LayoutDashboard, Coins, PieChart, Zap as ZapIcon,
  Search, Rocket, Trophy, Scale, ShieldCheck, ZapOff, AlertTriangle,
  Check, Activity, ArrowDownWideNarrow
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÕES ---
// =============================================================================

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "", 
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600' }
];

export default function UltraCRMEnterprise() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const [goals, setGoals] = useState({ revenue: 100000, ticket: 5000, contacts: 400, reactivated: 8 });
  const [commSettings, setCommSettings] = useState({ weeks: { 1: 0, 2: 0, 3: 0, 4: 0 }, profitMargin: 15 });

  // =============================================================================
  // --- DATABASE OPERATIONS (CORRIGIDO) ---
  // =============================================================================

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('leads').select('*').eq('isArchived', false).order('lastUpdate', { ascending: false });
      if (!error) setLeads(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleCreateLead = async () => {
    if (!newLeadName) return;
    const newLead = {
      name: newLeadName.toUpperCase(),
      value: 0,
      stage: 'contato',
      tags: '',
      isArchived: false,
      lastUpdate: new Date().toISOString()
    };
    const { data, error } = await supabase.from('leads').insert([newLead]).select();
    if (!error && data) {
      setLeads([data[0], ...leads]);
      setIsModalOpen(false);
      setNewLeadName("");
    }
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from('leads').update({ isArchived: true }).eq('id', id);
  };

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    await supabase.from('leads').update(payload).eq('id', id);
  };

  const toggleTag = (lead: any, tagId: string) => {
    const current = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = current.includes(tagId) ? current.filter((t: string) => t !== tagId) : [...current, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- BRAIN ENGINE (REGRA DE MARGEM ALTERADA) ---
  // =============================================================================

  const brain = useMemo(() => {
    const wonLeads = leads.filter(l => l.stage === 'fechado');
    const totalRevReal = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b), 0);
    const revPerf = (totalRevReal / goals.revenue) * 100;

    const kpis = {
      revenue: totalRevReal,
      count: leads.length,
      wonCount: wonLeads.length,
      tm: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / wonLeads.length) : 0,
      conv: leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0,
      cross: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      up: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      fup: leads.filter(l => l.followUp).length / (leads.length || 1) * 100,
      post: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      react: leads.filter(l => l.reactivated).length
    };

    // NOVA REGRA: Margem < 0 trava apenas aceleradores (0.5% cada)
    const canPayAccelerators = commSettings.profitMargin > 0;

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const accel = {
      ticket: (canPayAccelerators && kpis.tm >= goals.ticket) ? 0.5 : 0,
      conv: (canPayAccelerators && kpis.conv >= 5) ? 0.5 : 0,
      cross: (canPayAccelerators && kpis.cross >= 40) ? 0.5 : 0,
      up: (canPayAccelerators && kpis.up >= 15) ? 0.5 : 0
    };

    const finalRate = baseRate + accel.ticket + accel.conv + accel.cross + accel.up;
    
    // Combo bônus (R$ 300) também exige margem > 0
    const qualifiesBonus300 = canPayAccelerators && kpis.count >= goals.contacts && kpis.fup >= 90 && kpis.post >= 100 && kpis.react >= goals.reactivated;
    
    return { kpis, finalRate, finalCommission: (totalRevReal * (finalRate / 100)) + (qualifiesBonus300 ? 300 : 0), revPerf, accel, canPayAccelerators, qualifiesBonus300 };
  }, [leads, goals, commSettings]);

  // =============================================================================
  // --- UI RENDER ---
  // =============================================================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans text-slate-900">
      <aside className={`bg-slate-950 text-white transition-all duration-700 flex flex-col z-[100] ${sidebarOpen ? 'w-[360px]' : 'w-[100px]'}`}>
        <div className="p-10 flex items-center gap-6 border-b border-white/5">
           <div className="bg-blue-600 p-4 rounded-3xl shadow-blue-500/20"><ZapIcon size={28}/></div>
           {sidebarOpen && <h1 className="text-2xl font-black italic uppercase italic">Ultra<span className="text-blue-500">Sales</span></h1>}
        </div>
        <nav className="p-6 flex-1 space-y-3">
           <SidebarLink icon={<LayoutDashboard/>} label="Pipeline" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
           <SidebarLink icon={<Coins/>} label="Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
           <SidebarLink icon={<PieChart/>} label="Métricas" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />
           {sidebarOpen && (
             <div className="mt-10 space-y-6 animate-in fade-in duration-1000">
                <MetaInput label="Meta Faturamento" value={goals.revenue} onChange={(v:any) => setGoals({...goals, revenue: v})} />
                <MetaInput label="Meta Ticket Médio" value={goals.ticket} onChange={(v:any) => setGoals({...goals, ticket: v})} />
                <MetaInput label="Margem Lucro (%)" value={commSettings.profitMargin} onChange={(v:any) => setCommSettings({...commSettings, profitMargin: v})} isHighlight />
             </div>
           )}
        </nav>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-10 flex justify-center text-slate-500 hover:text-white"><ArrowDownWideNarrow/></button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-28 bg-white/80 backdrop-blur-xl border-b flex items-center justify-between px-12 z-50">
           <div className="flex items-center gap-8">
              <div className="relative">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="pl-14 pr-8 py-4 bg-slate-100 rounded-3xl outline-none w-[300px] font-bold" />
              </div>
           </div>
           <button onClick={() => setIsModalOpen(true)} className="bg-slate-950 text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3">
              <PlusCircle size={20}/> Registrar Proposta
           </button>
        </header>

        <div className="flex-1 overflow-auto p-12 custom-scrollbar">
          {activeTab === 'pipeline' && (
            <div className="flex gap-10 h-full min-w-[1800px] animate-in fade-in duration-700">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
                return (
                  <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={() => updateLead(draggedItem!, { stage: stage.id })} className="w-[360px] flex flex-col bg-slate-200/30 rounded-[3.5rem] p-7">
                    <div className="mb-8 px-4 flex justify-between items-end">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                          <span className="font-black uppercase text-slate-400 text-[10px] tracking-widest">{stage.label}</span>
                        </div>
                        <h3 className="text-2xl font-black italic">R$ {stageLeads.reduce((a, b) => a + (Number(b.value) || 0), 0).toLocaleString('pt-BR')}</h3>
                      </div>
                    </div>
                    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                      {stageLeads.map(lead => (
                        <div key={lead.id} draggable onDragStart={() => setDraggedItem(lead.id)} className="bg-white p-8 rounded-[3.2rem] shadow-sm border-2 border-transparent hover:border-blue-500 transition-all group relative">
                          <div className="flex justify-between gap-1 mb-6 p-2 bg-slate-50 rounded-full">
                            {AVAILABLE_TAGS.map(tag => (
                              <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-6 h-6 rounded-full border-2 ${lead.tags?.includes(tag.id) ? tag.color : 'bg-white border-slate-200'}`} />
                            ))}
                          </div>
                          <input className="font-black text-slate-950 uppercase text-sm bg-transparent border-none w-full outline-none" value={lead.name} onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })} />
                          <div className="flex items-center text-emerald-600 font-black mb-4">
                            <span className="text-xs mr-1">R$</span>
                            <input type="number" className="bg-transparent border-none font-black italic text-2xl w-full outline-none" value={lead.value} onChange={e => updateLead(lead.id, { value: Number(e.target.value) })} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <CardAction active={lead.followUp} label="FOLLOW-UP" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-400" />
                             <CardAction active={lead.hasUpSell} label="UP-SELL" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-400" />
                             <CardAction active={lead.hasCrossSell} label="CROSS" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-sky-400" />
                             <CardAction active={lead.reactivated} label="REATIVADO" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} color="bg-emerald-400" />
                          </div>
                          <button onClick={() => deleteLead(lead.id)} className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'commission' && (
             <div className="max-w-[1200px] mx-auto space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
                <div className="bg-slate-950 p-20 rounded-[5rem] text-white shadow-2xl relative overflow-hidden">
                   <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-[11px] mb-8 flex items-center gap-4"><ShieldCheck size={20}/> Auditoria de Remuneração V4.2</p>
                   <h2 className="text-[10rem] font-black italic tracking-tighter leading-none mb-12">R$ {brain.finalCommission.toLocaleString('pt-BR')}</h2>
                   {!brain.canPayAccelerators && (
                     <div className="bg-rose-500/20 p-6 rounded-3xl border border-rose-500 text-rose-500 font-black text-xs uppercase flex items-center gap-4 animate-pulse">
                        <ZapOff/> Margem de lucro ({commSettings.profitMargin}%) bloqueou aceleradores de 0,5%
                     </div>
                   )}
                   <div className="grid grid-cols-4 gap-12 pt-16 border-t border-white/10">
                      <AuditItem label="Alíquota Final" value={`${brain.finalRate.toFixed(2)}%`} />
                      <AuditItem label="Base Calculada" value={`R$ ${brain.kpis.revenue.toLocaleString('pt-BR')}`} />
                      <AuditItem label="Aceleradores" value={brain.canPayAccelerators ? "Ativos" : "Bloqueados"} isBlue />
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="bg-white p-12 rounded-[4rem] border space-y-8">
                      <h3 className="text-2xl font-black uppercase italic flex items-center gap-4"><Rocket className="text-blue-600"/> Aceleradores (0.5%)</h3>
                      <BonusRuleCard status={brain.accel.ticket > 0} label="Ticket Médio" target={`R$ ${goals.ticket}`} current={`R$ ${brain.kpis.tm.toFixed(0)}`} />
                      <BonusRuleCard status={brain.accel.conv > 0} label="Taxa Conversão" target="5.0%" current={`${brain.kpis.conv.toFixed(1)}%`} />
                   </div>
                   <div className="bg-slate-900 p-12 rounded-[4rem] text-white space-y-8">
                      <p className="font-black uppercase tracking-widest text-center text-blue-500">Lançamento Semanal</p>
                      {[1,2,3,4].map(w => (
                        <div key={w} className="flex justify-between items-center border-b border-white/10 pb-4">
                           <span className="text-xs font-black text-slate-500">SEMANA {w}</span>
                           <input type="number" value={commSettings.weeks[w as keyof typeof commSettings.weeks]} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: e.target.value}})} className="bg-transparent text-right font-black text-3xl outline-none focus:text-blue-500 w-1/2" />
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'metrics' && (
             <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-1000">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                   <MetricWidget label="Conversão" val={`${brain.kpis.conv.toFixed(1)}%`} meta="5.0%" icon={<Gauge/>} progress={brain.kpis.conv / 5 * 100} color="text-blue-500" />
                   <MetricWidget label="Follow-up" val={`${brain.kpis.fup.toFixed(1)}%`} meta="90.0%" icon={<Clock/>} progress={brain.kpis.fup / 90 * 100} color="text-amber-500" />
                   <MetricWidget label="Ticket Médio" val={`R$ ${brain.kpis.tm.toFixed(0)}`} meta={`R$ ${goals.ticket}`} icon={<TrendingUp/>} progress={brain.kpis.tm / goals.ticket * 100} color="text-emerald-500" />
                   <MetricWidget label="Reativação" val={brain.kpis.react} meta={goals.reactivated} icon={<RotateCcw/>} progress={brain.kpis.react / (goals.reactivated || 1) * 100} color="text-purple-500" />
                </div>
                <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden border">
                   <table className="w-full">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                         <tr>
                            <th className="p-10 text-left">Indicador Estratégico</th>
                            <th className="p-10 text-center">Meta</th>
                            <th className="p-10 text-center">Realizado</th>
                            <th className="p-10 text-right">Farol</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y font-bold">
                         <AuditTableRow label="Conversão Total" meta="5.0%" current={`${brain.kpis.conv.toFixed(1)}%`} status={brain.kpis.conv >= 5} />
                         <AuditTableRow label="Eficiência Follow-up" meta="90.0%" current={`${brain.kpis.fup.toFixed(1)}%`} status={brain.kpis.fup >= 90} />
                         <AuditTableRow label="Faturamento Mensal" meta={`R$ ${goals.revenue}`} current={`R$ ${brain.kpis.revenue}`} status={brain.revPerf >= 100} />
                      </tbody>
                   </table>
                </div>
             </div>
          )}
        </div>

        {/* MODAL DE ENTRADA (CORRIGIDO) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[999] flex items-center justify-center p-8">
             <div className="bg-white w-full max-w-2xl rounded-[4rem] p-16 shadow-2xl relative border-t-[20px] border-blue-600">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-all"><X size={32}/></button>
                <div className="mb-12">
                   <h2 className="text-6xl font-black italic uppercase leading-none">Novo<br/><span className="text-blue-600">Lead</span></h2>
                </div>
                <div className="space-y-8">
                   <input className="w-full p-8 bg-slate-100 rounded-3xl font-black text-3xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all" placeholder="NOME DO CLIENTE" value={newLeadName} onChange={e => setNewLeadName(e.target.value)} />
                   <button onClick={handleCreateLead} className="w-full py-10 bg-slate-950 text-white rounded-full font-black uppercase text-xl flex items-center justify-center gap-6 hover:bg-blue-600 transition-all">
                     Registrar Proposta <ArrowRightCircle size={32}/>
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// --- TOOLKIT UI ---
// =============================================================================

function SidebarLink({ icon, label, active, onClick, open }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-6 p-5 rounded-2xl transition-all group ${active ? 'bg-blue-600 text-white shadow-xl translate-x-2' : 'text-slate-500 hover:text-white'}`}>
      {icon} {open && <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>}
    </button>
  );
}

function MetaInput({ label, value, onChange, isHighlight }: any) {
  return (
    <div className="px-4">
      <label className={`text-[9px] font-black uppercase mb-2 block ${isHighlight ? 'text-blue-400' : 'text-slate-600'}`}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-transparent border-b border-white/10 text-white font-black text-xl py-2 outline-none focus:border-blue-500" />
    </div>
  );
}

function CardAction({ active, label, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`py-3 rounded-xl text-[9px] font-black text-black border-2 transition-all ${active ? `${color} border-transparent shadow-md` : 'bg-white border-slate-100'}`}>
      {label}
    </button>
  );
}

function AuditItem({ label, value, isBlue }: any) {
  return (
    <div className="text-center">
       <p className="text-[10px] font-black text-slate-500 uppercase mb-2">{label}</p>
       <p className={`text-4xl font-black italic ${isBlue ? 'text-blue-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function BonusRuleCard({ status, label, target, current }: any) {
  return (
    <div className={`p-6 rounded-3xl border-2 flex items-center gap-6 ${status ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
       <div className={`p-3 rounded-xl ${status ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{status ? <Check size={20}/> : <X size={20}/>}</div>
       <div>
          <h4 className="font-black uppercase text-xs">{label}</h4>
          <p className="text-[10px] font-bold text-slate-400">Meta: {target} | Real: {current}</p>
       </div>
    </div>
  );
}

function MetricWidget({ label, val, icon, meta, progress, color }: any) {
  const isOk = progress >= 100;
  return (
    <div className="bg-white p-10 rounded-[3rem] border shadow-sm hover:shadow-xl transition-all group">
       <div className="flex justify-between items-start mb-8">
          <div className={`p-5 rounded-2xl bg-slate-50 ${color}`}>{icon}</div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
             <p className="text-3xl font-black italic">{val}</p>
          </div>
       </div>
       <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase">
             <span className="text-slate-400">Meta: {meta}</span>
             <span className={isOk ? 'text-emerald-500' : 'text-rose-500'}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${isOk ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
          {/* FAROL VISUAL SEMANAL */}
          <div className="flex gap-2 pt-2">
             <div className={`h-2 w-full rounded-full ${progress >= 90 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
          </div>
       </div>
    </div>
  );
}

function AuditTableRow({ label, meta, current, status }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
       <td className="p-8 font-black text-slate-900 uppercase text-xs">{label}</td>
       <td className="p-8 text-center text-slate-400 font-black italic">{meta}</td>
       <td className="p-8 text-center"><span className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black italic">{current}</span></td>
       <td className="p-8 text-right">
          {status ? <div className="text-emerald-500 flex items-center justify-end gap-2 text-[10px] font-black uppercase"><CheckCircle2 size={16}/> Batida</div> : <div className="text-rose-400 flex items-center justify-end gap-2 text-[10px] font-black uppercase"><AlertCircle size={16}/> Pendente</div>}
       </td>
    </tr>
  );
}
