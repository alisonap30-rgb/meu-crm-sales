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
// --- MAIN CRM MASTER COMPONENT (V. ELITE 2026) ---
// =============================================================================
export default function CRMMasterFullStack() {
  // --- STATE MANAGEMENT ---
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- GOALS & SETTINGS (EDITABLE AS REQUESTED) ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,        // Editável
    contacts: 400,       // Editável
    reactivated: 8,      // Editável
    conversion: 5,       // Meta 5% fixa
    followUp: 90,        // Meta 90% fixa
    crossSell: 40,       // Meta 40% fixa
    upSell: 15,          // Meta 15% fixa
    postSale: 100        // Meta 100% fixa
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 
      1: { revenue: 0 }, 
      2: { revenue: 0 }, 
      3: { revenue: 0 }, 
      4: { revenue: 0 } 
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
      await supabase.from('leads').update(payload).eq('id', id);
    }
  };

  const toggleTag = (lead: any, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = currentTags.includes(tagId) ? currentTags.filter((t: string) => t !== tagId) : [...currentTags, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- ANALYTICS ENGINE & COMMISSION LOGIC (ALL RULES APPLIED) ---
  // =============================================================================
  const analytics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    const orcamentosLeads = activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage));
    
    // Indicadores Realizados
    const stats = {
      countLeads: activeLeads.length,
      countWon: wonLeads.length,
      revenueWon: wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
      ticketMedio: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / wonLeads.length) : 0,
      convRate: activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0,
      crossRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      upRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      fupRate: orcamentosLeads.length > 0 ? (activeLeads.filter(l => l.followUp).length / orcamentosLeads.length) * 100 : 0,
      postRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      reactCount: activeLeads.filter(l => l.reactivated).length
    };

    const totalRevenueInput = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRevenueInput / goals.revenue) * 100;
    
    // --- REGRA PRINCIPAL: MARGEM DE LUCRO > 0 ---
    const isMarginOk = commSettings.profitMargin > 0;

    // Alíquota Base
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Aceleradores +0.5% cada (Só libera se Margem > 0)
    const bonusTicket = (isMarginOk && stats.ticketMedio >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && stats.convRate >= goals.conversion) ? 0.5 : 0;
    const bonusCross = (isMarginOk && stats.crossRate >= goals.crossSell) ? 0.5 : 0;
    const bonusUp = (isMarginOk && stats.upRate >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // Bônus R$ 300,00 - Regra Principal: Todas abaixo devem ser atingidas
    const checkContatos = stats.countLeads >= goals.contacts;
    const checkFUP = stats.fupRate >= goals.followUp;
    const checkPost = stats.postRate >= goals.postSale;
    const checkReact = stats.reactCount >= goals.reactivated;

    const qualifiesFixedBonus = isMarginOk && checkContatos && checkFUP && checkPost && checkReact;
    const fixedBonusValue = qualifiesFixedBonus ? 300 : 0;

    const totalCommission = (totalRevenueInput * (finalRate / 100)) + fixedBonusValue;

    return { 
      activeLeads, stats, totalRevenueInput, revPerf, finalRate, 
      totalCommission, isMarginOk, fixedBonusValue,
      checks: { checkContatos, checkFUP, checkPost, checkReact }
    };
  }, [leads, commSettings, goals]);

  // =============================================================================
  // --- RENDER ENGINE ---
  // =============================================================================

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <RefreshCw size={60} className="animate-spin text-blue-500 mb-8" />
      <span className="font-black italic tracking-[0.5em] uppercase text-[10px] animate-pulse">Iniciando High-Density Engine...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex overflow-hidden font-sans">
      
      {/* SIDEBAR NAVEGAÇÃO E METAS EDITÁVEIS */}
      <aside className={`bg-slate-950 text-white transition-all duration-500 flex flex-col z-[100] ${sidebarOpen ? 'w-[380px]' : 'w-[80px]'}`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
           <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20"><BriefcaseIcon size={24}/></div>
           {sidebarOpen && (
             <div className="animate-in fade-in slide-in-from-left-4 duration-500">
               <h2 className="font-black italic text-xl tracking-tighter uppercase">Sales<span className="text-blue-500">Ultra</span></h2>
               <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Commission Logic V2</p>
             </div>
           )}
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
           <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard Pipeline" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
           <NavItem icon={<Target size={20}/>} label="Indicadores & KPIs" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />
           <NavItem icon={<Coins size={20}/>} label="Painel de Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
           
           {sidebarOpen && (
             <div className="mt-12 space-y-8 px-4 animate-in fade-in duration-700">
                <div className="pt-8 border-t border-white/5">
                   <p className="text-[10px] font-black uppercase text-blue-500 mb-8 tracking-[0.2em]">Configurações de Metas (Editáveis)</p>
                   <SidebarInput label="Meta Ticket Médio (R$)" val={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                   <SidebarInput label="Meta Contatos/Mês" val={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} />
                   <SidebarInput label="Meta Clientes Reativados" val={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} />
                   
                   <div className="mt-10 p-6 bg-blue-600/10 rounded-[2rem] border border-blue-500/20">
                     <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Regra Principal de Bloqueio</p>
                     <SidebarInput label="Margem de Lucro (%)" val={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} isMargin />
                   </div>
                </div>
             </div>
           )}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER BAR */}
        <header className="h-24 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-10 z-50">
           <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar leads..." 
                  className="pl-12 pr-6 py-3 bg-slate-100/50 border-none rounded-2xl outline-none w-[350px] focus:bg-white transition-all font-bold"
                />
              </div>
           </div>
           <button onClick={() => setIsModalOpen(true)} className="bg-slate-950 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3">
             <PlusCircle size={16}/> Novo Lead
           </button>
        </header>

        {/* CONTENT SWITCHER */}
        <div className="flex-1 overflow-y-auto p-10 bg-[#F1F5F9] custom-scrollbar">
          
          {/* TAB: PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 min-w-[1600px] h-full animate-in fade-in duration-700">
               {STAGES.map(stage => {
                 const stageLeads = analytics.activeLeads.filter(l => l.stage === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
                 const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                 return (
                   <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => updateLead(e.dataTransfer.getData("leadId"), { stage: stage.id })} className="flex flex-col h-full bg-slate-200/40 rounded-[3rem] p-6 border border-slate-300/20">
                     <div className="mb-8 px-2">
                        <span className="font-black uppercase text-slate-400 text-[9px] tracking-widest mb-1 block">{stage.label}</span>
                        <h3 className="text-2xl font-black italic text-slate-900">R$ {stageTotal.toLocaleString('pt-BR')}</h3>
                     </div>

                     <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {stageLeads.map(lead => (
                          <div key={lead.id} draggable onDragStart={e => e.dataTransfer.setData("leadId", lead.id)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-blue-500/30 transition-all cursor-grab group">
                             <div className="flex flex-wrap gap-1 mb-4">
                               {lead.tags?.split(',').filter((t:any)=>t).map((tId:any) => {
                                 const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                                 return tag && <span key={tId} className={`px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase border ${tag.light}`}>{tag.label}</span>;
                               })}
                             </div>
                             
                             <input className="font-black text-slate-900 uppercase text-xs mb-1 bg-transparent border-none w-full outline-none" value={lead.name} onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })} />
                             <div className="flex items-center text-emerald-600 font-black mb-4">
                                <span className="mr-1 italic text-[10px] opacity-40">R$</span>
                                <input type="number" className="bg-slate-50 px-2 py-1 rounded-lg border-none font-black italic text-lg w-full outline-none" value={lead.value} onChange={e => updateLead(lead.id, { value: Number(e.target.value) })} />
                             </div>

                             {/* SELETOR DE ETIQUETAS INTEGRADO NO CARD */}
                             <div className="flex justify-between gap-1 mb-5 p-2 bg-slate-50 rounded-full border border-slate-100">
                                {AVAILABLE_TAGS.map(tag => (
                                  <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-6 h-6 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-white border-slate-200 hover:border-slate-400'}`} />
                                ))}
                             </div>

                             {/* BOTÕES DE ATRIBUTOS (NEGRITO E PRETO CONFORME SOLICITADO) */}
                             <div className="grid grid-cols-2 gap-2">
                                <AttributeBtn active={lead.followUp} label="FOLLOW-UP" color="bg-amber-400" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} />
                                <AttributeBtn active={lead.hasUpSell} label="UP-SELL" color="bg-purple-400" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} />
                                <AttributeBtn active={lead.hasCrossSell} label="CROSS-SELL" color="bg-blue-400" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} />
                                <AttributeBtn active={lead.reactivated} label="REATIVADO" color="bg-emerald-400" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} />
                                <AttributeBtn active={lead.postSale} label="PÓS-VENDA 100%" color="bg-indigo-400" full onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} />
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
            <div className="max-w-[1400px] mx-auto animate-in slide-in-from-bottom-8 duration-1000">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  
                  <div className="lg:col-span-2 space-y-10">
                     <div className={`p-16 rounded-[5rem] text-white shadow-2xl relative overflow-hidden transition-all duration-700 ${analytics.isMarginOk ? 'bg-slate-950 shadow-blue-500/10' : 'bg-rose-950 shadow-rose-900/40'}`}>
                        <p className="text-blue-400 font-black uppercase tracking-[0.4em] mb-6 text-[10px] flex items-center gap-2">
                           <ShieldCheck size={14}/> Simulador de Pagamento Estratégico
                        </p>
                        <h2 className="text-[10rem] font-black italic tracking-tighter leading-none mb-10">
                          R$ {analytics.totalCommission.toLocaleString('pt-BR')}
                        </h2>

                        {!analytics.isMarginOk && (
                          <div className="bg-white/10 p-6 rounded-[2rem] border border-rose-500/30 text-rose-500 font-black uppercase tracking-widest text-[11px] mb-10 animate-pulse flex items-center gap-4">
                             <ZapOff size={24}/> Atenção: Bônus Bloqueados (Margem $\le$ 0)
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-12 pt-16 border-t border-white/10">
                           <StatMini label="Alíquota Final" val={`${analytics.finalRate.toFixed(2)}%`} />
                           <StatMini label="Bônus Fixo" val={`R$ ${analytics.fixedBonusValue}`} />
                           <StatMini label="Receita Bruta" val={`R$ ${analytics.totalRevenueInput.toLocaleString('pt-BR')}`} />
                           <StatMini label="Atingimento" val={`${analytics.revPerf.toFixed(0)}%`} highlight />
                        </div>
                     </div>

                     {/* ACELERADORES +0.5% */}
                     <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
                        <h3 className="text-2xl font-black italic mb-10 flex items-center gap-4 text-slate-900 uppercase">
                          <Rocket className="text-blue-600"/> Aceleradores (+0.5% cada)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <RuleCard status={analytics.stats.ticketMedio >= goals.ticket} label="Ticket Médio" desc={`Mínimo R$ ${goals.ticket.toLocaleString('pt-BR')}`} current={`R$ ${analytics.stats.ticketMedio.toLocaleString('pt-BR')}`} />
                           <RuleCard status={analytics.stats.convRate >= goals.conversion} label="Conversão (5%)" desc="Mínimo 5.0% global" current={`${analytics.stats.convRate.toFixed(1)}%`} />
                           <RuleCard status={analytics.stats.crossRate >= goals.crossSell} label="Cross-Sell (40%)" desc="Meta 40.0% das vendas" current={`${analytics.stats.crossRate.toFixed(1)}%`} />
                           <RuleCard status={analytics.stats.upRate >= goals.upSell} label="Up-Sell (15%)" desc="Meta 15.0% das vendas" current={`${analytics.stats.upRate.toFixed(1)}%`} />
                        </div>

                        {/* BÔNUS FIXO R$ 300 */}
                        <div className="mt-12 p-12 bg-slate-900 rounded-[4rem] text-white">
                           <div className="flex justify-between items-center mb-10">
                              <h4 className="text-2xl font-black italic text-blue-400 uppercase">Combo Bônus Fixo (R$ 300,00)</h4>
                              {analytics.fixedBonusValue > 0 ? <Crown className="text-yellow-400 animate-bounce" size={40}/> : <AlertTriangle className="text-white/5" size={40}/>}
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <Indicator status={analytics.checks.checkContatos} label="Contatos" val={`${analytics.stats.countLeads}/${goals.contacts}`} />
                              <Indicator status={analytics.checks.checkFUP} label="Follow-up" val={`${analytics.stats.fupRate.toFixed(0)}%/90%`} />
                              <Indicator status={analytics.checks.checkPost} label="Pós-Venda" val={`${analytics.stats.postRate.toFixed(0)}%/100%`} />
                              <Indicator status={analytics.checks.checkReact} label="Reativados" val={`${analytics.stats.reactCount}/${goals.reactivated}`} />
                           </div>
                        </div>
                     </div>
                  </div>

                  <aside className="space-y-8">
                     <div className="bg-slate-950 p-10 rounded-[4rem] text-white">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-10 text-center">Ajuste de Faturamento Semanal</p>
                        <div className="space-y-8">
                           {[1, 2, 3, 4].map(w => (
                             <div key={w} className="flex justify-between items-center">
                                <span className="font-black text-slate-500 uppercase text-xs tracking-tighter">Semana {w}</span>
                                <input 
                                  type="number" 
                                  value={commSettings.weeks[w].revenue} 
                                  onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})}
                                  className="bg-transparent border-b border-white/10 w-32 text-right font-black text-2xl outline-none text-white focus:border-blue-500 transition-all" 
                                />
                             </div>
                           ))}
                        </div>
                     </div>
                  </aside>

               </div>
            </div>
          )}

          {/* TAB: METRICS */}
          {activeTab === 'metrics' && (
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
               <div className="grid grid-cols-4 gap-8">
                  <StatWidget label="Conversão" val={analytics.stats.convRate.toFixed(1) + "%"} meta="5%" progress={analytics.stats.convRate / 5 * 100} icon={<Target className="text-blue-500"/>} />
                  <StatWidget label="Follow-up" val={analytics.stats.fupRate.toFixed(1) + "%"} meta="90%" progress={analytics.stats.fupRate / 90 * 100} icon={<Clock className="text-amber-500"/>} />
                  <StatWidget label="Ticket Médio" val={"R$ " + analytics.stats.ticketMedio.toFixed(0)} meta={"R$ " + goals.ticket} progress={analytics.stats.ticketMedio / goals.ticket * 100} icon={<TrendingUp className="text-emerald-500"/>} />
                  <StatWidget label="Reativados" val={analytics.stats.reactCount} meta={goals.reactivated} progress={analytics.stats.reactCount / goals.reactivated * 100} icon={<RotateCcw className="text-purple-500"/>} />
               </div>

               <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden border border-white">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                           <th className="p-10">Indicador Estratégico</th>
                           <th className="p-10 text-center">Meta do Ciclo</th>
                           <th className="p-10 text-center">Realizado</th>
                           <th className="p-10 text-center">Status de Bônus</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y font-bold text-slate-700">
                        <TableRow label="Taxa de Conversão" meta="5.0%" val={analytics.stats.convRate.toFixed(1) + "%"} status={analytics.stats.convRate >= 5} />
                        <TableRow label="Eficiência de Follow-up" meta="90.0%" val={analytics.stats.fupRate.toFixed(1) + "%"} status={analytics.stats.fupRate >= 90} />
                        <TableRow label="Pós-Venda (Qualidade)" meta="100.0%" val={analytics.stats.postRate.toFixed(1) + "%"} status={analytics.stats.postRate >= 100} />
                        <TableRow label="Adesão Cross-Sell" meta="40.0%" val={analytics.stats.crossRate.toFixed(1) + "%"} status={analytics.stats.crossRate >= 40} />
                        <TableRow label="Adesão Up-Sell" meta="15.0%" val={analytics.stats.upRate.toFixed(1) + "%"} status={analytics.stats.upRate >= 15} />
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>

        {/* MODAL NOVO LEAD */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative border-t-[20px] border-blue-600 animate-in zoom-in-95 duration-300 text-slate-950">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 transition-all scale-150"><X size={32}/></button>
                <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none mb-10">Novo<br/><span className="text-blue-600">Lead</span></h2>
                <div className="space-y-6">
                   <input className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-2xl outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all" placeholder="NOME DO CLIENTE" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} />
                   <input type="number" className="w-full p-8 bg-slate-50 rounded-[2.5rem] font-black text-2xl outline-none text-emerald-600 focus:bg-white border-2 border-transparent focus:border-emerald-500 transition-all" placeholder="VALOR ESTIMADO (R$)" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
                   <button 
                     onClick={async () => {
                       if (supabase) {
                         const { error } = await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString()}]);
                         if (!error) { fetchLeads(); setIsModalOpen(false); }
                       }
                     }}
                     className="w-full p-10 bg-blue-600 text-white rounded-full font-black uppercase text-2xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-6"
                   >CRIAR OPORTUNIDADE <ArrowRightCircle size={32}/></button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// --- HIGH-DENSITY SUBCOMPONENTS ---
// =============================================================================

const NavItem = ({ icon, label, active, onClick, open }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
    {icon}
    {open && <span className="font-black uppercase tracking-widest text-[10px]">{label}</span>}
  </button>
);

const SidebarInput = ({ label, val, onChange, isMargin }: any) => (
  <div className="mb-6 last:mb-0">
    <p className={`text-[8px] font-black uppercase mb-2 tracking-widest ${isMargin ? 'text-blue-400' : 'text-slate-600'}`}>{label}</p>
    <input 
      type="number" 
      value={val} 
      onChange={e => onChange(Number(e.target.value))}
      className="w-full bg-transparent border-b-2 border-white/5 text-white font-black text-xl outline-none focus:border-blue-500 transition-all"
    />
  </div>
);

const AttributeBtn = ({ active, label, color, onClick, full }: any) => (
  <button onClick={onClick} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${full ? 'col-span-2' : ''} ${active ? `${color} border-transparent shadow-lg` : 'bg-white border-slate-100'}`}>
    {label}
  </button>
);

const RuleCard = ({ status, label, desc, current }: any) => (
  <div className={`p-8 rounded-[2.5rem] border-2 flex items-start gap-6 transition-all ${status ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
    <div className={`mt-1 p-2 rounded-full ${status ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
      {status ? <Check size={16} strokeWidth={4}/> : <X size={16} strokeWidth={4}/>}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className={`font-black uppercase text-[11px] ${status ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</p>
        <span className={`font-black text-[10px] ${status ? 'text-emerald-500' : 'text-slate-400'}`}>{status ? '+0.5%' : '0%'}</span>
      </div>
      <p className="text-[9px] font-bold text-slate-400 mb-3">{desc}</p>
      <div className="bg-white px-4 py-2 rounded-xl text-xs font-black text-slate-900 border border-slate-100 inline-block italic">Realizado: {current}</div>
    </div>
  </div>
);

const Indicator = ({ status, label, val }: any) => (
  <div className={`p-6 rounded-3xl border-2 transition-all ${status ? 'bg-blue-600 border-transparent shadow-xl shadow-blue-500/20' : 'bg-white/5 border-white/10 opacity-30'}`}>
    <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${status ? 'text-blue-100' : 'text-slate-600'}`}>{label}</p>
    <p className={`text-sm font-black italic ${status ? 'text-white' : 'text-slate-500'}`}>{val}</p>
  </div>
);

const StatMini = ({ label, val, highlight }: any) => (
  <div className="text-center">
    <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className={`text-4xl font-black italic ${highlight ? 'text-blue-500' : 'text-white'}`}>{val}</p>
  </div>
);

const StatWidget = ({ label, val, meta, icon, progress }: any) => (
  <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-white hover:shadow-2xl transition-all duration-500 group">
    <div className="flex justify-between items-start mb-8">
      <div className="bg-slate-50 p-5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">{icon}</div>
      <div className="text-right">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
         <p className="text-4xl font-black italic text-slate-950">{val}</p>
      </div>
    </div>
    <div className="space-y-3">
       <div className="flex justify-between text-[10px] font-black uppercase">
         <span className="text-slate-400">Meta: {meta}</span>
         <span className="text-blue-600">{progress.toFixed(0)}%</span>
       </div>
       <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }} />
       </div>
    </div>
  </div>
);

const TableRow = ({ label, meta, val, status }: any) => (
  <tr className="hover:bg-slate-50 transition-colors">
    <td className="p-10 font-black text-slate-900 uppercase text-[12px]">{label}</td>
    <td className="p-10 text-center text-slate-400 italic font-black">{meta}</td>
    <td className="p-10 text-center">
       <span className="px-6 py-2 bg-slate-950 text-white rounded-full text-[10px] font-black italic">{val}</span>
    </td>
    <td className="p-10">
       <div className="flex items-center gap-3 justify-center">
          {status ? (
            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[9px]">
               <CheckCircle2 size={16}/> Meta Atingida
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
