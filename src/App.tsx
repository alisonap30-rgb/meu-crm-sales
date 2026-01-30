import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle, Briefcase, Wallet, 
  Percent, ChevronUp, AlertTriangle, Monitor, Database, Terminal, Cpu,
  BriefcaseIcon, Globe, HardDrive, LayoutDashboard, ListChecks, MessageSquare,
  Navigation, PlayCircle, Power, Save, Share2, Shield, Smartphone, 
  ToggleLeft, UserPlus, Users, Wand2
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÃO E TIPAGEM DE ALTO NÍVEL ---
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

interface Lead {
  id: string;
  name: string;
  value: number;
  stage: 'contato' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido';
  vendor: string;
  notes: string;
  tags: string;
  week: number;
  priority: 'baixa' | 'media' | 'alta';
  followUp: boolean;
  postSale: boolean;
  hasCrossSell: boolean;
  hasUpSell: boolean;
  reactivated: boolean;
  isArchived: boolean;
  lastUpdate: string;
  createdAt: string;
  expectedCloseDate?: string;
}

interface Goals {
  revenue: number;
  ticket: number;
  contacts: number;
  followUp: number;
  crossSell: number;
  upSell: number;
  postSale: number;
  reactivated: number;
  conversion: number;
}

// =============================================================================
// --- DICIONÁRIOS E ESTRUTURAS ---
// =============================================================================

const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400', border: 'border-slate-400', shadow: 'shadow-slate-200', desc: 'Leads frios ou recém-captados no funil' },
  { id: 'orcamento', label: 'Proposta Enviada', color: 'bg-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-200', desc: 'Propostas comerciais em análise pelo cliente' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-200', desc: 'Ajuste de escopo, prazos e valores finais' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-200', desc: 'Venda convertida e pronta para onboarding' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', border: 'border-rose-500', shadow: 'shadow-rose-200', desc: 'Lead descartado ou perdido para concorrência' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'recorrente', label: 'CLIENTE RECORRENTE', color: 'bg-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'indicacao', label: 'INDICAÇÃO DIRETA', color: 'bg-indigo-600', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
];

// =============================================================================
// --- COMPONENTE PRINCIPAL ---
// =============================================================================

export default function CRMMasterUltimateEnterprise() {
  // --- ESTADOS DE DADOS ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'error' | 'offline'>('online');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- ESTADOS DE NEGÓCIO ---
  const [goals, setGoals] = useState<Goals>({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 8, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0, ticket: 0, contacts: 0 },
      2: { revenue: 0, ticket: 0, contacts: 0 },
      3: { revenue: 0, ticket: 0, contacts: 0 },
      4: { revenue: 0, ticket: 0, contacts: 0 }
    } as Record<number, { revenue: number | string, ticket?: number, contacts?: number }>,
    profitMargin: 15,
    selectedVendor: 'Geral'
  });

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', value: 0, vendor: 'Vendedor Principal', notes: '', stage: 'contato', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false,
    priority: 'media'
  });

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO EM TEMPO REAL ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) {
      setSyncStatus('offline');
      setLoading(false);
      return;
    }
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
      setSyncStatus('online');
    } catch (e) {
      console.error("Erro Crítico de Conexão:", e);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('crm_ultimate_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  // --- FUNÇÕES DE MANIPULAÇÃO ---
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
      await fetchLeads();
    } catch (e) {
      alert("Erro ao salvar no banco. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLead = async (id: string) => {
    if (!supabase || !window.confirm("PERIGO: Esta ação é irreversível. Confirmar exclusão?")) return;
    try {
      await supabase.from('leads').delete().eq('id', id);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (lead: Lead, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags = [...currentTags, tagId];
    }
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  const isStale = (date: string) => {
    if (!date) return false;
    const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 3; // 3 dias sem movimentação
  };

  // ===========================================================================
  // --- MOTOR ANALYTICS ULTRA (BUSINESS INTELLIGENCE) ---
  // ===========================================================================
  
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const filtered = active.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const won = active.filter(l => l.stage === 'fechado');
    const lost = active.filter(l => l.stage === 'perdido');
    
    // Funil de Conversão
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociacao: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: lost.length
    };

    // Taxas de Eficiência
    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      o2n: funnel.orcamento > 0 ? (funnel.negociacao / funnel.orcamento) * 100 : 0,
      n2f: funnel.negociacao > 0 ? (funnel.fechado / funnel.negociacao) * 100 : 0,
      lost: funnel.contato > 0 ? (funnel.perdido / funnel.contato) * 100 : 0
    };

    // Faturamento e Metas
    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue || 0), 0);
    const avgTicket = won.length > 0 ? totalRev / won.length : 0;
    const revPerf = (totalRev / goals.revenue) * 100;

    // KPIs Operacionais
    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length,
      prioritarios: active.filter(l => l.priority === 'alta' && l.stage !== 'fechado').length
    };

    // Algoritmo de Comissão
    const isMarginOk = Number(commSettings.profitMargin) >= 12;
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const accel_up = (kpis.up >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;
    const bonusHabilitado = funnel.contato >= goals.contacts && kpis.fup >= goals.followUp;
    const totalCommission = (totalRev * (finalRate / 100)) + (bonusHabilitado ? 300 : 0);

    return { 
      funnel, rates, totalRev, avgTicket, revPerf, kpis, 
      finalRate, totalCommission, bonusHabilitado, isMarginOk,
      actualMargin: commSettings.profitMargin, filtered
    };
  }, [leads, commSettings, goals, searchTerm]);

  // ===========================================================================
  // --- RENDERIZAÇÃO DE UI ---
  // ===========================================================================

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-blue-500 italic">
      <Terminal size={80} className="mb-8 animate-pulse text-blue-400" />
      <div className="text-3xl uppercase tracking-[0.8em] mb-4 animate-bounce">LOADING SYSTEM</div>
      <div className="w-80 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>
      <style>{`@keyframes loading { 0% { width: 0% } 50% { width: 70% } 100% { width: 100% } }`}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-10 font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      
      {/* HEADER ULTRA ENTERPRISE */}
      <header className="max-w-[2000px] mx-auto mb-10 flex flex-col 2xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-8 group">
          <div className="bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-110">
            <Cpu className="text-blue-400" size={50} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`h-3 w-3 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SYSTEM STATUS: {syncStatus.toUpperCase()}</p>
            </div>
            <h1 className="text-8xl font-black tracking-tighter italic leading-none text-slate-900 select-none">
              CRM<span className="text-blue-600">ULTRA</span>
              <span className="text-xl not-italic text-slate-300 ml-6 font-bold border-l-4 pl-6 border-slate-200 uppercase tracking-widest">Enterprise Hardcore v5.2</span>
            </h1>
          </div>
        </div>

        {/* NAVEGAÇÃO E CONTROLES CENTRAIS */}
        <div className="flex flex-wrap justify-center gap-6 bg-white/90 backdrop-blur-xl p-6 rounded-[5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border-4 border-white">
          <div className="flex bg-slate-100 p-2 rounded-[3rem] mr-4 shadow-inner">
            {[1, 2, 3, 4].map(w => (
              <button 
                key={w} 
                onClick={() => setCurrentWeek(w)} 
                className={`px-10 py-4 rounded-[2rem] font-black text-xs transition-all duration-500 ${currentWeek === w ? 'bg-white text-blue-600 shadow-2xl scale-110 z-10' : 'text-slate-400 hover:text-slate-600'}`}
              >
                WEEK 0{w}
              </button>
            ))}
          </div>
          
          <nav className="flex gap-2">
            {[
              { id: 'pipeline', label: 'Dashboard', icon: <LayoutDashboard size={20}/> },
              { id: 'metrics', label: 'Monitoramento', icon: <Activity size={20}/> },
              { id: 'funnel', label: 'Visual Funnel', icon: <PieChart size={20}/> },
              { id: 'commission', label: 'Auditoria Fin.', icon: <Wallet size={20}/> }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`px-12 py-5 rounded-[3rem] font-black text-xs uppercase transition-all duration-300 flex items-center gap-4 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl translate-y-[-6px]' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="relative ml-4">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
             <input 
               type="text" 
               placeholder="Localizar lead..." 
               className="bg-slate-100 border-none rounded-full py-5 pl-16 pr-8 text-xs font-bold w-64 focus:w-80 transition-all outline-none focus:ring-4 focus:ring-blue-100"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 text-white p-6 rounded-full shadow-2xl hover:rotate-180 hover:bg-blue-700 transition-all duration-1000 active:scale-90 ml-4"
          >
            <PlusCircle size={32} />
          </button>
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="max-w-[2000px] mx-auto">
        
        {/* VIEW 1: PIPELINE (VISÃO DE CARDS) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {STAGES.map(stage => {
              const stageLeads = analytics.filtered.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
              return (
                <div 
                  key={stage.id} 
                  className={`bg-slate-200/40 p-8 rounded-[4.5rem] min-h-[1000px] border-2 border-dashed border-slate-300/50 transition-all duration-500 hover:bg-slate-200/60`}
                >
                  <div className="mb-12 flex justify-between items-start px-4">
                    <div>
                      <h3 className="font-black text-sm uppercase text-slate-800 tracking-[0.2em] mb-2">{stage.label}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight max-w-[140px]">{stage.desc}</p>
                    </div>
                    <span className={`bg-white text-slate-900 px-6 py-3 rounded-3xl text-xs font-black shadow-xl border-2 ${stage.border}`}>{stageLeads.length}</span>
                  </div>

                  <div className="space-y-10">
                    {stageLeads.map(lead => {
                      const expired = isStale(lead.lastUpdate) && !['fechado', 'perdido'].includes(stage.id);
                      return (
                        <div 
                          key={lead.id} 
                          className={`bg-white p-10 rounded-[4rem] shadow-xl border-4 transition-all duration-500 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] hover:scale-[1.04] group relative cursor-pointer ${expired ? 'border-rose-400 ring-8 ring-rose-50' : 'border-white'}`}
                        >
                          {/* BOTÃO DELETE */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }} 
                            className="absolute -right-4 -top-4 bg-white text-rose-500 p-5 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-50 border-2"
                          >
                            <Trash2 size={20}/>
                          </button>

                          {/* INDICADOR DE PRIORIDADE */}
                          {lead.priority === 'alta' && (
                            <div className="absolute -left-4 top-10 bg-orange-500 text-white p-3 rounded-full shadow-xl animate-pulse">
                              <Zap size={16} fill="white"/>
                            </div>
                          )}

                          {/* TAGS */}
                          <div className="flex flex-wrap gap-2 mb-8">
                            {lead.tags?.split(',').filter(t=>t).map(tId => {
                              const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                              return tag && (
                                <span key={tId} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider border ${tag.light}`}>
                                  {tag.label}
                                </span>
                              );
                            })}
                          </div>

                          <h4 className="font-black text-xl text-slate-900 uppercase mb-4 leading-tight tracking-tighter">{lead.name}</h4>
                          
                          <div className="flex items-baseline gap-2 mb-10 italic">
                             <span className="text-xs font-bold text-slate-300 not-italic">R$</span>
                             <span className="text-4xl font-black text-emerald-600 tracking-tighter">{Number(lead.value).toLocaleString('pt-BR')}</span>
                          </div>

                          {/* BRIEFING */}
                          <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-8 border-2 border-slate-100 group-hover:border-blue-200 transition-all">
                             <div className="flex items-center gap-3 mb-4 opacity-40">
                                <FileText size={14}/>
                                <span className="text-[9px] font-black uppercase tracking-widest">Anotações Estratégicas</span>
                             </div>
                             <textarea 
                               className="w-full text-xs bg-transparent border-none font-bold text-slate-700 resize-none outline-none placeholder:text-slate-300 min-h-[100px]"
                               placeholder="Briefing do lead..."
                               value={lead.notes || ''}
                               onChange={(e) => {
                                 const updatedLeads = leads.map(l => l.id === lead.id ? {...l, notes: e.target.value} : l);
                                 setLeads(updatedLeads);
                               }}
                               onBlur={() => handleSaveLead(leads.find(l => l.id === lead.id))}
                             />
                          </div>

                          {/* TAG SELECTOR DOTS */}
                          <div className="flex gap-3 mb-10 px-2 justify-center">
                            {AVAILABLE_TAGS.map(tag => (
                              <button 
                                key={tag.id} 
                                onClick={(e) => { e.stopPropagation(); toggleTag(lead, tag.id); }} 
                                className={`w-8 h-8 rounded-full border-4 transition-all duration-300 ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-xl scale-125` : 'bg-slate-100 border-transparent hover:border-slate-300'}`}
                                title={tag.label}
                              />
                            ))}
                          </div>

                          {/* CHECKLIST DE INDICADORES (AÇÕES) */}
                          <div className="grid grid-cols-2 gap-4">
                            <QuickActionBtn label="Follow" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" icon={<RefreshCw size={14}/>}/>
                            <QuickActionBtn label="Pós-Venda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" icon={<CheckCircle2 size={14}/>}/>
                            <QuickActionBtn label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" icon={<Zap size={14}/>}/>
                            <QuickActionBtn label="Up-Sell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-purple-600" icon={<TrendingUp size={14}/>}/>
                          </div>

                          {/* RODAPÉ DO CARD */}
                          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-all">
                             <div className="flex items-center gap-2">
                                <Clock size={12}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">{new Date(lead.lastUpdate).toLocaleDateString()}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <User size={12}/>
                                <span className="text-[10px] font-black uppercase tracking-widest">Vend. 01</span>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: MÉTRICAS E FAROL (KPI MONITOR) */}
        {activeTab === 'metrics' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 pb-20">
              <div className="bg-white rounded-[5rem] shadow-2xl border-4 border-white overflow-hidden">
                 <div className="bg-slate-900 p-20 text-white flex flex-col xl:flex-row justify-between items-center gap-12">
                    <div className="flex items-center gap-12">
                       <div className="bg-blue-600 p-10 rounded-[3.5rem] shadow-2xl rotate-6 group-hover:rotate-12 transition-all"><Activity size={60}/></div>
                       <div>
                          <h3 className="text-5xl font-black uppercase tracking-tighter italic">Farol de Operação por Ciclo</h3>
                          <p className="text-sm font-black text-slate-500 uppercase tracking-[0.6em] mt-3">Monitoramento de Performance Semanal</p>
                       </div>
                    </div>
                    <div className="flex gap-10">
                       <StatCard label="Leads Ativos" value={analytics.funnel.contato} icon={<Users size={20}/>}/>
                       <StatCard label="Tx. Conversão" value={analytics.rates.total.toFixed(1) + "%"} icon={<Target size={20}/>} highlight/>
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50 text-[13px] uppercase font-black tracking-widest text-slate-400 border-b-2">
                         <th className="p-20">KPI Estratégico</th>
                         <th className="p-20 text-center">Meta do Ciclo</th>
                         {[1, 2, 3, 4].map(w => <th key={w} className="p-20 text-center">Week 0{w} Performance</th>)}
                         <th className="p-20 text-center bg-blue-50 text-blue-900 font-black">Consolidado</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-bold text-sm uppercase text-slate-600">
                       <KPIRow title="Novos Contatos / Captação" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} field="contacts" format={(v: any)=>v} />
                       <KPIRow title="Taxa de Conversão Real" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} field="conv" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Aproveitamento Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} field="cross" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Follow-up Ativo (Retenção)" meta={goals.followUp+"%"} total={analytics.kpis.fup.toFixed(1)+"%"} leads={leads} field="fup" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Recuperação de Inativos" meta={goals.reactivated} total={analytics.kpis.react} leads={leads} field="react" format={(v: any)=>v} />
                     </tbody>
                   </table>
                 </div>
              </div>
           </div>
        )}

        {/* VIEW 3: AUDITORIA FINANCEIRA (MOTOR DE COMISSÃO) */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 pb-24">
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-12">
              <div className="bg-slate-900 p-24 rounded-[6rem] text-white shadow-3xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-20 -bottom-20 opacity-5 group-hover:scale-110 transition-transform duration-[2000ms]" size={700}/>
                 <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-12">
                       <div className="h-2 w-24 bg-blue-500 rounded-full"></div>
                       <p className="text-blue-400 font-black uppercase tracking-[0.7em] text-sm">Revenue Consolidado</p>
                    </div>
                    <h3 className="text-[150px] font-black tracking-tighter mb-16 font-mono leading-none italic select-all">R$ {analytics.totalRev.toLocaleString('pt-BR')}</h3>
                    <div className="flex gap-24 border-t border-white/10 pt-16">
                       <div>
                          <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-4">Atingimento Global</p>
                          <p className={`text-7xl font-black ${analytics.revPerf >= 100 ? 'text-emerald-400' : 'text-white'}`}>{analytics.revPerf.toFixed(1)}%</p>
                       </div>
                       <div>
                          <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-4">Ticket Médio Real</p>
                          <p className="text-7xl font-black">R$ {analytics.avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className={`p-24 rounded-[6rem] border-[30px] shadow-3xl text-center flex flex-col justify-center items-center transition-all duration-700 ${analytics.isMarginOk ? 'bg-white border-emerald-500' : 'bg-slate-100 border-rose-500 opacity-80'}`}>
                 {!analytics.isMarginOk && (
                    <div className="mb-10 bg-rose-600 text-white px-10 py-4 rounded-full font-black text-xs uppercase animate-pulse flex items-center gap-4 shadow-xl">
                       <AlertCircle size={20}/> Pagamento Retido: Margem Crítica ({analytics.actualMargin}%)
                    </div>
                 )}
                 <p className="text-slate-400 font-black uppercase tracking-[0.6em] mb-10 text-base italic">Variável de Performance Calculada</p>
                 <h3 className={`text-[150px] font-black tracking-tighter font-mono leading-none italic ${analytics.isMarginOk ? 'text-emerald-600' : 'text-slate-300 line-through'}`}>
                    R$ {analytics.totalCommission.toLocaleString('pt-BR')}
                 </h3>
                 <div className="mt-20 flex flex-col items-center gap-10">
                    <div className={`px-16 py-8 rounded-[4rem] font-black text-xl uppercase tracking-[0.3em] shadow-2xl flex items-center gap-8 ${analytics.isMarginOk ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                       Alíquota Aplicada: {analytics.finalRate.toFixed(2)}%
                    </div>
                    {analytics.bonusHabilitado && (
                       <div className="text-emerald-600 font-black text-sm uppercase flex items-center gap-5 bg-emerald-50 px-10 py-5 rounded-[2rem] border-2 border-emerald-100 shadow-lg">
                          <Award size={30}/> Bônus de Atendimento (R$ 300,00) Conquistado
                       </div>
                    )}
                 </div>
              </div>
            </div>

            {/* PAINEL DE CONTROLE DE PARÂMETROS */}
            <div className="bg-white rounded-[6rem] shadow-2xl border-4 border-white overflow-hidden">
               <div className="bg-slate-900 p-20 text-white flex flex-col md:flex-row justify-between items-center gap-12">
                  <div className="flex items-center gap-12">
                    <div className="bg-blue-600 p-10 rounded-[3.5rem] shadow-2xl"><Gauge size={50}/></div>
                    <div>
                      <h4 className="text-5xl font-black uppercase tracking-tighter italic">Algoritmo de Remuneração</h4>
                      <p className="text-xs opacity-40 font-black uppercase tracking-[0.5em] mt-3">Configuração de Metas e Alíquotas do Ciclo</p>
                    </div>
                  </div>
                  {!analytics.isMarginOk && (
                    <div className="bg-rose-500 text-white px-16 py-6 rounded-[3rem] font-black text-sm animate-pulse flex items-center gap-6 uppercase tracking-widest shadow-2xl">
                       <Lock size={24}/> Block: Margem Abaixo de 12%
                    </div>
                  )}
               </div>
               
               <div className="p-20 bg-slate-50 flex flex-col xl:flex-row gap-20 items-center justify-between">
                  <div className="flex flex-wrap justify-center gap-16">
                     <div className="space-y-6">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Margem de Lucro Bruta %</label>
                        <div className="relative group">
                          <Percent size={24} className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-all"/>
                          <input 
                            type="number" 
                            className="w-64 p-10 pl-20 border-4 border-white rounded-[3.5rem] font-black bg-white shadow-xl outline-none focus:ring-8 focus:ring-blue-100 transition-all text-3xl text-center" 
                            value={commSettings.profitMargin} 
                            onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} 
                          />
                        </div>
                     </div>
                     <div className="space-y-6">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Meta de Faturamento Mensal (R$)</label>
                        <div className="relative group">
                          <DollarSign size={24} className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-all"/>
                          <input 
                            type="number" 
                            className="w-96 p-10 pl-20 border-4 border-white rounded-[3.5rem] font-black bg-white shadow-xl outline-none focus:ring-8 focus:ring-blue-100 transition-all text-3xl text-center" 
                            value={goals.revenue} 
                            onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} 
                          />
                        </div>
                     </div>
                  </div>

                  {/* LANÇAMENTO DE FATURAMENTO SEMANAL */}
                  <div className="flex flex-wrap justify-center gap-8 bg-white p-12 rounded-[5rem] shadow-2xl border-4 border-slate-100">
                    {[1, 2, 3, 4].map(w => (
                       <div key={w} className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center block">Semana 0{w}</label>
                          <input 
                            type="number" 
                            className="w-48 p-8 border-4 border-slate-50 rounded-[3rem] font-black bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-center text-2xl transition-all shadow-inner" 
                            value={commSettings.weeks[w].revenue} 
                            onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} 
                          />
                       </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* VIEW 4: VISUAL FUNNEL (GEOMETRIA) */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-24 rounded-[6rem] shadow-3xl border-4 border-white animate-in zoom-in-95 duration-1000 mb-20">
             <div className="flex items-center gap-16 mb-32">
                <div className="bg-slate-900 p-12 rounded-[4rem] text-blue-500 shadow-3xl rotate-12 transition-transform hover:rotate-[-12deg] duration-700 cursor-pointer"><PieChart size={80}/></div>
                <div>
                   <h3 className="text-8xl font-black tracking-tighter uppercase italic leading-tight text-slate-900">Funnel Tech Analysis</h3>
                   <p className="text-xl font-black text-slate-300 uppercase tracking-[0.7em] mt-4">Conversão Geométrica e Perda de Leads</p>
                </div>
             </div>
             <div className="max-w-[1400px] mx-auto space-y-20 relative">
                <FunnelTier label="Total de Oportunidades" count={analytics.funnel.contato} percent={100} color="bg-slate-300" icon={<Globe size={30}/>} />
                <FunnelTransition value={analytics.rates.c2o} label="Qualificação p/ Proposta" />
                <FunnelTier label="Propostas Realizadas" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" icon={<FileText size={30}/>} />
                <FunnelTransition value={analytics.rates.n2f} label="Fechamento Comercial" />
                <FunnelTier label="Vendas Convertidas" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" icon={<CheckCircle2 size={30}/>} />
             </div>
          </div>
        )}
      </main>

      {/* MODAL SUPREMO DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-6 z-[9999] animate-in fade-in duration-700">
          <div className="bg-white rounded-[7rem] p-24 max-w-5xl w-full shadow-[0_100px_200px_-50px_rgba(0,0,0,0.5)] border-t-[40px] border-blue-600 animate-in zoom-in-95 duration-500 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-16 right-16 text-slate-200 hover:text-rose-500 hover:rotate-90 transition-all duration-700 scale-150"
            >
              <X size={50}/>
            </button>
            <div className="flex items-center gap-10 mb-24">
              <div className="bg-blue-50 p-8 rounded-[3.5rem] text-blue-600 shadow-inner"><Briefcase size={50}/></div>
              <div>
                <h2 className="text-8xl font-black uppercase italic tracking-tighter text-slate-900">Nova Oportunidade</h2>
                <p className="text-sm font-black text-slate-400 uppercase tracking-[0.6em] mt-4 italic">Sincronização Ativa com Nuvem Supabase</p>
              </div>
            </div>

            <div className="grid gap-16">
              <div className="space-y-6">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] ml-12">Identificação do Prospect / Organização</label>
                 <input 
                   className="w-full p-14 rounded-[4.5rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-4xl shadow-inner transition-all placeholder:text-slate-200" 
                   value={newLead.name} 
                   onChange={e=>setNewLead({...newLead, name: e.target.value})} 
                   placeholder="NOME DA EMPRESA" 
                   autoFocus
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-6">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] ml-12">Valor Projetado do Negócio (R$)</label>
                   <input 
                     type="number" 
                     className="w-full p-14 rounded-[4.5rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-4xl shadow-inner transition-all text-center" 
                     value={newLead.value} 
                     onChange={e=>setNewLead({...newLead, value: Number(e.target.value)})} 
                     placeholder="0,00" 
                   />
                </div>
                <div className="space-y-6">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] ml-12">Status de Captação</label>
                   <button 
                     onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})} 
                     className={`w-full p-14 rounded-[4.5rem] font-black uppercase text-xl border-4 transition-all duration-700 flex items-center justify-center gap-8 ${newLead.reactivated ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xl scale-105' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                   >
                     {newLead.reactivated ? <RotateCcw size={30} className="animate-spin-slow"/> : <PlusCircle size={30}/>}
                     {newLead.reactivated ? 'REATIVAÇÃO DE BASE' : 'NOVA PROSPECÇÃO'}
                   </button>
                </div>
              </div>

              <div className="space-y-6">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] ml-12">Briefing Inicial / Contexto Comercial</label>
                 <textarea 
                   className="w-full p-14 rounded-[4.5rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-2xl shadow-inner transition-all placeholder:text-slate-200 min-h-[200px]" 
                   value={newLead.notes} 
                   onChange={e=>setNewLead({...newLead, notes: e.target.value})} 
                   placeholder="Qual o problema que o cliente quer resolver?" 
                 />
              </div>

              <button 
                disabled={!newLead.name || isSaving}
                onClick={async () => {
                  await handleSaveLead({...newLead, isArchived: false});
                  setIsModalOpen(false);
                  setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false, priority: 'media'});
                }} 
                className={`w-full p-16 rounded-[6rem] font-black uppercase tracking-[0.8em] text-3xl shadow-3xl transition-all flex items-center justify-center gap-12 mt-12 ${!newLead.name || isSaving ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:scale-[1.03] hover:bg-blue-700 active:scale-95'}`}
              >
                {isSaving ? 'PROCESSANDO...' : 'PUBLICAR NO PIPELINE'} <ArrowRight size={50}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES DE APOIO (ESTILO HARDCORE) ---
// =============================================================================

const QuickActionBtn = ({ label, active, color, onClick, icon }: any) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }} 
    className={`p-6 rounded-[2.5rem] border-2 text-[10px] font-black uppercase transition-all duration-500 flex items-center justify-center gap-4 ${active ? `${color} text-white border-transparent shadow-2xl scale-110 z-10` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300 hover:text-slate-500'}`}
  >
    {icon} {label}
  </button>
);

const StatCard = ({ label, value, icon, highlight }: any) => (
  <div className={`text-center p-8 px-14 rounded-[3.5rem] border-2 transition-all duration-700 hover:scale-105 ${highlight ? 'bg-blue-600 border-blue-400 text-white shadow-2xl' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
     <div className="flex items-center justify-center gap-4 mb-3 opacity-60">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
     </div>
     <p className="text-5xl font-black font-mono tracking-tighter italic">{value}</p>
  </div>
);

const KPIRow = ({ title, meta, total, leads, field, format, isPercent }: any) => {
  const getWeeklyVal = (w: number) => {
    const weekLeads = leads.filter((l: any) => !l.isArchived && Number(l.week || 1) === w);
    const won = weekLeads.filter((l: any) => l.stage === 'fechado');
    if (field === 'contacts') return weekLeads.length;
    if (field === 'conv') return weekLeads.length > 0 ? (won.length / weekLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter((l: any) => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'fup') return weekLeads.length > 0 ? (weekLeads.filter((l: any) => l.followUp).length / weekLeads.length) * 100 : 0;
    if (field === 'react') return weekLeads.filter((l: any) => l.reactivated).length;
    return 0;
  };
  
  const getFarolColor = (val: number) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    if (val >= target) return 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]';
    if (val >= target * 0.7) return 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]';
    return 'bg-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.5)]';
  };

  return (
    <tr className="hover:bg-slate-50 transition-all duration-300 group">
      <td className="p-20 font-black text-slate-900 text-xl tracking-tighter group-hover:translate-x-4 transition-transform">{title}</td>
      <td className="p-20 text-center text-slate-300 italic font-bold text-lg">Target: {meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-20 text-center">
          <div className="flex flex-col items-center gap-5">
            <div className={`w-10 h-10 rounded-full ${getFarolColor(getWeeklyVal(w))} transition-all duration-700 group-hover:scale-125 ring-8 ring-white shadow-2xl`} />
            <span className="text-xs text-slate-400 font-black tracking-widest">{format(getWeeklyVal(w))}</span>
          </div>
        </td>
      ))}
      <td className="p-20 text-center bg-blue-50/50 border-l-8 border-white">
        <span className="text-4xl font-black text-blue-950 font-mono italic tracking-tighter">{total}</span>
      </td>
    </tr>
  );
};

const FunnelTier = ({ label, count, percent, color, icon }: any) => (
  <div className="flex items-center gap-16 group">
    <div 
      className={`h-40 ${color} rounded-[5rem] flex items-center justify-between px-24 text-white shadow-3xl transition-all duration-1000 hover:scale-[1.02] hover:-rotate-1 cursor-default relative overflow-hidden`} 
      style={{ width: `${Math.max(percent, 35)}%`, minWidth: '500px' }}
    >
      <div className="absolute right-0 top-0 opacity-10 group-hover:scale-150 transition-transform duration-[2000ms]">{icon && React.cloneElement(icon, { size: 200 })}</div>
      <span className="font-black uppercase tracking-[0.5em] text-lg italic z-10">{label}</span>
      <div className="flex flex-col items-end z-10">
        <span className="font-black text-7xl font-mono leading-none tracking-tighter">{count}</span>
        <span className="text-xs opacity-60 font-black uppercase mt-3 tracking-[0.3em]">Business Units</span>
      </div>
    </div>
    <div className="text-slate-200 font-black text-7xl italic transition-all group-hover:text-blue-500 group-hover:translate-x-8 duration-700">
      {percent.toFixed(0)}%
    </div>
  </div>
);

const FunnelTransition = ({ value, label }: any) => (
  <div className="flex flex-col items-center py-12 border-l-[10px] border-dotted border-slate-100 ml-52 relative">
    <div className="absolute left-[-19px] top-1/2 -translate-y-1/2 w-7 h-7 bg-white border-4 border-slate-100 rounded-full"></div>
    <div className="bg-white border-4 border-slate-100 px-16 py-8 rounded-[4rem] shadow-3xl flex items-center gap-8 group hover:border-blue-500 transition-all cursor-default">
       <div className="p-4 bg-blue-50 rounded-[1.5rem] text-blue-600 group-hover:rotate-[360deg] transition-transform duration-1000">
          <RefreshCw size={30}/>
       </div>
       <div>
          <span className="text-slate-400 font-black text-xs uppercase tracking-[0.4em] block mb-2">{label}</span>
          <span className="text-slate-950 font-black text-4xl font-mono italic">{value.toFixed(1)}%</span>
       </div>
    </div>
  </div>
);
