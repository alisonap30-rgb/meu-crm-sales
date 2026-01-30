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
  Flame, Rocket, Trophy, Star, Lightbulb, MessageSquare, BriefcaseIcon
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÃO SUPABASE ---
// =============================================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// =============================================================================
// --- CONSTANTES DE NEGÓCIO E ESTILIZAÇÃO ---
// =============================================================================
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
// --- COMPONENTE MESTRE ---
// =============================================================================
export default function CRMMasterHardLevel() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // --- ESTADO DE METAS (HARD-CODED INICIAL + EDITÁVEL) ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,        // Editável
    contacts: 400,       // Editável (Contatos/mês)
    reactivated: 8,      // Editável
    conversion: 5,       // Fixa 5%
    followUp: 90,        // Fixa 90%
    crossSell: 40,       // Fixa 40%
    upSell: 15,          // Fixa 15%
    postSale: 100        // Fixa 100%
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 } } as any,
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- PERSISTÊNCIA SUPABASE ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) await supabase.from('leads').update(payload).eq('id', id);
  };

  const toggleTag = (lead: any, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = currentTags.includes(tagId) ? currentTags.filter((t: string) => t !== tagId) : [...currentTags, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // --- LÓGICA ANALÍTICA DE PERFORMANCE ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const filtered = active.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const won = active.filter(l => l.stage === 'fechado');
    
    // Funil Proporcional
    const fSteps = {
      contatos: active.length,
      orcamentos: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociacao: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      vendas: won.length
    };

    // KPIS de Conversão e Qualidade
    const kpis = {
      conv: active.length > 0 ? (won.length / active.length) * 100 : 0,
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      fup: fSteps.orcamentos > 0 ? (active.filter(l => l.followUp).length / fSteps.orcamentos) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      react: active.filter(l => l.reactivated).length,
      ticket: won.length > 0 ? (won.reduce((a,c) => a + Number(c.value), 0) / won.length) : 0
    };

    // --- CÁLCULO DE COMISSÃO (REGRAS HARD) ---
    const totalRevenue = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRevenue / goals.revenue) * 100;
    const isMarginOk = commSettings.profitMargin > 0; // Regra Principal: Margem > 0

    // 1. Alíquota Base
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // 2. Aceleradores (+0.5% cada) - Travados pela Margem
    const bonusTicket = (isMarginOk && kpis.ticket >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && kpis.conv >= goals.conversion) ? 0.5 : 0;
    const bonusCross = (isMarginOk && kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const bonusUp = (isMarginOk && kpis.up >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // 3. Bônus Fixo R$ 300,00 (Regra: Todas as 4 metas abaixo devem ser batidas)
    const goalProspec = fSteps.contatos >= goals.contacts;
    const goalFUP = kpis.fup >= goals.followUp;
    const goalPost = kpis.post >= goals.postSale;
    const goalReact = kpis.react >= goals.reactivated;

    const earnsFixedBonus = isMarginOk && goalProspec && goalFUP && goalPost && goalReact;
    const fixedBonusValue = earnsFixedBonus ? 300 : 0;

    return { 
      filtered, fSteps, kpis, totalRevenue, revPerf, finalRate, 
      totalComm: (totalRevenue * (finalRate/100)) + fixedBonusValue,
      isMarginOk, fixedBonusValue, earnsFixedBonus,
      checks: { goalProspec, goalFUP, goalPost, goalReact }
    };
  }, [leads, searchTerm, commSettings, goals]);

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <RefreshCw size={40} className="animate-spin text-blue-500 mb-4" />
      <span className="font-black italic tracking-widest uppercase text-[10px]">Compilando Engine Hard Level...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-8 text-[11px] font-medium selection:bg-blue-600 selection:text-white">
      
      {/* HEADER COMPLETO */}
      <header className="max-w-[1900px] mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-slate-950 p-4 rounded-[1.5rem] text-blue-500 shadow-2xl rotate-2"><TrendingUp size={30}/></div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">SALES<span className="text-blue-600">ULTRA</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Management Hard Mode v4.0</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[2.5rem] shadow-xl border border-white">
          <nav className="flex bg-slate-100 p-1.5 rounded-full">
            {['pipeline', 'metrics', 'funnel', 'commission'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full font-black uppercase transition-all ${activeTab === tab ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-300" size={16}/>
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar leads..." 
              className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-full outline-none w-64 focus:w-80 focus:bg-white transition-all font-bold"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full hover:rotate-90 transition-all shadow-lg shadow-blue-200"><PlusCircle size={24}/></button>
        </div>
      </header>

      {/* VIEW: PIPELINE (COM EDIÇÃO INTEGRADA) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-wrap gap-4 justify-center bg-white/60 p-4 rounded-[2rem] border border-white max-w-fit mx-auto shadow-sm">
             {AVAILABLE_TAGS.map(tag => (
               <div key={tag.id} className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100">
                 <div className={`w-3 h-3 rounded-full ${tag.color}`} />
                 <span className="font-black text-slate-500 uppercase text-[8px] tracking-tight">{tag.label}</span>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {STAGES.map(stage => {
              const stageLeads = analytics.filtered.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
              const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              return (
                <div 
                  key={stage.id} 
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => updateLead(e.dataTransfer.getData("leadId"), { stage: stage.id })}
                  className={`bg-slate-200/40 rounded-[3rem] p-5 flex flex-col min-h-[850px] border-2 border-dashed transition-all ${draggedLeadId ? 'border-blue-300 bg-blue-50/20' : 'border-slate-300/30'}`}
                >
                  <div className="mb-6 px-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-black uppercase text-slate-500 tracking-[0.2em] text-[9px]">{stage.label}</span>
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black border text-slate-700">{stageLeads.length}</span>
                    </div>
                    <div className="text-2xl font-black italic text-slate-900">R$ {stageTotal.toLocaleString('pt-BR')}</div>
                  </div>

                  <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {stageLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        draggable 
                        onDragStart={e => { setDraggedLeadId(lead.id); e.dataTransfer.setData("leadId", lead.id); }}
                        onDragEnd={() => setDraggedLeadId(null)}
                        className="bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-white hover:border-blue-200 transition-all cursor-grab group"
                      >
                        {/* TAGS PÍLULAS */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                           {lead.tags?.split(',').filter((t:any)=>t).map((tId:any) => {
                             const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                             return tag && <span key={tId} className={`px-3 py-1 rounded-full text-[7px] font-black uppercase border ${tag.light}`}>{tag.label}</span>;
                           })}
                        </div>

                        <input 
                          className="font-black text-slate-900 uppercase leading-none mb-2 bg-transparent border-none w-full outline-none text-[12px]"
                          value={lead.name}
                          onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })}
                        />

                        <div className="flex items-center text-emerald-600 font-black mb-4">
                           <span className="mr-1 italic text-[10px] opacity-50">R$</span>
                           <input 
                             type="number" 
                             className="bg-slate-50 px-2 py-1 rounded-lg border-none font-black italic text-lg w-full outline-none"
                             value={lead.value}
                             onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                           />
                        </div>

                        <textarea 
                          className="w-full text-[10px] font-bold text-slate-500 bg-slate-50 rounded-[1.5rem] p-4 border-none resize-none h-20 mb-4 outline-none"
                          placeholder="Briefing do lead..."
                          value={lead.notes || ''}
                          onChange={e => updateLead(lead.id, { notes: e.target.value })}
                        />

                        {/* BOTÕES DE TAGS NOS CARDS (RESTAURADOS) */}
                        <div className="flex justify-center gap-1.5 mb-5 p-2 bg-slate-50 rounded-full">
                           {AVAILABLE_TAGS.map(tag => (
                             <button 
                               key={tag.id} 
                               onClick={() => toggleTag(lead, tag.id)}
                               className={`w-5 h-5 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-sm scale-110` : 'bg-white border-slate-100 hover:border-slate-300'}`}
                             />
                           ))}
                        </div>

                        {/* BOTÕES DE ATRIBUTOS (NEGRITO E PRETO) */}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${lead.followUp ? 'bg-amber-400 border-transparent shadow-lg shadow-amber-100' : 'bg-white border-slate-50'}`}>FOLLOW-UP</button>
                          <button onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${lead.hasUpSell ? 'bg-purple-400 border-transparent shadow-lg shadow-purple-100' : 'bg-white border-slate-50'}`}>UP-SELL</button>
                          <button onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${lead.hasCrossSell ? 'bg-blue-400 border-transparent shadow-lg shadow-blue-100' : 'bg-white border-slate-50'}`}>CROSS-SELL</button>
                          <button onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all ${lead.reactivated ? 'bg-emerald-400 border-transparent shadow-lg shadow-emerald-100' : 'bg-white border-slate-50'}`}>REATIVADO</button>
                          <button onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} className={`py-3 rounded-2xl text-[8px] font-black text-black border-2 transition-all col-span-2 ${lead.postSale ? 'bg-indigo-400 border-transparent shadow-lg shadow-indigo-100' : 'bg-white border-slate-50'}`}>PÓS-VENDA 100%</button>
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

      {/* VIEW: COMMISSION (DARK MODE + REGRAS HARD) */}
      {activeTab === 'commission' && (
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-top-4 duration-700">
          <div className="lg:col-span-2 space-y-8">
            <div className={`p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden transition-all duration-700 ${analytics.isMarginOk ? 'bg-slate-950' : 'bg-rose-950 shadow-rose-200/20'}`}>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                   <div>
                      <p className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-[0.4em] mb-4 text-[10px]">Cálculo Provisório de Comissão</p>
                      <h2 className="text-9xl font-black italic tracking-tighter leading-none mb-4">R$ {analytics.totalComm.toLocaleString('pt-BR')}</h2>
                      {analytics.profitMargin <= 0 && (
                        <div className="bg-white/10 text-rose-500 px-6 py-2 rounded-full font-black text-[10px] inline-flex items-center gap-2 uppercase tracking-widest animate-pulse border border-rose-500/30">
                          <Lock size={14}/> Bloqueio de Segurança: Margem de Lucro ≤ 0
                        </div>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-8 pt-12 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Alíquota Final</p>
                    <p className="text-3xl font-black italic">{analytics.finalRate.toFixed(2)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Bônus Fixo</p>
                    <p className="text-3xl font-black italic">R$ {analytics.fixedBonusValue}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Faturamento</p>
                    <p className="text-3xl font-black italic">R$ {analytics.totalRevenue.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-center border-l border-white/10 ml-4">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Meta Receita</p>
                    <p className="text-3xl font-black italic text-blue-400">{analytics.revPerf.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FARÓIS DE STATUS - REGRAS DE 0.5% */}
            <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm">
              <h3 className="font-black uppercase italic mb-10 text-slate-800 flex items-center gap-4 text-xl tracking-tighter">
                <Scale size={24} className="text-blue-600"/> Aceleradores de Performance (+0.5% cada)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <CommissionRule status={analytics.kpis.ticket >= goals.ticket} label="Meta Ticket Médio" desc={`Exige R$ ${goals.ticket.toLocaleString('pt-BR')}. Realizado: R$ ${analytics.kpis.ticket.toLocaleString('pt-BR')}`} value={analytics.kpis.ticket >= goals.ticket ? "+0.5%" : "0%"} />
                 <CommissionRule status={analytics.kpis.conv >= goals.conversion} label="Meta Conversão Total" desc="Exige 5.0% de conversão em todos os leads ativos." value={analytics.kpis.conv >= goals.conversion ? "+0.5%" : "0%"} />
                 <CommissionRule status={analytics.kpis.cross >= goals.crossSell} label="Meta Cross-Sell" desc="Exige 40.0% de adesão a produtos complementares." value={analytics.kpis.cross >= goals.crossSell ? "+0.5%" : "0%"} />
                 <CommissionRule status={analytics.kpis.up >= goals.upSell} label="Meta Up-Sell" desc="Exige 15.0% de upgrade no valor das vendas." value={analytics.kpis.up >= goals.upSell ? "+0.5%" : "0%"} />
              </div>

              {/* REGRAS DO BÔNUS FIXO R$ 300,00 */}
              <div className="mt-12 p-10 bg-slate-900 rounded-[3.5rem] text-white">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h4 className="text-2xl font-black italic tracking-tighter text-blue-400">Bônus de Captação & Qualidade</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Todas as 4 metas abaixo devem ser atingidas para o prêmio de R$ 300,00</p>
                  </div>
                  {analytics.earnsFixedBonus ? <CheckCircle2 size={40} className="text-emerald-500 animate-pulse"/> : <X size={40} className="text-rose-500 opacity-20" />}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   <MiniIndicator status={analytics.checks.goalProspec} label="Contatos" val={`${analytics.fSteps.contatos}/${goals.contacts}`} />
                   <MiniIndicator status={analytics.checks.goalFUP} label="Follow-up" val={`${analytics.kpis.fup.toFixed(0)}%/90%`} />
                   <MiniIndicator status={analytics.checks.goalPost} label="Pós-venda" val={`${analytics.kpis.post.toFixed(0)}%/100%`} />
                   <MiniIndicator status={analytics.checks.goalReact} label="Reativados" val={`${analytics.kpis.react}/${goals.reactivated}`} />
                </div>
              </div>
            </div>
          </div>

          {/* PAINEL DE METAS EDITÁVEIS */}
          <div className="space-y-8">
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <h4 className="font-black uppercase italic tracking-widest text-slate-400 text-[10px] mb-8">Configurações de Metas</h4>
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Meta de Contatos/Mês</p>
                      <input type="number" value={goals.contacts} onChange={e => setGoals({...goals, contacts: Number(e.target.value)})} className="w-full bg-transparent font-black text-3xl outline-none text-slate-900" />
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Meta Ticket Médio (R$)</p>
                      <input type="number" value={goals.ticket} onChange={e => setGoals({...goals, ticket: Number(e.target.value)})} className="w-full bg-transparent font-black text-3xl outline-none text-slate-900" />
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[2.5rem]">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Meta Clientes Reativados</p>
                      <input type="number" value={goals.reactivated} onChange={e => setGoals({...goals, reactivated: Number(e.target.value)})} className="w-full bg-transparent font-black text-3xl outline-none text-slate-900" />
                   </div>
                   <div className="p-6 bg-blue-600 rounded-[2.5rem] shadow-xl shadow-blue-100">
                      <p className="text-[9px] font-black text-white/60 uppercase mb-2">Margem de Lucro Real (%)</p>
                      <input type="number" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} className="w-full bg-transparent font-black text-3xl outline-none text-white" />
                   </div>
                </div>
             </div>

             <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white">
                <p className="font-black uppercase italic text-[10px] text-blue-400 tracking-widest text-center mb-8">Faturamento Semanal</p>
                <div className="space-y-6">
                   {[1, 2, 3, 4].map(w => (
                     <div key={w} className="flex justify-between items-center group">
                        <span className="font-black text-slate-500 text-xs group-hover:text-white transition-all">W-0{w}</span>
                        <input 
                          type="number" 
                          value={commSettings.weeks[w].revenue} 
                          onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} 
                          className="bg-transparent text-right font-black text-xl outline-none w-32 border-b border-white/10 py-1 focus:border-blue-500" 
                        />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* VIEW: METRICS (DASHBOARD) */}
      {activeTab === 'metrics' && (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <StatCard label="Conversão" val={analytics.kpis.conv.toFixed(1) + "%"} meta="5%" progress={analytics.kpis.conv / 5 * 100} icon={<Target className="text-blue-500"/>} />
              <StatCard label="Follow-up" val={analytics.kpis.fup.toFixed(1) + "%"} meta="90%" progress={analytics.kpis.fup / 90 * 100} icon={<Clock className="text-amber-500"/>} />
              <StatCard label="Ticket Médio" val={"R$ " + analytics.kpis.ticket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} meta={"R$ " + goals.ticket} progress={analytics.kpis.ticket / goals.ticket * 100} icon={<Coins className="text-emerald-500"/>} />
              <StatCard label="Reativados" val={analytics.kpis.react} meta={goals.reactivated} progress={analytics.kpis.react / goals.reactivated * 100} icon={<RotateCcw className="text-purple-500"/>} />
           </div>
           
           <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden border border-white">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[10px] uppercase font-black text-slate-400">
                    <th className="p-10">Indicador de Qualidade</th>
                    <th className="p-10 text-center">Meta do Ciclo</th>
                    <th className="p-10 text-center">Realizado</th>
                    <th className="p-10 text-center">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-slate-700">
                  <KPILine label="Conversão de Funil" meta="5.0%" val={analytics.kpis.conv.toFixed(1) + "%"} perf={analytics.kpis.conv / 5 * 100} />
                  <KPILine label="Adesão Cross-Sell" meta="40.0%" val={analytics.kpis.cross.toFixed(1) + "%"} perf={analytics.kpis.cross / 40 * 100} />
                  <KPILine label="Adesão Up-Sell" meta="15.0%" val={analytics.kpis.up.toFixed(1) + "%"} perf={analytics.kpis.up / 15 * 100} />
                  <KPILine label="Acompanhamento (FUP)" meta="90.0%" val={analytics.kpis.fup.toFixed(1) + "%"} perf={analytics.kpis.fup / 90 * 100} />
                  <KPILine label="Qualidade Pós-Venda" meta="100.0%" val={analytics.kpis.post.toFixed(1) + "%"} perf={analytics.kpis.post} />
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VIEW: FUNNEL (VISUAL) */}
      {activeTab === 'funnel' && (
        <div className="max-w-5xl mx-auto space-y-8 pt-12">
          <FunnelStep label="CONTATOS / PROSPECÇÃO" value={analytics.fSteps.contatos} color="bg-slate-400" width="100%" />
          <FunnelStep label="ORÇAMENTOS EMITIDOS" value={analytics.fSteps.orcamentos} color="bg-blue-500" width={(analytics.fSteps.orcamentos/analytics.fSteps.contatos*100) + "%"} />
          <FunnelStep label="NEGOCIAÇÕES ATIVAS" value={analytics.fSteps.negociacao} color="bg-amber-500" width={(analytics.fSteps.negociacao/analytics.fSteps.contatos*100) + "%"} />
          <FunnelStep label="FECHADOS (WON)" value={analytics.fSteps.vendas} color="bg-emerald-500" width={(analytics.fSteps.vendas/analytics.fSteps.contatos*100) + "%"} />
        </div>
      )}

      {/* MODAL: CADASTRO COMPLETO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4.5rem] p-16 shadow-2xl relative border-t-[20px] border-blue-600 animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 transition-all transform scale-150"><X size={32}/></button>
            <div className="mb-12">
               <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none text-slate-900">Novo<br/><span className="text-blue-600">Lead</span></h2>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Cadastro de Oportunidade Estratégica</p>
            </div>
            <div className="space-y-8">
              <input className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-[2.5rem] font-black text-2xl outline-none" placeholder="NOME DA EMPRESA" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} />
              <input type="number" className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[2.5rem] font-black text-2xl outline-none text-emerald-600" placeholder="VALOR ESTIMADO (R$)" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
              <textarea className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-blue-300 rounded-[3rem] font-bold text-lg outline-none h-40 resize-none" placeholder="DESCREVA O BRIEFING OU DORES DO CLIENTE..." value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              <button 
                onClick={async () => {
                  if (supabase) await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString(), week: currentWeek}]);
                  setIsModalOpen(false); fetchLeads();
                  setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }}
                className="w-full p-10 bg-blue-600 text-white rounded-full font-black uppercase text-2xl shadow-2xl hover:scale-[1.03] transition-all flex items-center justify-center gap-6"
              >GERAR OPORTUNIDADE <ArrowRightCircle size={32}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES DE APOIO (UI KIT) ---
// =============================================================================

const CommissionRule = ({ status, label, desc, value }: any) => (
  <div className={`flex items-start gap-6 p-6 rounded-[2.5rem] border-2 transition-all ${status ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
    <div className={`mt-1 p-2 rounded-full ${status ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
      {status ? <Check size={16} strokeWidth={4}/> : <X size={16} strokeWidth={4}/>}
    </div>
    <div className="flex-1">
      <div className="flex justify-between mb-1">
        <p className={`font-black uppercase tracking-tighter text-[11px] ${status ? 'text-emerald-700' : 'text-slate-400'}`}>{label}</p>
        <span className={`text-[10px] font-black ${status ? 'text-emerald-500' : 'text-slate-300'}`}>{value}</span>
      </div>
      <p className="text-[9px] font-bold opacity-60 text-slate-500">{desc}</p>
    </div>
  </div>
);

const MiniIndicator = ({ status, label, val }: any) => (
  <div className={`p-4 rounded-2xl border-2 transition-all ${status ? 'bg-blue-600 border-transparent shadow-lg' : 'bg-white/5 border-white/10'}`}>
    <p className={`text-[8px] font-black uppercase mb-1 tracking-widest ${status ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p>
    <p className={`text-[12px] font-black italic ${status ? 'text-white' : 'text-slate-700'}`}>{val}</p>
  </div>
);

const StatCard = ({ label, val, meta, icon, progress }: any) => (
  <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-white group hover:shadow-2xl transition-all duration-500">
    <div className="flex justify-between items-start mb-6">
      <div className="bg-slate-50 p-5 rounded-[1.5rem] group-hover:bg-blue-600 group-hover:text-white transition-colors">{icon}</div>
      <div className="text-right">
         <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
         <p className="text-3xl font-black italic text-slate-900">{val}</p>
      </div>
    </div>
    <div className="space-y-3">
       <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
         <span>Meta: {meta}</span>
         <span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress.toFixed(0)}%</span>
       </div>
       <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
       </div>
    </div>
  </div>
);

const KPILine = ({ label, meta, val, perf }: any) => (
  <tr className="hover:bg-slate-50 transition-all">
    <td className="p-10 text-[12px] font-black uppercase text-slate-900">{label}</td>
    <td className="p-10 text-center text-slate-400 italic text-[12px]">{meta}</td>
    <td className="p-10 text-center"><span className="bg-blue-50 text-blue-700 px-6 py-2 rounded-full font-black italic border border-blue-100">{val}</span></td>
    <td className="p-10">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${perf >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(perf, 100)}%` }} />
        </div>
        <span className="font-black text-[12px] w-12">{perf.toFixed(0)}%</span>
      </div>
    </td>
  </tr>
);

const FunnelStep = ({ label, value, color, width }: any) => (
  <div className="flex items-center gap-8 group">
    <div className={`h-20 ${color} rounded-[2.5rem] shadow-xl flex items-center justify-between px-12 text-white transition-all hover:scale-[1.02]`} style={{ width }}>
      <span className="font-black uppercase italic tracking-[0.3em] text-[10px]">{label}</span>
      <span className="font-black text-4xl font-mono italic">{value}</span>
    </div>
    <div className="text-slate-300 font-black text-3xl italic min-w-[100px] tracking-tighter">{width}</div>
  </div>
);
