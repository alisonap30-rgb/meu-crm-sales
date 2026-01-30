import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle, Briefcase, Wallet, 
  Percent, ChevronUp, AlertTriangle, Monitor, Database, Terminal, Cpu
} from 'lucide-react';

// --- INTERFACES TÉCNICAS (ESTRUTURA DE DADOS ENTERPRISE) ---
interface Lead {
  id: string;
  name: string;
  value: number;
  stage: 'contato' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido';
  notes: string;
  tags: string;
  week: number;
  followUp: boolean;
  postSale: boolean;
  hasCrossSell: boolean;
  hasUpSell: boolean;
  reactivated: boolean;
  isArchived: boolean;
  lastUpdate: string;
  priority: 'baixa' | 'media' | 'alta';
}

interface Goals {
  revenue: number; ticket: number; contacts: number; followUp: number;
  crossSell: number; upSell: number; postSale: number; reactivated: number; conversion: number;
}

// --- CONFIGURAÇÃO E CONEXÃO ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400', border: 'border-slate-400', desc: 'Leads frios ou recém-captados' },
  { id: 'orcamento', label: 'Orçamento/Proposta', color: 'bg-blue-500', border: 'border-blue-500', desc: 'Proposta comercial enviada' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500', border: 'border-amber-500', desc: 'Ajuste de escopo e valores' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', desc: 'Venda convertida com sucesso' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', border: 'border-rose-500', desc: 'Lead descartado ou perdido' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'recorrente', label: 'CLIENTE RECORRENTE', color: 'bg-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-200' }
];

export default function CRMMasterSystemUltimate() {
  // --- ESTADOS CORE ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'error'>('online');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- ESTADOS FINANCEIROS ---
  const [goals, setGoals] = useState<Goals>({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 8, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 }
    } as Record<number, { revenue: number | string }>,
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false,
    priority: 'media'
  });

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
      setSyncStatus('online');
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('crm_ultimate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const handleSaveLead = async (leadData: any) => {
    if (!supabase) return;
    setIsSaving(true);
    const payload = { 
      ...leadData, 
      value: Number(leadData.value) || 0, 
      lastUpdate: new Date().toISOString(),
      week: leadData.week || currentWeek
    };
    try {
      const { error } = await supabase.from('leads').upsert(payload);
      if (error) throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (lead: Lead, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- MOTOR ANALYTICS ULTRA (CÁLCULOS TÉCNICOS) ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const lost = active.filter(l => l.stage === 'perdido');
    
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: lost.length
    };

    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      n2f: funnel.orcamento > 0 ? (funnel.fechado / funnel.orcamento) * 100 : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRev / goals.revenue) * 100;

    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    // Alíquotas e Bônus
    const isMarginOk = Number(commSettings.profitMargin) >= 12;
    let baseRate = revPerf >= 110 ? 3.5 : revPerf >= 100 ? 2.5 : revPerf >= 90 ? 1.5 : 0;
    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross) : 0;
    const totalCommission = (totalRev * (finalRate / 100)) + (funnel.contato >= goals.contacts ? 300 : 0);

    return { funnel, rates, totalRev, revPerf, kpis, finalRate, totalCommission, isMarginOk };
  }, [leads, commSettings, goals]);

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-blue-500 italic">
      <Cpu size={64} className="mb-6 animate-spin-slow" />
      <div className="text-2xl uppercase tracking-[0.5em]">SYSTEM LOADING...</div>
      <style>{`.animate-spin-slow { animation: spin 3s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* HEADER MASTER */}
      <header className="max-w-[1900px] mx-auto mb-12 flex flex-col xl:flex-row justify-between items-end gap-10">
        <div className="flex items-center gap-10">
          <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-blue-400">
            <TrendingUp size={48} />
          </div>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className={`h-3 w-3 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DB SYNC: {syncStatus}</p>
            </div>
            <h1 className="text-7xl font-black tracking-tighter italic leading-none text-slate-900">
              SALES<span className="text-blue-600">PRO</span>
              <span className="text-2xl not-italic text-slate-300 ml-6 font-bold border-l-4 pl-6 border-slate-200 uppercase tracking-[0.3em]">Ultimate v5</span>
            </h1>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <div className="flex flex-wrap justify-center gap-6 bg-white/80 backdrop-blur-md p-5 rounded-[4rem] shadow-2xl border-4 border-white">
          <div className="flex bg-slate-100 p-2 rounded-[2.5rem]">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-10 py-4 rounded-2xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-xl scale-110 z-10' : 'text-slate-400'}`}>WEEK {w}</button>
            ))}
          </div>
          <nav className="flex gap-2">
            {[
              { id: 'pipeline', label: 'CRM Pipeline', icon: <Layers size={18}/> },
              { id: 'metrics', label: 'KPI Monitor', icon: <Activity size={18}/> },
              { id: 'funnel', label: 'Funnel Tech', icon: <ArrowDownWideNarrow size={18}/> },
              { id: 'commission', label: 'Audit Pay', icon: <Wallet size={18}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-12 py-5 rounded-[2.5rem] font-black text-xs uppercase transition-all flex items-center gap-4 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl translate-y-[-4px]' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-full shadow-2xl hover:rotate-180 transition-all duration-700"><PlusCircle size={32} /></button>
        </div>
      </header>

      <main className="max-w-[1900px] mx-auto">
        
        {/* VIEW 1: PIPELINE COMPLETO */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && !l.isArchived && Number(l.week || 1) === currentWeek);
              return (
                <div key={stage.id} className="bg-slate-200/50 p-8 rounded-[4rem] min-h-[1000px] border-2 border-dashed border-slate-300/40">
                  <div className="mb-10 flex justify-between items-start px-4">
                    <div>
                      <h3 className="font-black text-sm uppercase text-slate-800 tracking-widest mb-1">{stage.label}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{stage.desc}</p>
                    </div>
                    <span className="bg-white text-slate-900 px-5 py-2 rounded-2xl text-xs font-black shadow-lg">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-8">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-8 rounded-[3.5rem] shadow-xl border-4 border-white transition-all duration-300 hover:scale-[1.03] group relative">
                        <button onClick={() => { if(confirm("Eliminar Lead?")) supabase?.from('leads').delete().eq('id', lead.id).then(()=>fetchLeads()) }} className="absolute -right-3 -top-3 bg-white text-rose-500 p-5 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-50 border-2"><Trash2 size={18}/></button>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                          {lead.tags?.split(',').filter(t=>t).map(tId => {
                            const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                            return tag && <span key={tId} className={`px-4 py-2 rounded-full text-[8px] font-black uppercase border ${tag.light}`}>{tag.label}</span>;
                          })}
                        </div>

                        <h4 className="font-black text-lg text-slate-900 uppercase mb-2 tracking-tighter leading-tight">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-3xl mb-8 italic">R$ {Number(lead.value).toLocaleString()}</div>
                        
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-8 border-2 border-slate-100">
                             <textarea className="w-full text-xs bg-transparent border-none font-bold text-slate-700 resize-none outline-none h-20" placeholder="Briefing estratégico..." value={lead.notes} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, notes: e.target.value} : l))} onBlur={() => handleSaveLead(leads.find(l => l.id === lead.id))} />
                        </div>

                        <div className="flex gap-3 mb-8 px-2">
                          {AVAILABLE_TAGS.map(tag => (
                            <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-6 h-6 rounded-full border-4 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-lg scale-125` : 'bg-slate-100 border-slate-50'}`} />
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <QuickActionBtn label="Follow" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" icon={<RefreshCw size={12}/>}/>
                          <QuickActionBtn label="PósVenda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" icon={<CheckCircle2 size={12}/>}/>
                          <QuickActionBtn label="Cross" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" icon={<Zap size={12}/>}/>
                          <QuickActionBtn label="UpSell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-purple-600" icon={<TrendingUp size={12}/>}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: MONITOR DE METAS (KPI) */}
        {activeTab === 'metrics' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-10">
              <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden">
                 <div className="bg-slate-900 p-16 text-white flex justify-between items-center">
                    <div className="flex items-center gap-10">
                       <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl rotate-6"><Activity size={48}/></div>
                       <h3 className="text-4xl font-black uppercase tracking-tighter italic">Monitoramento de Metas Semanais</h3>
                    </div>
                 </div>
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b">
                     <tr className="text-[12px] uppercase font-black tracking-widest text-slate-400">
                       <th className="p-16">KPI Estratégico</th>
                       <th className="p-16 text-center">Meta</th>
                       {[1, 2, 3, 4].map(w => <th key={w} className="p-16 text-center">W{w} Perf.</th>)}
                       <th className="p-16 text-center bg-blue-50 text-blue-950 font-black">Total</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y font-bold text-sm uppercase text-slate-600">
                     <KPIRow title="Novos Contatos" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} field="contacts" format={(v)=>v} />
                     <KPIRow title="Taxa de Conversão" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} field="conv" format={(v)=>v.toFixed(1)+"%"} />
                     <KPIRow title="Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} field="cross" format={(v)=>v.toFixed(1)+"%"} />
                   </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* VIEW 3: AUDITORIA FINANCEIRA */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-slate-900 p-24 rounded-[6rem] text-white shadow-2xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-20 -bottom-20 opacity-5" size={600}/>
                 <div className="relative z-10">
                    <p className="text-blue-400 font-black uppercase tracking-[0.6em] text-xs mb-10">Faturamento Bruto Consolidado</p>
                    <h3 className="text-[130px] font-black tracking-tighter mb-14 font-mono leading-none">R$ {analytics.totalRev.toLocaleString()}</h3>
                    <div className="flex gap-20 border-t border-white/10 pt-14">
                       <div><p className="text-[11px] font-black opacity-40 uppercase tracking-widest mb-3">Meta Atingida</p><p className="text-6xl font-black">{analytics.revPerf.toFixed(1)}%</p></div>
                       <div className={`px-10 py-4 rounded-full font-black text-sm uppercase flex items-center gap-4 h-fit self-center ${analytics.isMarginOk ? 'bg-blue-600' : 'bg-slate-700'}`}>Taxa Final: {analytics.finalRate.toFixed(2)}%</div>
                    </div>
                 </div>
              </div>
              <div className={`p-24 rounded-[6rem] border-[20px] shadow-2xl flex flex-col justify-center items-center ${analytics.isMarginOk ? 'bg-white border-emerald-500 text-emerald-600' : 'bg-slate-100 border-rose-500 text-slate-400'}`}>
                 <p className="font-black uppercase tracking-[0.5em] mb-8 text-sm">Remuneração Variável</p>
                 <h3 className="text-[130px] font-black tracking-tighter font-mono italic leading-none">R$ {analytics.totalCommission.toLocaleString()}</h3>
                 {!analytics.isMarginOk && <div className="mt-8 bg-rose-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase animate-pulse">Margem Baixa: Pagamento Suspenso</div>}
              </div>
            </div>

            {/* PAINEL DE EDIÇÃO DE METAS */}
            <div className="p-20 bg-white rounded-[5rem] shadow-2xl border-4 border-slate-50 flex flex-col xl:flex-row gap-20 items-center justify-between">
               <div className="flex flex-wrap justify-center gap-12">
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Margem de Lucro %</label>
                     <input type="number" className="w-40 p-8 border-4 border-slate-100 rounded-[3rem] font-black bg-slate-50 shadow-inner outline-none focus:border-blue-500 transition-all text-2xl text-center" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Meta Faturamento (R$)</label>
                     <input type="number" className="w-80 p-8 border-4 border-slate-100 rounded-[3rem] font-black bg-slate-50 shadow-inner outline-none focus:border-blue-500 transition-all text-2xl text-center" value={goals.revenue} onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="flex flex-wrap justify-center gap-6 bg-slate-50 p-8 rounded-[4rem]">
                 {[1, 2, 3, 4].map(w => (
                    <div key={w} className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Semana {w}</label>
                       <input type="number" className="w-44 p-6 border-2 border-white rounded-[2.5rem] font-black bg-white focus:border-blue-500 outline-none text-center text-lg shadow-sm" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} />
                    </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ESTRUTURA VISUAL DO FUNIL */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-24 rounded-[6rem] shadow-2xl border-4 border-white animate-in zoom-in-95 duration-700">
             <div className="flex items-center gap-12 mb-28">
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-blue-500 shadow-2xl rotate-6"><PieChart size={64}/></div>
                <div>
                   <h3 className="text-7xl font-black tracking-tighter uppercase italic leading-tight">Gargalos e Conversão</h3>
                   <p className="text-base font-black text-slate-300 uppercase tracking-[0.6em]">Visão Geométrica do Fluxo Comercial</p>
                </div>
             </div>
             <div className="max-w-[1200px] mx-auto space-y-16">
                <FunnelTier label="Oportunidades Totais" count={analytics.funnel.contato} percent={100} color="bg-slate-300" />
                <FunnelTier label="Apresentação / Orçamento" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" />
                <FunnelTier label="Vendas Fechadas" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" />
             </div>
          </div>
        )}
      </main>

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8 z-[9999] animate-in fade-in duration-500">
          <div className="bg-white rounded-[6rem] p-24 max-w-5xl w-full shadow-2xl border-t-[32px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-16 right-16 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all duration-500"><X size={64}/></button>
            <div className="flex items-center gap-8 mb-20">
              <div className="bg-blue-50 p-6 rounded-[2.5rem] text-blue-600"><Briefcase size={48}/></div>
              <h2 className="text-7xl font-black uppercase italic tracking-tighter text-slate-900">Novo Lead</h2>
            </div>
            <div className="grid gap-12">
               <input className="w-full p-12 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-3xl shadow-inner" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})} placeholder="EMPRESA / LEAD" />
               <div className="grid grid-cols-2 gap-12">
                  <input type="number" className="w-full p-12 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-3xl shadow-inner" value={newLead.value} onChange={e=>setNewLead({...newLead, value: Number(e.target.value)})} placeholder="VALOR R$" />
                  <button onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})} className={`w-full p-12 rounded-[4rem] font-black uppercase text-base border-4 transition-all flex items-center justify-center gap-6 ${newLead.reactivated ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xl' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                    {newLead.reactivated ? <Check size={28}/> : <RotateCcw size={28}/>} {newLead.reactivated ? 'REATIVADO' : 'NOVA CAPTAÇÃO'}
                  </button>
               </div>
               <button disabled={!newLead.name || isSaving} onClick={async () => { await handleSaveLead({...newLead, week: currentWeek, isArchived: false}); setIsModalOpen(false); setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false}); }} className="w-full p-14 rounded-[5rem] bg-blue-600 text-white font-black uppercase tracking-[0.6em] text-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">LANÇAR NO PIPELINE <ArrowRight size={48} className="inline ml-6"/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

const QuickActionBtn = ({ label, active, color, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-5 rounded-[2.2rem] border-2 text-[9px] font-black uppercase transition-all flex items-center justify-center gap-3 ${active ? `${color} text-white border-transparent shadow-xl scale-110 z-10` : 'bg-white text-slate-300 border-slate-100 hover:text-slate-500'}`}>
    {icon} {label}
  </button>
);

const KPIRow = ({ title, meta, total, leads, field, format }: any) => {
  const getWeeklyVal = (w: number) => {
    const weekLeads = leads.filter((l: any) => !l.isArchived && Number(l.week || 1) === w);
    const won = weekLeads.filter((l: any) => l.stage === 'fechado');
    if (field === 'contacts') return weekLeads.length;
    if (field === 'conv') return weekLeads.length > 0 ? (won.length / weekLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter((l: any) => l.hasCrossSell).length / won.length) * 100 : 0;
    return 0;
  };
  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="p-16 font-black text-slate-800 text-lg tracking-tighter">{title}</td>
      <td className="p-16 text-center text-slate-300 italic font-bold">Ref: {meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-16 text-center">
          <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${getWeeklyVal(w) > 0 ? 'bg-emerald-500' : 'bg-slate-100'} shadow-lg`} />
          <span className="text-[10px] text-slate-400 font-black">{format(getWeeklyVal(w))}</span>
        </td>
      ))}
      <td className="p-16 text-center bg-blue-50/50 border-l-4 border-white"><span className="text-2xl font-black text-blue-900 font-mono italic">{total}</span></td>
    </tr>
  );
};

const FunnelTier = ({ label, count, percent, color }: any) => (
  <div className="flex items-center gap-14">
    <div className={`h-32 ${color} rounded-[4.5rem] flex items-center justify-between px-20 text-white shadow-2xl transition-all hover:scale-[1.02]`} style={{ width: `${Math.max(percent, 30)}%`, minWidth: '400px' }}>
      <span className="font-black uppercase tracking-[0.4em] text-sm italic">{label}</span>
      <div className="text-right">
        <span className="font-black text-5xl font-mono leading-none">{count}</span>
        <p className="text-[10px] opacity-60 font-black uppercase mt-1">Registros</p>
      </div>
    </div>
    <div className="text-slate-200 font-black text-5xl italic">{percent.toFixed(0)}%</div>
  </div>
);
