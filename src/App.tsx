import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle, Briefcase, Wallet, 
  Percent, ChevronUp, AlertTriangle, Monitor, Database, Terminal, Cpu,
  Globe, LayoutDashboard, ListChecks, ArrowRightCircle, Scale, Coins
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÃO SUPABASE ---
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// =============================================================================
// --- ESTRUTURAS DE REFERÊNCIA ---
// =============================================================================

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', desc: 'Leads iniciais' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', desc: 'Propostas enviadas' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', desc: 'Ajuste de valores' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', desc: 'Venda convertida' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', desc: 'Oportunidade perdida' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
];

export default function CRMMasterFinalUltra() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 8, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 } } as any,
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- PERSISTÊNCIA ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) await supabase.from('leads').update(payload).eq('id', id);
  };

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("leadId", id);
  const onDrop = (e: React.DragEvent, newStage: string) => {
    const id = e.dataTransfer.getData("leadId");
    updateLead(id, { stage: newStage });
  };

  // ===========================================================================
  // --- ANALYTICS & REGRAS DE COMISSÃO (RESGATADAS) ---
  // ===========================================================================

  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const searched = active.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const won = active.filter(l => l.stage === 'fechado');
    const funnelSteps = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociacao: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: active.filter(l => l.stage === 'perdido').length
    };

    const kpis = {
      conv: active.length > 0 ? (won.length / active.length) * 100 : 0,
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      fup: funnelSteps.orcamento > 0 ? (active.filter(l => l.followUp).length / funnelSteps.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0
    };

    // --- CÁLCULO DE COMISSÃO ---
    const totalRev = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRev / goals.revenue) * 100;
    const isMarginOk = commSettings.profitMargin >= 12;

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const accel_conv = kpis.conv >= goals.conversion ? 0.5 : 0;
    const accel_cross = kpis.cross >= goals.crossSell ? 0.5 : 0;
    const accel_up = kpis.up >= goals.upSell ? 0.5 : 0;
    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;
    
    const fixedBonus = funnelSteps.contato >= goals.contacts ? 300 : 0;
    const totalComm = (totalRev * (finalRate / 100)) + fixedBonus;

    return { searched, funnelSteps, kpis, totalRev, revPerf, finalRate, totalComm, isMarginOk, fixedBonus, active };
  }, [leads, searchTerm, commSettings, goals]);

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-black italic">CARREGANDO...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-6 text-[10px]">
      
      {/* HEADER PRINCIPAL */}
      <header className="max-w-[1850px] mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-blue-500 shadow-xl rotate-3"><TrendingUp size={28}/></div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 underline decoration-blue-500 decoration-4">SALES<span className="text-blue-600">ULTRA</span></h1>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-full shadow-lg border-2 border-white">
          <div className="flex bg-slate-100 p-1 rounded-full mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-1.5 rounded-full font-black text-[9px] transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>W0{w}</button>
            ))}
          </div>
          {['pipeline', 'metrics', 'funnel', 'commission'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-full font-black uppercase transition-all ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{t}</button>
          ))}
          <div className="relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Localizar Lead..." className="pl-9 pr-4 py-2 bg-slate-100 rounded-full outline-none w-44 font-bold focus:w-60 transition-all" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-all ml-1"><PlusCircle size={22}/></button>
        </div>
      </header>

      {/* VIEW: PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* LEGENDA DE TAGS */}
          <div className="flex gap-4 justify-center bg-white/50 p-3 rounded-2xl border border-white max-w-fit mx-auto">
             {AVAILABLE_TAGS.map(tag => (
               <div key={tag.id} className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full ${tag.color}`} />
                 <span className="font-black text-slate-400 uppercase text-[8px]">{tag.label}</span>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STAGES.map(stage => {
              const stageLeads = analytics.searched.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
              const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

              return (
                <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, stage.id)} className="bg-slate-200/40 rounded-[2.5rem] p-4 flex flex-col min-h-[800px] border border-slate-300/30">
                  <div className="mb-5 px-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black uppercase text-slate-500 tracking-[0.2em] text-[8px]">{stage.label}</span>
                      <span className="bg-white px-2 py-0.5 rounded-lg text-[9px] font-black border shadow-sm text-slate-700">{stageLeads.length}</span>
                    </div>
                    <div className="text-xl font-black italic text-slate-900 tracking-tighter">R$ {stageTotal.toLocaleString('pt-BR')}</div>
                  </div>

                  <div className="space-y-4 overflow-y-auto pr-1">
                    {stageLeads.map(lead => (
                      <div key={lead.id} draggable onDragStart={e => onDragStart(e, lead.id)} className="bg-white p-5 rounded-[2rem] shadow-md border-2 border-white hover:border-blue-100 transition-all cursor-grab active:cursor-grabbing group">
                        
                        {/* TAGS NO CARD */}
                        <div className="flex flex-wrap gap-1 mb-3">
                           {lead.tags?.split(',').filter((t:any)=>t).map((tId:any) => {
                             const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                             return tag && <div key={tId} className={`w-2 h-2 rounded-full ${tag.color}`} title={tag.label} />;
                           })}
                        </div>

                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-slate-900 uppercase leading-tight truncate pr-4 text-[11px]">{lead.name}</h4>
                          <button onClick={() => supabase?.from('leads').delete().eq('id', lead.id).then(fetchLeads)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                        </div>

                        {/* VALOR EDITÁVEL NO CARD */}
                        <div className="flex items-center text-emerald-600 font-black mb-4">
                           <span className="mr-1 italic text-[9px]">R$</span>
                           <input 
                             type="number" 
                             className="bg-transparent border-none p-0 focus:ring-0 font-black italic text-base w-full outline-none"
                             value={lead.value}
                             onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <MiniBtn label="FUP" active={lead.followUp} onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-500" />
                          <MiniBtn label="UP" active={lead.hasUpSell} onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-600" />
                          <MiniBtn label="CROSS" active={lead.hasCrossSell} onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-blue-600" />
                          <MiniBtn label="PÓS" active={lead.postSale} onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: METRICS (KPIs TÉCNICOS) */}
      {activeTab === 'metrics' && (
        <div className="max-w-6xl mx-auto space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Taxa de Conversão" val={analytics.kpis.conv.toFixed(1) + "%"} meta={goals.conversion + "%"} icon={<Target className="text-blue-500"/>} />
              <StatCard label="Ticket Médio" val={"R$ " + (analytics.totalRev / (analytics.funnelSteps.fechado || 1)).toFixed(0)} meta={"R$ " + goals.ticket} icon={<Coins className="text-emerald-500"/>} />
              <StatCard label="Recuperação" val={analytics.kpis.react} meta={goals.reactivated} icon={<RotateCcw className="text-purple-500"/>} />
              <StatCard label="Adesão Pós-Venda" val={analytics.kpis.post.toFixed(1) + "%"} meta={goals.postSale + "%"} icon={<CheckCircle2 className="text-indigo-500"/>} />
           </div>

           <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[9px] uppercase font-black">
                  <tr>
                    <th className="p-8">Indicador Crítico</th>
                    <th className="p-8 text-center">Referência</th>
                    <th className="p-8 text-center">Realizado</th>
                    <th className="p-8 text-center">Eficiência</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-slate-700">
                  <KPILine label="Conversão Geral de Funil" meta={goals.conversion + "%"} val={analytics.kpis.conv.toFixed(1) + "%"} perf={analytics.kpis.conv / goals.conversion * 100} />
                  <KPILine label="Aproveitamento de Up-Sell" meta={goals.upSell + "%"} val={analytics.kpis.up.toFixed(1) + "%"} perf={analytics.kpis.up / goals.upSell * 100} />
                  <KPILine label="Aproveitamento de Cross-Sell" meta={goals.crossSell + "%"} val={analytics.kpis.cross.toFixed(1) + "%"} perf={analytics.kpis.cross / goals.crossSell * 100} />
                  <KPILine label="Follow-up em Orçamentos" meta={goals.followUp + "%"} val={analytics.kpis.fup.toFixed(1) + "%"} perf={analytics.kpis.fup / goals.followUp * 100} />
                  <KPILine label="Captação de Novos Leads" meta={goals.contacts} val={analytics.funnelSteps.contato} perf={analytics.funnelSteps.contato / goals.contacts * 100} />
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VIEW: FUNIL */}
      {activeTab === 'funnel' && (
        <div className="max-w-4xl mx-auto space-y-4 pt-10">
          <FunnelBar label="PROSPECÇÃO TOTAL" count={analytics.funnelSteps.contato} color="bg-slate-400" width="100%" />
          <FunnelBar label="PROPOSTAS / ORÇAMENTOS" count={analytics.funnelSteps.orcamento} color="bg-blue-500" width={(analytics.funnelSteps.orcamento/analytics.funnelSteps.contato*100) + "%"} />
          <FunnelBar label="EM NEGOCIAÇÃO" count={analytics.funnelSteps.negociacao} color="bg-amber-500" width={(analytics.funnelSteps.negociacao/analytics.funnelSteps.contato*100) + "%"} />
          <FunnelBar label="VENDAS CONCLUÍDAS" count={analytics.funnelSteps.fechado} color="bg-emerald-500" width={(analytics.funnelSteps.fechado/analytics.funnelSteps.contato*100) + "%"} />
          <FunnelBar label="LEADS PERDIDOS" count={analytics.funnelSteps.perdido} color="bg-rose-500" width={(analytics.funnelSteps.perdido/analytics.funnelSteps.contato*100) + "%"} />
        </div>
      )}

      {/* VIEW: COMISSÃO (REGRAS OFICIAIS) */}
      {activeTab === 'commission' && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden transition-all ${analytics.isMarginOk ? 'bg-slate-900' : 'bg-rose-900'}`}>
              <DollarSign size={200} className="absolute -right-10 -bottom-10 opacity-5" />
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <p className="text-blue-400 font-black uppercase tracking-widest mb-2">Comissão Líquida</p>
                    <h2 className="text-8xl font-black italic tracking-tighter">R$ {analytics.totalComm.toLocaleString('pt-BR')}</h2>
                 </div>
                 {!analytics.isMarginOk && <div className="bg-white text-rose-600 px-6 py-2 rounded-full font-black animate-pulse">MARGEM ABAIXO DE 12%</div>}
              </div>
              <div className="grid grid-cols-4 gap-4 pt-10 border-t border-white/10">
                <MiniStat label="ALÍQUOTA FINAL" val={analytics.finalRate.toFixed(2) + "%"} />
                <MiniStat label="BÔNUS FIXO" val={"R$ " + analytics.fixedBonus} />
                <MiniStat label="PERF. META" val={analytics.revPerf.toFixed(1) + "%"} />
                <MiniStat label="MARGEM" val={commSettings.profitMargin + "%"} />
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
              <h3 className="font-black uppercase italic mb-8 flex items-center gap-3"><Scale size={20} className="text-blue-600"/> Algoritmo de Pagamento</h3>
              <div className="grid gap-4">
                 <Rule label="ALÍQUOTA BASE (FATURAMENTO)" desc="90% Meta (1.5%) | 100% Meta (2.5%) | 110% Meta (3.5%)" status={analytics.revPerf >= 90} />
                 <Rule label="BÔNUS FIXO CAPTAÇÃO" desc="R$ 300,00 se atingir +400 leads na prospecção." status={analytics.funnelSteps.contato >= goals.contacts} />
                 <Rule label="ACELERADOR CONVERSÃO" desc="+0.5% na alíquota se atingir meta de fechamento." status={analytics.kpis.conv >= goals.conversion} />
                 <Rule label="ACELERADOR CROSS-SELL" desc="+0.5% na alíquota se bater meta de Cross-sell." status={analytics.kpis.cross >= goals.crossSell} />
                 <Rule label="ACELERADOR UP-SELL" desc="+0.5% na alíquota se bater meta de Up-sell." status={analytics.kpis.up >= goals.upSell} />
                 <Rule label="TRAVA DE SEGURANÇA" desc="Comissão zerada se a margem for < 12%." status={analytics.isMarginOk} critical />
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <label className="font-black uppercase italic text-slate-400 text-[9px] mb-4 block">Parâmetros de Gestão</label>
                <div className="space-y-6">
                   <div className="p-5 bg-slate-50 rounded-3xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Meta Mensal de Receita</p>
                      <input type="number" value={goals.revenue} onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} className="w-full bg-transparent font-black text-2xl outline-none" />
                   </div>
                   <div className="p-5 bg-slate-50 rounded-3xl border-2 border-blue-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Margem Real de Lucro (%)</p>
                      <input type="number" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} className="w-full bg-transparent font-black text-2xl outline-none" />
                   </div>
                </div>
             </div>
             <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
                <p className="font-black uppercase italic text-[9px] text-blue-400 mb-4">Lançamento por Semana</p>
                <div className="space-y-4">
                   {[1,2,3,4].map(w => (
                     <div key={w} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="font-black opacity-40">SEM 0{w}</span>
                        <input type="number" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} className="bg-transparent text-right font-black outline-none w-24" />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative border-t-[15px] border-blue-600">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500"><X size={32}/></button>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-10 leading-none">Novo<br/>Lead</h2>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Empresa / Contato</label>
                <input className="w-full p-6 bg-slate-100 rounded-3xl font-black text-xl outline-none focus:ring-4 ring-blue-50" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-4">Valor da Oportunidade (R$)</label>
                <input type="number" className="w-full p-6 bg-slate-100 rounded-3xl font-black text-xl outline-none focus:ring-4 ring-blue-50" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
              </div>
              <button 
                onClick={async () => {
                  if (supabase) await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString(), week: currentWeek}]);
                  setIsModalOpen(false);
                  fetchLeads();
                  setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }}
                className="w-full p-8 bg-blue-600 text-white rounded-full font-black uppercase text-xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-4"
              >
                CRIAR LEAD <ArrowRight/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES ---
// =============================================================================

const MiniBtn = ({ label, active, onClick, color }: any) => (
  <button onClick={onClick} className={`py-2 rounded-xl font-black text-[7px] border transition-all ${active ? `${color} text-white border-transparent shadow-md` : 'bg-white text-slate-300 border-slate-100'}`}>{label}</button>
);

const StatCard = ({ label, val, meta, icon }: any) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-white flex items-center gap-5 transition-all hover:shadow-md">
    <div className="bg-slate-50 p-4 rounded-2xl">{icon}</div>
    <div>
       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
       <p className="text-xl font-black italic text-slate-900">{val}</p>
       <p className="text-[7px] font-bold text-slate-300">Meta: {meta}</p>
    </div>
  </div>
);

const KPILine = ({ label, meta, val, perf }: any) => (
  <tr className="hover:bg-slate-50 transition-all">
    <td className="p-8 text-[11px] font-black uppercase tracking-tight text-slate-900">{label}</td>
    <td className="p-8 text-center text-slate-400 italic">{meta}</td>
    <td className="p-8 text-center"><span className="bg-blue-50 text-blue-700 px-4 py-1 rounded-full">{val}</span></td>
    <td className="p-8">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${perf >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(perf, 100)}%` }} />
        </div>
        <span className="font-black text-[10px] w-10">{perf.toFixed(0)}%</span>
      </div>
    </td>
  </tr>
);

const FunnelBar = ({ label, count, color, width }: any) => (
  <div className="flex items-center gap-6 group">
    <div className={`h-14 ${color} rounded-2xl shadow-lg flex items-center justify-between px-10 text-white transition-all hover:scale-[1.01]`} style={{ width }}>
      <span className="font-black uppercase italic tracking-widest text-[9px]">{label}</span>
      <span className="font-black text-2xl font-mono">{count}</span>
    </div>
    <div className="text-slate-300 font-black text-2xl italic">{width}</div>
  </div>
);

const MiniStat = ({ label, val }: any) => (
  <div className="text-center">
    <p className="text-[7px] font-black opacity-50 uppercase mb-1 tracking-widest">{label}</p>
    <p className="text-lg font-black italic">{val}</p>
  </div>
);

const Rule = ({ label, desc, status, critical }: any) => (
  <div className={`flex items-start gap-4 p-4 rounded-3xl border ${status ? 'bg-emerald-50 border-emerald-100' : critical ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
    {status ? <CheckCircle2 className="text-emerald-500" size={20}/> : <AlertCircle className={critical ? 'text-rose-500' : 'text-slate-300'} size={20}/>}
    <div>
      <p className="font-black uppercase tracking-tighter text-[11px]">{label}</p>
      <p className="font-bold opacity-60 text-[9px]">{desc}</p>
    </div>
  </div>
);
