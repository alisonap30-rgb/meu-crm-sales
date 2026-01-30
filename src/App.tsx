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
  Globe, LayoutDashboard, ListChecks, ArrowRightCircle, Scale, Coins,
  Flame, Rocket, Trophy, Star, Lightbulb, MessageSquare, BriefcaseIcon,
  Crown, Fingerprint, Key, ShieldAlert, ZapOff, TrendingDown, MousePointerSquare
} from 'lucide-react';

// =============================================================================
// --- CORE CONFIGURATION & SUPABASE ENGINE ---
// =============================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', glow: 'shadow-slate-200', desc: 'Leads iniciais' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', glow: 'shadow-blue-200', desc: 'Propostas enviadas' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', glow: 'shadow-amber-200', desc: 'Ajuste de valores' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-200', desc: 'Venda convertida' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', glow: 'shadow-rose-200', desc: 'Oportunidade perdida' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

// =============================================================================
// --- MAIN CRM MASTER COMPONENT ---
// =============================================================================
export default function CRMMasterFullStack() {
  // --- STATE MANAGEMENT ---
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<any>(null);

  // --- GOALS & SETTINGS (EDITABLE) ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,        // Editável
    contacts: 400,       // Editável
    reactivated: 8,      // Editável
    conversion: 5,       
    followUp: 90,        
    crossSell: 40,       
    upSell: 15,          
    postSale: 100        
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 
      1: { revenue: 0, deals: 0 }, 
      2: { revenue: 0, deals: 0 }, 
      3: { revenue: 0, deals: 0 }, 
      4: { revenue: 0, deals: 0 } 
    } as any,
    profitMargin: 15 // REGRA PRINCIPAL: DEVE SER > 0
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- DATABASE HANDLERS ---
  const fetchLeads = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) {
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) console.error("Erro persistência:", error);
    }
  };

  const toggleTag = (lead: any, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = currentTags.includes(tagId) ? currentTags.filter((t: string) => t !== tagId) : [...currentTags, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- ANALYTICS ENGINE & COMMISSION LOGIC (900+ LINES STYLE) ---
  // =============================================================================
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const filtered = active.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Indicadores Básicos
    const indicators = {
      totalLeads: active.length,
      totalWon: won.length,
      orcamentos: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechados: won.length,
      totalValue: active.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
      wonValue: won.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
    };

    // Cálculos de KPI para Comissionamento
    const kpis = {
      ticketMedio: indicators.fechados > 0 ? (indicators.wonValue / indicators.fechados) : 0,
      convRate: indicators.totalLeads > 0 ? (indicators.fechados / indicators.totalLeads) * 100 : 0,
      crossRate: indicators.fechados > 0 ? (won.filter(l => l.hasCrossSell).length / indicators.fechados) * 100 : 0,
      upRate: indicators.fechados > 0 ? (won.filter(l => l.hasUpSell).length / indicators.fechados) * 100 : 0,
      fupRate: indicators.orcamentos > 0 ? (active.filter(l => l.followUp).length / indicators.orcamentos) * 100 : 0,
      postRate: indicators.fechados > 0 ? (won.filter(l => l.postSale).length / indicators.fechados) * 100 : 0,
      reactCount: active.filter(l => l.reactivated).length
    };

    // Faturamento e Alíquota Base
    const totalRevenue = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRevenue / goals.revenue) * 100;
    
    // REGRA DE OURO: MARGEM > 0
    const isMarginOk = commSettings.profitMargin > 0;

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Aceleradores de 0.5% (Só se Margem > 0)
    const bonusTicket = (isMarginOk && kpis.ticketMedio >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && kpis.convRate >= goals.conversion) ? 0.5 : 0;
    const bonusCross = (isMarginOk && kpis.crossRate >= goals.crossSell) ? 0.5 : 0;
    const bonusUp = (isMarginOk && kpis.upRate >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // Bônus R$ 300,00 (Lógica "All Metas Reached")
    const m1 = indicators.totalLeads >= goals.contacts;
    const m2 = kpis.fupRate >= goals.followUp;
    const m3 = kpis.postRate >= goals.postSale;
    const m4 = kpis.reactCount >= goals.reactivated;

    const qualifiesFixedBonus = isMarginOk && m1 && m2 && m3 && m4;
    const fixedBonusValue = qualifiesFixedBonus ? 300 : 0;

    const totalComm = (totalRevenue * (finalRate / 100)) + fixedBonusValue;

    return { 
      filtered, indicators, kpis, totalRevenue, revPerf, finalRate, 
      totalComm, isMarginOk, fixedBonusValue,
      checkFlags: { m1, m2, m3, m4 }
    };
  }, [leads, searchTerm, commSettings, goals]);

  // =============================================================================
  // --- RENDER ENGINE ---
  // =============================================================================

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="relative">
        <RefreshCw size={60} className="animate-spin text-blue-500 mb-8" />
        <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={20}/>
      </div>
      <span className="font-black italic tracking-[0.5em] uppercase text-[10px] animate-pulse">Iniciando High-Density Engine...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      
      {/* SIDEBAR NAVEGAÇÃO E METAS */}
      <aside className={`bg-slate-950 text-white transition-all duration-500 flex flex-col z-[100] ${sidebarOpen ? 'w-[350px]' : 'w-[80px]'}`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
           <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20"><BriefcaseIcon size={24}/></div>
           {sidebarOpen && (
             <div className="animate-in fade-in slide-in-from-left-4 duration-500">
               <h2 className="font-black italic text-xl tracking-tighter">SALES<span className="text-blue-500">ULTRA</span></h2>
               <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Enterprise Edition</p>
             </div>
           )}
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
           <NavItem icon={<LayoutDashboard size={20}/>} label="Pipeline" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
           <NavItem icon={<Target size={20}/>} label="Métricas" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />
           <NavItem icon={<Coins size={20}/>} label="Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
           
           {sidebarOpen && (
             <div className="mt-12 space-y-6 px-4">
                <div className="pt-6 border-t border-white/5">
                   <p className="text-[10px] font-black uppercase text-slate-500 mb-6">Controles de Meta</p>
                   <SidebarInput label="Ticket Médio" val={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                   <SidebarInput label="Prospecção/Mês" val={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} />
                   <SidebarInput label="Reativados" val={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} />
                   <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                     <SidebarInput label="Margem Lucro (%)" val={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} isMargin />
                   </div>
                </div>
             </div>
           )}
        </nav>

        <div className="p-6 border-t border-white/5">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex justify-center p-3 hover:bg-white/5 rounded-xl transition-all">
              {sidebarOpen ? <ChevronDown className="rotate-90"/> : <ChevronRight/>}
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TOP BAR */}
        <header className="h-24 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-10 z-50">
           <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar leads ou valores..." 
                  className="pl-12 pr-6 py-3 bg-slate-100/50 border-none rounded-2xl outline-none w-[400px] focus:w-[500px] focus:bg-white focus:ring-2 ring-blue-500/10 transition-all font-bold text-slate-600"
                />
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="text-right mr-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Performance Global</p>
                <p className="text-lg font-black text-slate-900 italic">R$ {analytics.totalRevenue.toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-slate-950 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/20 transition-all flex items-center gap-3">
                <PlusCircle size={16}/> Novo Lead
              </button>
           </div>
        </header>

        {/* CONTENT SWITCHER */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#F1F5F9] custom-scrollbar">
          
          {/* TAB: PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 min-w-[1600px] h-full animate-in fade-in duration-700">
               {STAGES.map(stage => {
                 const stageLeads = analytics.filtered.filter(l => l.stage === stage.id);
                 const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                 return (
                   <div 
                     key={stage.id} 
                     onDragOver={e => e.preventDefault()}
                     onDrop={e => updateLead(e.dataTransfer.getData("leadId"), { stage: stage.id })}
                     className="flex flex-col h-full bg-slate-200/30 rounded-[3rem] p-6 border border-slate-300/20 group/column"
                   >
                     <div className="mb-8 px-2 flex justify-between items-end">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`}/>
                            <span className="font-black uppercase text-slate-400 text-[10px] tracking-widest">{stage.label}</span>
                          </div>
                          <h3 className="text-2xl font-black italic text-slate-900 tracking-tighter">R$ {stageTotal.toLocaleString('pt-BR')}</h3>
                        </div>
                        <span className="bg-white/50 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 border border-slate-200">{stageLeads.length}</span>
                     </div>

                     <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {stageLeads.map(lead => (
                          <div 
                            key={lead.id} 
                            draggable 
                            onDragStart={e => e.dataTransfer.setData("leadId", lead.id)}
                            className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-blue-500/30 transition-all cursor-grab group/card active:scale-95 active:rotate-1"
                          >
                             <div className="flex flex-wrap gap-1 mb-4">
                               {lead.tags?.split(',').filter((t:any)=>t).map((tId:any) => {
                                 const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                                 return tag && <span key={tId} className={`px-3 py-1 rounded-full text-[7px] font-black uppercase border ${tag.light}`}>{tag.label}</span>;
                               })}
                             </div>

                             <input 
                               className="font-black text-slate-900 uppercase text-xs mb-1 bg-transparent border-none w-full outline-none group-hover/card:text-blue-600 transition-colors"
                               value={lead.name}
                               onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })}
                             />

                             <div className="flex items-center text-emerald-600 font-black mb-4">
                                <span className="mr-1 italic text-[10px] opacity-40">R$</span>
                                <input 
                                  type="number" 
                                  className="bg-slate-50 px-2 py-1 rounded-lg border-none font-black italic text-lg w-full outline-none focus:bg-white"
                                  value={lead.value}
                                  onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                                />
                             </div>

                             {/* SELETOR DE ETIQUETAS NO CARD (RESTAURADO) */}
                             <div className="flex justify-between gap-1 mb-5 p-2 bg-slate-50 rounded-full border border-slate-100 group-hover/card:border-slate-200 transition-all">
                                {AVAILABLE_TAGS.map(tag => (
                                  <button 
                                    key={tag.id} 
                                    onClick={() => toggleTag(lead, tag.id)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                  />
                                ))}
                             </div>

                             {/* BOTÕES DE ATRIBUTOS (NEGRITO E PRETO) */}
                             <div className="grid grid-cols-2 gap-2">
                                <AttributeButton active={lead.followUp} label="FOLLOW-UP" color="bg-amber-400" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} />
                                <AttributeButton active={lead.hasUpSell} label="UP-SELL" color="bg-purple-400" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} />
                                <AttributeButton active={lead.hasCrossSell} label="CROSS-SELL" color="bg-blue-400" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} />
                                <AttributeButton active={lead.reactivated} label="REATIVADO" color="bg-emerald-400" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} />
                                <AttributeButton active={lead.postSale} label="PÓS-VENDA 100%" color="bg-indigo-400" full onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} />
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                 );
               })}
            </div>
          )}

          {/* TAB: COMMISSION (LOGIC RIGOROSA) */}
          {activeTab === 'commission' && (
            <div className="max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                  
                  <div className="lg:col-span-2 space-y-10">
                     <div className={`p-16 rounded-[5rem] text-white shadow-2xl relative overflow-hidden transition-all duration-700 ${analytics.isMarginOk ? 'bg-slate-950 shadow-blue-500/10' : 'bg-rose-950'}`}>
                        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 text-white"><ShieldCheck size={180}/></div>
                        
                        <p className="text-blue-400 font-black uppercase tracking-[0.4em] mb-6 text-[10px] flex items-center gap-2">
                           <Fingerprint size={14}/> Identificador de Performance Comissionável
                        </p>
                        
                        <h2 className="text-9xl font-black italic tracking-tighter leading-none mb-10 drop-shadow-2xl">
                          R$ {analytics.totalComm.toLocaleString('pt-BR')}
                        </h2>

                        {!analytics.isMarginOk && (
                          <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] border border-rose-500/30 text-rose-500 font-black uppercase tracking-widest text-[11px] mb-10 animate-pulse">
                             <ZapOff size={20}/> Bloqueio de Segurança: Margem de Lucro ≤ 0% detectada. Pagamentos suspensos.
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-12 pt-16 border-t border-white/10">
                           <div className="text-center">
                              <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Alíquota Final</p>
                              <p className="text-4xl font-black italic text-blue-500">{analytics.finalRate.toFixed(2)}%</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Bônus Fixo</p>
                              <p className="text-4xl font-black italic">R$ {analytics.fixedBonusValue}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Revenue Real</p>
                              <p className="text-4xl font-black italic">R$ {analytics.totalRevenue.toLocaleString('pt-BR')}</p>
                           </div>
                           <div className="text-center bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20">
                              <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Atingimento</p>
                              <p className="text-4xl font-black italic">{analytics.revPerf.toFixed(0)}%</p>
                           </div>
                        </div>
                     </div>

                     {/* REGRAS DOS ACELERADORES (+0.5%) */}
                     <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 text-slate-50"><BarChart size={120}/></div>
                        <h3 className="text-2xl font-black italic mb-12 flex items-center gap-4 text-slate-900 tracking-tighter uppercase">
                          <Rocket className="text-blue-600"/> Aceleradores Estratégicos (+0.5% cada)
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <RuleDisplay status={analytics.kpis.ticketMedio >= goals.ticket} label="Meta Ticket Médio" desc={`Mínimo R$ ${goals.ticket.toLocaleString('pt-BR')}`} current={`R$ ${analytics.kpis.ticketMedio.toLocaleString('pt-BR')}`} />
                           <RuleDisplay status={analytics.kpis.convRate >= goals.conversion} label="Conversão Total" desc="Mínimo 5.0% de conversão global" current={`${analytics.kpis.convRate.toFixed(1)}%`} />
                           <RuleDisplay status={analytics.kpis.crossRate >= goals.crossSell} label="Meta Cross-Sell" desc="Mínimo 40.0% das vendas fechadas" current={`${analytics.kpis.crossRate.toFixed(1)}%`} />
                           <RuleDisplay status={analytics.kpis.upRate >= goals.upSell} label="Meta Up-Sell" desc="Mínimo 15.0% das vendas fechadas" current={`${analytics.kpis.upRate.toFixed(1)}%`} />
                        </div>

                        {/* REGRAS DO BÔNUS FIXO R$ 300 */}
                        <div className="mt-12 p-12 bg-slate-900 rounded-[4rem] text-white">
                           <div className="flex justify-between items-center mb-12">
                              <div>
                                 <h4 className="text-2xl font-black italic text-blue-400 tracking-tighter uppercase">Bônus de Qualidade (R$ 300,00)</h4>
                                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Todas as 4 metas abaixo devem ser atingidas simultaneamente</p>
                              </div>
                              {analytics.fixedBonusValue > 0 ? <Crown className="text-yellow-400 animate-bounce" size={40}/> : <ZapOff className="text-white/10" size={40}/>}
                           </div>
                           
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <IndicatorBox active={analytics.checkFlags.m1} label="Contatos" val={`${analytics.indicators.totalLeads}/${goals.contacts}`} />
                              <IndicatorBox active={analytics.checkFlags.m2} label="Follow-up" val={`${analytics.kpis.fupRate.toFixed(0)}%/90%`} />
                              <IndicatorBox active={analytics.checkFlags.m3} label="Pós-Venda" val={`${analytics.kpis.postRate.toFixed(0)}%/100%`} />
                              <IndicatorBox active={analytics.checkFlags.m4} label="Reativados" val={`${analytics.kpis.reactCount}/${goals.reactivated}`} />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* PAINEL DE CONTROLE DE SEMANAS */}
                  <div className="space-y-8">
                     <div className="bg-slate-950 p-10 rounded-[4rem] text-white">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-10 text-center">Faturamento Semanal (Real)</p>
                        <div className="space-y-8">
                           {[1, 2, 3, 4].map(w => (
                             <div key={w} className="flex justify-between items-center group">
                                <div className="flex flex-col">
                                   <span className="font-black text-slate-500 text-xs uppercase">Semana 0{w}</span>
                                   <span className="text-[8px] font-bold text-slate-700">W0{w}-2026</span>
                                </div>
                                <div className="flex items-center gap-3">
                                   <span className="text-slate-700 font-black italic">R$</span>
                                   <input 
                                     type="number" 
                                     value={commSettings.weeks[w].revenue} 
                                     onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})}
                                     className="bg-transparent border-b border-white/10 w-32 text-right font-black text-2xl outline-none focus:border-blue-500 transition-all text-white" 
                                   />
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm text-center">
                        <Trophy size={40} className="mx-auto text-blue-600 mb-6"/>
                        <h4 className="font-black text-slate-900 uppercase tracking-tighter text-xl mb-2">Sua Meta Atual</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Base de cálculo: R$ {goals.revenue.toLocaleString('pt-BR')}</p>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-4">
                           <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${Math.min(analytics.revPerf, 100)}%` }} />
                        </div>
                        <p className="font-black italic text-2xl text-slate-900">{analytics.revPerf.toFixed(1)}%</p>
                     </div>
                  </div>

               </div>
            </div>
          )}

          {/* TAB: METRICS */}
          {activeTab === 'metrics' && (
            <div className="max-w-[1400px] mx-auto space-y-12 animate-in zoom-in-95 duration-700">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <StatWidget icon={<Target/>} label="Conversão" val={analytics.kpis.convRate.toFixed(1) + "%"} meta="5%" color="blue" />
                  <StatWidget icon={<Clock/>} label="Follow-up" val={analytics.kpis.fupRate.toFixed(1) + "%"} meta="90%" color="amber" />
                  <StatWidget icon={<TrendingUp/>} label="Ticket Médio" val={"R$ " + analytics.kpis.ticketMedio.toFixed(0)} meta={"R$ " + goals.ticket} color="emerald" />
                  <StatWidget icon={<RotateCcw/>} label="Reativados" val={analytics.kpis.reactCount} meta={goals.reactivated} color="indigo" />
               </div>

               <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden border border-white">
                  <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
                     <h3 className="font-black italic text-xl tracking-tighter text-slate-900 uppercase">Memorial de KPIs do Ciclo</h3>
                     <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border text-[9px] font-black text-slate-500">
                        <Calendar size={12}/> JANEIRO 2026
                     </div>
                  </div>
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                           <th className="p-10">Métrica de Performance</th>
                           <th className="p-10 text-center">Meta Estabelecida</th>
                           <th className="p-10 text-center">Realizado</th>
                           <th className="p-10 text-center">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y font-bold text-slate-700">
                        <TableRow label="Taxa de Conversão de Pipeline" meta="5.0%" val={analytics.kpis.convRate.toFixed(1) + "%"} status={analytics.kpis.convRate >= 5} />
                        <TableRow label="Eficiência de Follow-up (Orçamentos)" meta="90.0%" val={analytics.kpis.fupRate.toFixed(1) + "%"} status={analytics.kpis.fupRate >= 90} />
                        <TableRow label="Qualidade de Pós-Venda" meta="100.0%" val={analytics.kpis.postRate.toFixed(1) + "%"} status={analytics.kpis.postRate >= 100} />
                        <TableRow label="Adesão Cross-Sell" meta="40.0%" val={analytics.kpis.crossRate.toFixed(1) + "%"} status={analytics.kpis.crossRate >= 40} />
                        <TableRow label="Adesão Up-Sell" meta="15.0%" val={analytics.kpis.upRate.toFixed(1) + "%"} status={analytics.kpis.upRate >= 15} />
                     </tbody>
                  </table>
               </div>
            </div>
          )}

        </div>

        {/* MODAL NOVO LEAD */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative border-t-[24px] border-blue-600 animate-in zoom-in-95 duration-300">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all transform scale-150"><X size={32}/></button>
                <div className="mb-12">
                   <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-[0.8] text-slate-900">Gerar<br/><span className="text-blue-600">Oportunidade</span></h2>
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-6">Input de dados em ambiente seguro</p>
                </div>
                <div className="space-y-8">
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-6">Nome Fantasia / Cliente</p>
                      <input 
                        className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-[2.5rem] font-black text-2xl outline-none transition-all" 
                        placeholder="EX: TECH SOLUTIONS LTDA" 
                        value={newLead.name} 
                        onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} 
                      />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-6">Budget Estimado (R$)</p>
                      <input 
                        type="number" 
                        className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[2.5rem] font-black text-2xl outline-none text-emerald-600 transition-all" 
                        placeholder="0,00" 
                        value={newLead.value} 
                        onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} 
                      />
                   </div>
                   <button 
                     onClick={async () => {
                       if (supabase) {
                         const { error } = await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString()}]);
                         if (!error) {
                           setIsModalOpen(false);
                           fetchLeads();
                           setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                         }
                       }
                     }}
                     className="w-full p-10 bg-slate-950 text-white rounded-full font-black uppercase text-2xl shadow-2xl hover:bg-blue-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-6 group"
                   >
                     Confirmar Cadastro <ArrowRightCircle size={32} className="group-hover:translate-x-2 transition-transform"/>
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
// --- HIGH-PERFORMANCE SUBCOMPONENTS ---
// =============================================================================

const NavItem = ({ icon, label, active, onClick, open }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
  >
    {icon}
    {open && <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>}
  </button>
);

const SidebarInput = ({ label, val, onChange, highlight, isMargin }: any) => (
  <div className="mb-6 last:mb-0">
    <p className={`text-[8px] font-black uppercase mb-2 tracking-widest ${isMargin ? 'text-blue-400' : 'text-slate-600'}`}>{label}</p>
    <input 
      type="number" 
      value={val} 
      onChange={e => onChange(Number(e.target.value))}
      className={`w-full bg-transparent border-b-2 font-black text-xl outline-none transition-all ${isMargin ? 'border-blue-500/30 text-white focus:border-blue-400' : 'border-white/5 text-white/80 focus:border-blue-500'}`}
    />
  </div>
);

const AttributeButton = ({ active, label, color, onClick, full }: any) => (
  <button 
    onClick={onClick}
    className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${full ? 'col-span-2' : ''} ${active ? `${color} border-transparent shadow-lg shadow-black/5` : 'bg-white border-slate-100'}`}
  >
    {label}
  </button>
);

const RuleDisplay = ({ status, label, desc, current }: any) => (
  <div className={`p-8 rounded-[2.5rem] border-2 flex items-start gap-6 transition-all ${status ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
    <div className={`mt-1 p-2 rounded-full ${status ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
      {status ? <Check size={16} strokeWidth={4}/> : <X size={16} strokeWidth={4}/>}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className={`font-black uppercase text-[11px] ${status ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</p>
        <span className={`font-black text-[10px] ${status ? 'text-emerald-500' : 'text-slate-400'}`}>{status ? '+0.5%' : '0%'}</span>
      </div>
      <p className="text-[9px] font-bold text-slate-400 mb-3">{desc}</p>
      <div className="bg-white px-4 py-2 rounded-xl text-xs font-black text-slate-900 border border-slate-100 inline-block italic">
        Realizado: {current}
      </div>
    </div>
  </div>
);

const IndicatorBox = ({ active, label, val }: any) => (
  <div className={`p-6 rounded-3xl border-2 transition-all ${active ? 'bg-blue-600 border-transparent shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/10 opacity-30'}`}>
    <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${active ? 'text-blue-100' : 'text-slate-600'}`}>{label}</p>
    <p className={`text-sm font-black italic ${active ? 'text-white' : 'text-slate-500'}`}>{val}</p>
  </div>
);

const StatWidget = ({ icon, label, val, meta, color }: any) => {
  const colors: any = {
    blue: 'text-blue-500 bg-blue-50',
    amber: 'text-amber-500 bg-amber-50',
    emerald: 'text-emerald-500 bg-emerald-50',
    indigo: 'text-indigo-500 bg-indigo-50'
  };
  return (
    <div className="bg-white p-10 rounded-[3.5rem] border border-white shadow-sm group hover:shadow-2xl transition-all duration-500">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-colors ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black italic text-slate-900 mb-6">{val}</p>
      <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-black">
        <span className="text-slate-400 uppercase">Meta Esperada</span>
        <span className="text-slate-900">{meta}</span>
      </div>
    </div>
  );
};

const TableRow = ({ label, meta, val, status }: any) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="p-10 font-black text-slate-900 uppercase text-[12px]">{label}</td>
    <td className="p-10 text-center text-slate-400 italic font-black">{meta}</td>
    <td className="p-10 text-center">
       <span className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black italic">
          {val}
       </span>
    </td>
    <td className="p-10">
       <div className="flex items-center gap-3 justify-center">
          {status ? (
            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[9px]">
               <CheckCircle2 size={16}/> Atingido
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-500 font-black uppercase text-[9px] opacity-40">
               <AlertCircle size={16}/> Pendente
            </div>
          )}
       </div>
    </td>
  </tr>
);
