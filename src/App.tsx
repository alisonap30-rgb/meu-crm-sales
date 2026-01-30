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
// --- CORE ENGINE CONFIGURATION ---
// =============================================================================

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "", 
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', glow: 'shadow-slate-200' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', glow: 'shadow-blue-200' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', glow: 'shadow-amber-200' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-200' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', glow: 'shadow-rose-200' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

// =============================================================================
// --- MAIN APPLICATION COMPONENT ---
// =============================================================================

export default function CRMMasterFullStack() {
  // --- STATE PERSISTENCE ---
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // --- EDITABLE GOALS STATE ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,
    contacts: 400,
    reactivated: 8
  });

  // --- FINANCIALS STATE ---
  const [commSettings, setCommSettings] = useState({
    weeks: { 1: 0, 2: 0, 3: 0, 4: 0 },
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // =============================================================================
  // --- DATABASE HANDLERS ---
  // =============================================================================

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Database Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) console.error("Update Error:", error);
  };

  const createLead = async () => {
    if (!newLead.name) return;
    const payload = { ...newLead, lastUpdate: new Date().toISOString() };
    const { data, error } = await supabase.from('leads').insert([payload]).select();
    if (!error && data) {
      setLeads([data[0], ...leads]);
      setIsModalOpen(false);
      setNewLead({ name: '', value: 0, stage: 'contato', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false });
    }
  };

  const toggleTag = (lead: any, tagId: string) => {
    const current = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = current.includes(tagId) ? current.filter((t: string) => t !== tagId) : [...current, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- ANALYTICS ENGINE (THE BRAIN) ---
  // =============================================================================

  const analytics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    const totalRevenueInput = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b), 0);
    
    // Core KPIs
    const stats = {
      count: activeLeads.length,
      revenue: wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
      tm: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + Number(curr.value), 0) / wonLeads.length) : 0,
      conv: activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0,
      cross: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      up: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      fup: activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length > 0 
           ? (activeLeads.filter(l => l.followUp).length / activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length) * 100 : 0,
      post: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      react: activeLeads.filter(l => l.reactivated).length
    };

    // COMMISSION LOGIC - STRICT RULES
    const isMarginOk = commSettings.profitMargin > 0;
    const revPerf = (totalRevenueInput / goals.revenue) * 100;

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Aceleradores +0.5% each
    const bonusTicket = (isMarginOk && stats.tm >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && stats.conv >= 5) ? 0.5 : 0;
    const bonusCross = (isMarginOk && stats.cross >= 40) ? 0.5 : 0;
    const bonusUp = (isMarginOk && stats.up >= 15) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // Bônus R$ 300 - Combo Logic
    const checks = {
      contacts: activeLeads.length >= goals.contacts,
      fup: stats.fup >= 90,
      post: stats.post >= 100,
      react: stats.react >= goals.reactivated
    };

    const qualifiesBonus300 = isMarginOk && checks.contacts && checks.fup && checks.post && checks.react;
    const bonus300Value = qualifiesBonus300 ? 300 : 0;

    const finalCommission = (totalRevenueInput * (finalRate / 100)) + bonus300Value;

    return { stats, finalRate, finalCommission, isMarginOk, checks, bonus300Value, totalRevenueInput, revPerf };
  }, [leads, goals, commSettings]);

  // =============================================================================
  // --- UI RENDER ENGINE ---
  // =============================================================================

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR COMPONENT */}
      <aside className={`bg-slate-950 text-white transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col z-[100] relative ${sidebarOpen ? 'w-[400px]' : 'w-[100px]'}`}>
        <div className="p-10 flex items-center gap-6 border-b border-white/5">
           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-[2rem] shadow-2xl shadow-blue-500/20">
              <Briefcase size={28}/>
           </div>
           {sidebarOpen && (
             <div className="animate-in fade-in slide-in-from-left-4 duration-1000">
               <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Ultra<span className="text-blue-500">CRM</span></h1>
               <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase mt-1">Enterprise Analytics</p>
             </div>
           )}
        </div>

        <nav className="p-6 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
           <SidebarNavItem icon={<LayoutDashboard/>} label="Pipeline Estratégico" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
           <SidebarNavItem icon={<PieChart/>} label="KPIs & Métricas" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />
           <SidebarNavItem icon={<Coins/>} label="Painel de Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
           
           {sidebarOpen && (
             <div className="mt-16 pt-10 border-t border-white/5 space-y-10 animate-in fade-in duration-1000">
                <div>
                   <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6 block">Configurações de Metas</label>
                   <div className="space-y-6">
                      <MetaInput label="Meta Ticket Médio (R$)" value={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                      <MetaInput label="Meta Contatos/Mês" value={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} />
                      <MetaInput label="Meta Reativados" value={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} />
                   </div>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                   <MetaInput label="Margem de Lucro (%)" value={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} isMargin />
                </div>
             </div>
           )}
        </nav>

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-10 flex justify-center hover:bg-white/5 transition-all text-slate-500">
           <ArrowDownWideNarrow className={sidebarOpen ? "rotate-90" : "-rotate-90"} />
        </button>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-28 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-12 z-50">
           <div className="flex items-center gap-8">
              <div className="relative group">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20}/>
                 <input 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   placeholder="Pesquisar leads ou valores..." 
                   className="pl-14 pr-8 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-[2rem] outline-none w-[450px] font-bold text-slate-600 transition-all"
                 />
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right mr-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Global</p>
                 <p className="text-xl font-black italic text-slate-900">{analytics.revPerf.toFixed(1)}%</p>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-slate-950 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-500/40 transition-all flex items-center gap-3">
                 <PlusCircle size={18}/> Novo Lead
              </button>
           </div>
        </header>

        {/* DYNAMIC VIEWPORT */}
        <div className="flex-1 overflow-auto p-12 bg-[#F8FAFC] custom-scrollbar">
           
           {/* TAB: PIPELINE */}
           {activeTab === 'pipeline' && (
             <div className="flex gap-10 h-full min-w-[1700px] animate-in fade-in duration-700">
                {STAGES.map(stage => {
                  const stageLeads = leads.filter(l => l.stage === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
                  const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                  
                  return (
                    <div 
                      key={stage.id} 
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        const id = e.dataTransfer.getData("leadId");
                        updateLead(id, { stage: stage.id });
                        setDraggedItem(null);
                      }}
                      className={`w-[340px] flex flex-col bg-slate-200/30 rounded-[3.5rem] p-6 border-2 border-dashed transition-all ${draggedItem ? 'border-blue-500/20 bg-blue-50/10' : 'border-transparent'}`}
                    >
                      <div className="mb-8 px-4 flex justify-between items-end">
                         <div>
                            <span className={`w-3 h-3 rounded-full inline-block mr-2 ${stage.color}`}></span>
                            <span className="font-black uppercase text-slate-400 text-[10px] tracking-widest">{stage.label}</span>
                            <h3 className="text-2xl font-black italic text-slate-900 mt-1">R$ {stageTotal.toLocaleString('pt-BR')}</h3>
                         </div>
                         <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 shadow-sm border border-slate-100">{stageLeads.length}</span>
                      </div>

                      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                         {stageLeads.map(lead => (
                           <div 
                             key={lead.id} 
                             draggable 
                             onDragStart={e => {
                               e.dataTransfer.setData("leadId", lead.id);
                               setDraggedItem(lead.id);
                             }}
                             className="bg-white p-7 rounded-[3rem] shadow-sm border-2 border-transparent hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                           >
                             {/* TAG SELECTOR RESTORED */}
                             <div className="flex justify-between gap-1 mb-5 p-2 bg-slate-50 rounded-full border border-slate-100">
                                {AVAILABLE_TAGS.map(tag => (
                                  <button 
                                    key={tag.id} 
                                    onClick={() => toggleTag(lead, tag.id)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                  />
                                ))}
                             </div>

                             <input 
                               className="font-black text-slate-900 uppercase text-sm mb-1 bg-transparent border-none w-full outline-none focus:ring-0" 
                               value={lead.name} 
                               onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })} 
                             />
                             <div className="flex items-center text-emerald-600 font-black mb-6">
                                <span className="text-xs mr-1 opacity-50">R$</span>
                                <input 
                                  type="number" 
                                  className="bg-slate-50 px-3 py-1 rounded-xl border-none font-black italic text-xl w-full outline-none focus:bg-emerald-50" 
                                  value={lead.value} 
                                  onChange={e => updateLead(lead.id, { value: Number(e.target.value) })} 
                                />
                             </div>

                             {/* ACTION BUTTONS (BLACK & BOLD) */}
                             <div className="grid grid-cols-2 gap-2">
                                <AttributeButton active={lead.followUp} label="FOLLOW-UP" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-400" />
                                <AttributeButton active={lead.hasUpSell} label="UP-SELL" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-400" />
                                <AttributeButton active={lead.hasCrossSell} label="CROSS-SELL" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-sky-400" />
                                <AttributeButton active={lead.reactivated} label="REATIVADO" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} color="bg-emerald-400" />
                                <AttributeButton active={lead.postSale} label="PÓS-VENDA 100%" onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-indigo-500" full />
                             </div>

                             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => updateLead(lead.id, { isArchived: true })} className="text-slate-300 hover:text-rose-500"><Trash2 size={14}/></button>
                             </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  );
                })}
             </div>
           )}

           {/* TAB: COMMISSION (STRICT RULES) */}
           {activeTab === 'commission' && (
             <div className="max-w-[1400px] mx-auto space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                   
                   <div className="lg:col-span-2 space-y-10">
                      {/* MAIN DISPLAY */}
                      <div className={`p-20 rounded-[5rem] text-white shadow-2xl relative overflow-hidden transition-all duration-1000 ${analytics.isMarginOk ? 'bg-slate-950' : 'bg-rose-950'}`}>
                         <div className="absolute top-0 right-0 p-20 opacity-5 -rotate-12"><Scale size={300}/></div>
                         
                         <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-[11px] mb-8 flex items-center gap-3">
                            <ShieldCheck size={16}/> Motor de Cálculo de Comissão V2
                         </p>
                         
                         <h2 className="text-[12rem] font-black italic tracking-tighter leading-none mb-12">
                           R$ {analytics.finalCommission.toLocaleString('pt-BR')}
                         </h2>

                         {!analytics.isMarginOk && (
                           <div className="bg-white/5 p-8 rounded-[2.5rem] border border-rose-500/30 text-rose-500 font-black uppercase text-xs mb-12 animate-pulse flex items-center gap-5">
                              <ZapOff size={32}/> Regra de Bloqueio Ativa: Margem de Lucro $\le$ 0% impede o pagamento de quaisquer bônus ou comissão variável.
                           </div>
                         )}

                         <div className="grid grid-cols-4 gap-12 pt-16 border-t border-white/5">
                            <DisplayStat label="Alíquota Final" value={`${analytics.finalRate.toFixed(2)}%`} />
                            <DisplayStat label="Bônus Fixo" value={`R$ ${analytics.bonus300Value}`} />
                            <DisplayStat label="Faturamento Total" value={`R$ ${analytics.totalRevenueInput.toLocaleString('pt-BR')}`} />
                            <DisplayStat label="Meta Realizada" value={`${analytics.revPerf.toFixed(0)}%`} highlight />
                         </div>
                      </div>

                      {/* ACELERADORES +0.5% */}
                      <div className="bg-white p-16 rounded-[5rem] shadow-sm border border-slate-100">
                         <div className="flex justify-between items-center mb-16">
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-5">
                               <Rocket className="text-blue-600" size={32}/> Aceleradores de Performance (+0,5%)
                            </h3>
                            <div className="bg-slate-100 px-6 py-2 rounded-full font-black text-[10px] text-slate-500 uppercase">Margem Mínima Requerida</div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <AcceleratorCard status={analytics.stats.tm >= goals.ticket} label="Ticket Médio" target={`R$ ${goals.ticket.toLocaleString()}`} current={`R$ ${analytics.stats.tm.toFixed(0)}`} />
                            <AcceleratorCard status={analytics.stats.conv >= 5} label="Taxa de Conversão" target="5.0%" current={`${analytics.stats.conv.toFixed(1)}%`} />
                            <AcceleratorCard status={analytics.stats.cross >= 40} label="Cross-Sell" target="40.0%" current={`${analytics.stats.cross.toFixed(1)}%`} />
                            <AcceleratorCard status={analytics.stats.up >= 15} label="Up-Sell" target="15.0%" current={`${analytics.stats.up.toFixed(1)}%`} />
                         </div>

                         {/* BÔNUS R$ 300 SECTION */}
                         <div className="mt-16 bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10"><Trophy size={100}/></div>
                            <h4 className="text-2xl font-black italic text-blue-400 uppercase mb-4 tracking-tighter">Bônus de Excelência Operacional (R$ 300,00)</h4>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-12">Todas as metas abaixo devem ser atingidas simultaneamente</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                               <ComboIndicator active={analytics.checks.contacts} label="Contatos" val={`${analytics.stats.count}/${goals.contacts}`} />
                               <ComboIndicator active={analytics.checks.fup} label="Follow-up" val={`${analytics.stats.fup.toFixed(0)}%/90%`} />
                               <ComboIndicator active={analytics.checks.post} label="Pós-Venda" val={`${analytics.stats.post.toFixed(0)}%/100%`} />
                               <ComboIndicator active={analytics.checks.react} label="Reativados" val={`${analytics.stats.react}/${goals.reactivated}`} />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* RIGHT PANEL - REVENUE INPUTS */}
                   <aside className="space-y-10">
                      <div className="bg-slate-950 p-12 rounded-[4.5rem] text-white shadow-2xl">
                         <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-12 text-center">Faturamento Mensal p/ Semana</p>
                         <div className="space-y-10">
                            {[1, 2, 3, 4].map(w => (
                              <div key={w} className="group">
                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block group-focus-within:text-blue-500 transition-colors text-center">Volume Semana {w}</label>
                                 <div className="relative">
                                    <span className="absolute left-0 bottom-3 text-slate-700 font-black italic text-xl">R$</span>
                                    <input 
                                       type="number" 
                                       value={commSettings.weeks[w as keyof typeof commSettings.weeks]} 
                                       onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: e.target.value}})}
                                       className="bg-transparent border-b-2 border-white/5 w-full text-center font-black text-4xl py-2 outline-none focus:border-blue-600 transition-all"
                                    />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm text-center group">
                         <Activity className="mx-auto text-blue-600 mb-6 group-hover:scale-110 transition-transform" size={48}/>
                         <h4 className="font-black uppercase text-xs tracking-widest text-slate-400 mb-2">Margem Proposta</h4>
                         <p className="text-6xl font-black italic text-slate-950">{commSettings.profitMargin}%</p>
                         <div className={`mt-6 inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-[10px] uppercase ${analytics.isMarginOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {analytics.isMarginOk ? 'Margem Segura' : 'Margem de Risco'}
                         </div>
                      </div>
                   </aside>

                </div>
             </div>
           )}

           {/* TAB: METRICS */}
           {activeTab === 'metrics' && (
             <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-1000">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                   <MetricWidget label="Taxa de Conversão" val={`${analytics.stats.conv.toFixed(1)}%`} meta="5.0%" icon={<Gauge/>} progress={analytics.stats.conv / 5 * 100} color="text-blue-500" />
                   <MetricWidget label="Follow-up Rate" val={`${analytics.stats.fup.toFixed(1)}%`} meta="90.0%" icon={<Clock/>} progress={analytics.stats.fup / 90 * 100} color="text-amber-500" />
                   <MetricWidget label="Ticket Médio" val={`R$ ${analytics.stats.tm.toFixed(0)}`} meta={`R$ ${goals.ticket}`} icon={<TrendingUp/>} progress={analytics.stats.tm / goals.ticket * 100} color="text-emerald-500" />
                   <MetricWidget label="Clientes Reativados" val={analytics.stats.react} meta={goals.reactivated} icon={<RotateCcw/>} progress={analytics.stats.react / goals.reactivated * 100} color="text-purple-500" />
                </div>

                <div className="bg-white rounded-[4.5rem] shadow-xl overflow-hidden border border-white">
                   <div className="p-12 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">Auditoria de Metas Mensais</h3>
                      <button onClick={() => window.print()} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400"><Archive size={20}/></button>
                   </div>
                   <table className="w-full">
                      <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                         <tr>
                            <th className="p-10 text-left">Indicador Estratégico</th>
                            <th className="p-10 text-center">Meta Estabelecida</th>
                            <th className="p-10 text-center">Realizado</th>
                            <th className="p-10 text-right">Status de Bônus</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-bold">
                         <MetricTableRow label="Taxa de Conversão de Leads" meta="5.0%" current={`${analytics.stats.conv.toFixed(1)}%`} status={analytics.stats.conv >= 5} />
                         <MetricTableRow label="Aderência ao Follow-up" meta="90.0%" current={`${analytics.stats.fup.toFixed(1)}%`} status={analytics.stats.fup >= 90} />
                         <MetricTableRow label="Qualidade Pós-Venda" meta="100.0%" current={`${analytics.stats.post.toFixed(1)}%`} status={analytics.stats.post >= 100} />
                         <MetricTableRow label="Mix de Venda (Cross-Sell)" meta="40.0%" current={`${analytics.stats.cross.toFixed(1)}%`} status={analytics.stats.cross >= 40} />
                         <MetricTableRow label="Upsell na Carteira" meta="15.0%" current={`${analytics.stats.up.toFixed(1)}%`} status={analytics.stats.up >= 15} />
                      </tbody>
                   </table>
                </div>
             </div>
           )}

        </div>

        {/* CREATE LEAD MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[999] flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-2xl rounded-[5rem] p-20 shadow-2xl relative border-t-[24px] border-blue-600 animate-in zoom-in-95 duration-500">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 scale-150 transition-all"><X size={28}/></button>
                <div className="mb-12">
                   <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8]">Nova<br/><span className="text-blue-600 text-7xl">Oportunidade</span></h2>
                </div>
                
                <div className="space-y-8">
                   <div className="group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block group-focus-within:text-blue-600">Nome do Cliente</label>
                      <input 
                        className="w-full p-8 bg-slate-100/50 rounded-[2.5rem] font-black text-3xl outline-none focus:bg-white border-4 border-transparent focus:border-blue-600 transition-all" 
                        placeholder="NOME COMPLETO" 
                        value={newLead.name} 
                        onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} 
                      />
                   </div>

                   <div className="group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block group-focus-within:text-emerald-600">Valor Projetado (R$)</label>
                      <input 
                        type="number"
                        className="w-full p-8 bg-slate-100/50 rounded-[2.5rem] font-black text-3xl outline-none focus:bg-white border-4 border-transparent focus:border-emerald-600 transition-all text-emerald-600" 
                        placeholder="0,00" 
                        value={newLead.value} 
                        onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} 
                      />
                   </div>

                   <button 
                     onClick={createLead}
                     className="w-full py-10 bg-slate-950 text-white rounded-full font-black uppercase text-2xl tracking-[0.2em] shadow-2xl hover:bg-blue-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-6"
                   >
                     Confirmar Entrada <ArrowRightCircle size={40}/>
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
// --- HIGH-DENSITY SUBCOMPONENTS ---
// =============================================================================

function SidebarNavItem({ icon, label, active, onClick, open }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-5 p-5 rounded-[1.5rem] transition-all duration-500 ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-2' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
    >
      <span className={active ? 'scale-110' : ''}>{icon}</span>
      {open && <span className="font-black uppercase text-[10px] tracking-[0.2em]">{label}</span>}
    </button>
  );
}

function MetaInput({ label, value, onChange, isMargin }: any) {
  return (
    <div className="group">
      <label className={`text-[8px] font-black uppercase tracking-widest mb-2 block ${isMargin ? 'text-blue-400' : 'text-slate-600'}`}>{label}</label>
      <input 
        type="number" 
        value={value} 
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-transparent border-b border-white/10 text-white font-black text-2xl py-2 outline-none focus:border-blue-500 transition-all"
      />
    </div>
  );
}

function AttributeButton({ active, label, onClick, color, full }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`py-3.5 rounded-2xl text-[9px] font-black text-black border-2 transition-all shadow-sm ${full ? 'col-span-2' : ''} ${active ? `${color} border-transparent shadow-md scale-[1.02]` : 'bg-white border-slate-100 hover:border-slate-300'}`}
    >
      {label}
    </button>
  );
}

function AcceleratorCard({ status, label, target, current }: any) {
  return (
    <div className={`p-10 rounded-[3rem] border-2 transition-all duration-700 flex items-start gap-8 ${status ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
       <div className={`p-4 rounded-3xl ${status ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}>
          {status ? <Check strokeWidth={4} size={24}/> : <X strokeWidth={4} size={24}/>}
       </div>
       <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
             <h4 className={`font-black uppercase text-sm ${status ? 'text-emerald-800' : 'text-slate-500'}`}>{label}</h4>
             <span className={`text-xs font-black ${status ? 'text-emerald-500' : 'text-slate-400'}`}>{status ? '+0.5%' : '0%'}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mb-4">Meta Exigida: {target}</p>
          <div className="bg-white/80 px-5 py-2 rounded-xl text-xs font-black text-slate-900 shadow-sm inline-block border border-slate-100 italic">
             Realizado: {current}
          </div>
       </div>
    </div>
  );
}

function ComboIndicator({ active, label, val }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] border-2 transition-all duration-1000 ${active ? 'bg-blue-600 border-transparent shadow-2xl shadow-blue-500/20' : 'bg-white/5 border-white/10 opacity-30'}`}>
       <p className={`text-[10px] font-black uppercase mb-2 tracking-widest ${active ? 'text-blue-100' : 'text-slate-600'}`}>{label}</p>
       <p className={`text-lg font-black italic ${active ? 'text-white' : 'text-slate-500'}`}>{val}</p>
    </div>
  );
}

function DisplayStat({ label, value, highlight }: any) {
  return (
    <div className="text-center group">
       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 group-hover:text-blue-400 transition-colors">{label}</p>
       <p className={`text-5xl font-black italic tracking-tighter ${highlight ? 'text-blue-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function MetricWidget({ label, val, meta, icon, progress, color }: any) {
  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-white hover:shadow-2xl transition-all duration-700">
       <div className="flex justify-between items-start mb-10">
          <div className={`p-5 rounded-3xl bg-slate-50 ${color}`}>{icon}</div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
             <p className="text-4xl font-black italic text-slate-950 tracking-tighter">{val}</p>
          </div>
       </div>
       <div className="space-y-4">
          <div className="flex justify-between items-end text-[10px] font-black uppercase">
             <span className="text-slate-400">Objetivo: {meta}</span>
             <span className={color}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden p-1">
             <div className={`h-full rounded-full transition-all duration-1000 ${color.replace('text', 'bg')}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
       </div>
    </div>
  );
}

function MetricTableRow({ label, meta, current, status }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
       <td className="p-10 font-black text-slate-900 uppercase text-xs">{label}</td>
       <td className="p-10 text-center text-slate-400 font-black italic">{meta}</td>
       <td className="p-10 text-center">
          <span className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black italic group-hover:bg-blue-600 transition-colors">{current}</span>
       </td>
       <td className="p-10 text-right">
          {status ? (
            <div className="flex items-center justify-end gap-3 text-emerald-500 font-black uppercase text-[10px]">
               <CheckCircle2 size={18}/> Bônus Ativado
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 text-slate-300 font-black uppercase text-[10px]">
               <AlertCircle size={18}/> Não Atingido
            </div>
          )}
       </td>
    </tr>
  );
}
