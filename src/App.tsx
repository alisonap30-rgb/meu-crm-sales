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
// --- CONSTANTES E MAPAS DE ESTILO ---
// =============================================================================
const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', glow: 'shadow-slate-200', desc: 'Leads frios e primeiro contato' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', glow: 'shadow-blue-200', desc: 'Propostas em elaboração ou enviadas' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', glow: 'shadow-amber-200', desc: 'Ajustes de preço e termos' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-200', desc: 'Venda convertida e contrato' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', glow: 'shadow-rose-200', desc: 'Oportunidade descartada' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

// =============================================================================
// --- COMPONENTE PRINCIPAL ---
// =============================================================================
export default function CRMMasterFinalUltra() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // --- CONFIGURAÇÕES DE METAS ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,
    contacts: 400,
    followUp: 90,
    crossSell: 40,
    upSell: 15,
    postSale: 100,
    reactivated: 8,
    conversion: 5
  });

  // --- CONFIGURAÇÕES DE COMISSÃO ---
  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0 },
      2: { revenue: 0 },
      3: { revenue: 0 },
      4: { revenue: 0 }
    } as any,
    profitMargin: 15
  });

  // --- ESTADO PARA NOVO LEAD ---
  const [newLead, setNewLead] = useState({
    name: '',
    value: 0,
    stage: 'contato',
    notes: '',
    tags: '',
    followUp: false,
    postSale: false,
    hasCrossSell: false,
    hasUpSell: false,
    reactivated: false
  });

  // --- BUSCA DE DADOS (SUPABASE) ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('lastUpdate', { ascending: false });
    
    if (error) console.error("Erro ao buscar leads:", error);
    else setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // --- ATUALIZAÇÃO DE LEAD ---
  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) {
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) console.error("Erro ao atualizar lead:", error);
    }
  };

  // --- LÓGICA DE ETIQUETAS (TAGS) ---
  const toggleTag = (lead: any, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter((t: string) => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    updateLead(lead.id, { tags: currentTags.join(',') });
  };

  // --- LÓGICA DE DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData("leadId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("leadId");
    if (id) {
      await updateLead(id, { stage: newStage });
      setDraggedLeadId(null);
    }
  };

  // =============================================================================
  // --- ENGINE DE CÁLCULOS ANALÍTICOS ---
  // =============================================================================
  const analytics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    
    const filteredLeads = activeLeads.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    
    // Funil de Vendas (Cálculo de Etapas)
    const funnelSteps = {
      prospecção: activeLeads.length,
      orçamento: activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociação: activeLeads.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: wonLeads.length,
      perdido: activeLeads.filter(l => l.stage === 'perdido').length
    };

    // Indicadores de Performance (KPIs)
    const kpis = {
      conversão: activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0,
      crossSell: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      upSell: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      followUpRate: funnelSteps.orçamento > 0 ? (activeLeads.filter(l => l.followUp).length / funnelSteps.orçamento) * 100 : 0,
      reactivation: activeLeads.filter(l => l.reactivated).length,
      ticketMedio: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + Number(curr.value || 0), 0) / wonLeads.length) : 0,
      posVenda: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0
    };

    // Lógica de Comissionamento (Resgatada das regras originais)
    const totalRevenue = Object.values(commSettings.weeks).reduce((acc: any, curr: any) => acc + Number(curr.revenue || 0), 0);
    const revenuePerformance = (totalRevenue / goals.revenue) * 100;
    const isMarginOk = commSettings.profitMargin >= 12;

    let baseRate = 0; // Alíquota Base baseada em Faturamento
    if (revenuePerformance >= 110) baseRate = 3.5;
    else if (revenuePerformance >= 100) baseRate = 2.5;
    else if (revenuePerformance >= 90) baseRate = 1.5;

    // Aceleradores (+0.5% cada)
    const bonus_conv = kpis.conversão >= goals.conversion ? 0.5 : 0;
    const bonus_cross = kpis.crossSell >= goals.crossSell ? 0.5 : 0;
    const bonus_up = kpis.upSell >= goals.upSell ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonus_conv + bonus_cross + bonus_up) : 0;
    
    // Bônus Fixo por Captação
    const fixedBonus = funnelSteps.prospecção >= goals.contacts ? 300 : 0;
    
    const finalCommission = (totalRevenue * (finalRate / 100)) + fixedBonus;

    return { 
      filteredLeads, funnelSteps, kpis, totalRevenue, revenuePerformance, 
      finalRate, finalCommission, isMarginOk, fixedBonus, activeLeads 
    };
  }, [leads, searchTerm, commSettings, goals]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-black italic">
        <RefreshCw size={48} className="animate-spin text-blue-500 mb-4" />
        <p className="tracking-widest animate-pulse uppercase">Iniciando Engine Ultra CRM...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 text-[11px] font-medium selection:bg-blue-100">
      
      {/* =======================================================================
          HEADER PRINCIPAL
          ======================================================================= */}
      <header className="max-w-[1900px] mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-slate-950 p-4 rounded-[1.5rem] text-blue-500 shadow-2xl rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <TrendingUp size={32}/>
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">
              SALES<span className="text-blue-600">ULTRA</span>
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Management & Intelligence System</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-full mr-2">
            {[1, 2, 3, 4].map(w => (
              <button 
                key={w} 
                onClick={() => setCurrentWeek(w)}
                className={`px-5 py-2 rounded-full font-black text-[9px] transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              >
                SEM 0{w}
              </button>
            ))}
          </div>
          
          <nav className="flex gap-1 border-l pl-4 border-slate-200">
            {['pipeline', 'metrics', 'funnel', 'commission'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {tab === 'pipeline' && <div className="flex items-center gap-2"><LayoutDashboard size={14}/> Pipeline</div>}
                {tab === 'metrics' && <div className="flex items-center gap-2"><Activity size={14}/> Métricas</div>}
                {tab === 'funnel' && <div className="flex items-center gap-2"><Layers size={14}/> Funil</div>}
                {tab === 'commission' && <div className="flex items-center gap-2"><Wallet size={14}/> Comissão</div>}
              </button>
            ))}
          </nav>

          <div className="relative ml-2 flex items-center">
            <div className="absolute left-4 text-slate-300"><Search size={16}/></div>
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, notas ou valor..." 
              className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-full outline-none w-64 focus:w-80 focus:bg-white focus:ring-4 ring-blue-50 transition-all font-bold text-slate-700"
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 hover:rotate-90 transition-all shadow-lg shadow-blue-200"
          >
            <PlusCircle size={24}/>
          </button>
        </div>
      </header>

      {/* =======================================================================
          VIEW: PIPELINE (DRAG AND DROP + EDIÇÃO IN-PLACE)
          ======================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* LEGENDA DE TAGS */}
          <div className="flex flex-wrap gap-4 justify-center mb-8 bg-white/60 backdrop-blur-sm p-4 rounded-[2rem] border border-white max-w-fit mx-auto shadow-sm">
             {AVAILABLE_TAGS.map(tag => (
               <div key={tag.id} className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                 <div className={`w-3 h-3 rounded-full ${tag.color} animate-pulse`} />
                 <span className="font-black text-slate-500 uppercase text-[8px] tracking-tight">{tag.label}</span>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {STAGES.map(stage => {
              const stageLeads = analytics.filteredLeads.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
              const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`bg-slate-200/40 rounded-[3rem] p-5 flex flex-col min-h-[850px] border-2 border-dashed transition-all ${draggedLeadId ? 'border-blue-300 bg-blue-50/30 shadow-inner' : 'border-slate-300/30'}`}
                >
                  {/* CABEÇALHO DA COLUNA COM TOTALIZADOR */}
                  <div className="mb-6 px-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-black uppercase text-slate-500 tracking-[0.2em] text-[9px]">{stage.label}</span>
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black border shadow-sm text-slate-700">{stageLeads.length}</span>
                    </div>
                    <div className="text-2xl font-black italic text-slate-900 tracking-tighter">
                      R$ {stageTotal.toLocaleString('pt-BR')}
                    </div>
                    <div className={`h-1.5 w-full mt-4 rounded-full ${stage.color} opacity-20`} />
                  </div>

                  {/* CONTAINER DE CARDS */}
                  <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
                    {stageLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={() => setDraggedLeadId(null)}
                        className={`bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-transparent hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing group relative ${draggedLeadId === lead.id ? 'opacity-40 grayscale' : ''}`}
                      >
                        {/* INDICADOR DE TAGS NO CARD */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                           {lead.tags?.split(',').filter((t:any) => t !== "").map((tId:any) => {
                             const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                             return tag && (
                               <span key={tId} className={`px-3 py-1 rounded-full text-[7px] font-black uppercase border tracking-tighter ${tag.light}`}>
                                 {tag.label}
                               </span>
                             );
                           })}
                        </div>

                        {/* TÍTULO/NOME EDITÁVEL */}
                        <div className="flex justify-between items-start mb-2">
                          <input 
                            className="font-black text-slate-900 uppercase leading-none truncate pr-4 text-[12px] bg-transparent border-none focus:ring-0 w-full outline-none"
                            value={lead.name}
                            onChange={(e) => updateLead(lead.id, { name: e.target.value })}
                          />
                          <button 
                            onClick={() => { if(confirm("Excluir oportunidade?")) supabase?.from('leads').delete().eq('id', lead.id).then(fetchLeads); }} 
                            className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>

                        {/* VALOR EDITÁVEL NO CARD */}
                        <div className="flex items-center text-emerald-600 font-black mb-4 group/val">
                           <span className="mr-1 italic text-[10px] opacity-50">R$</span>
                           <input 
                             type="number" 
                             className="bg-slate-50/50 hover:bg-slate-50 px-2 py-1 rounded-lg border-none focus:ring-2 ring-emerald-100 font-black italic text-lg w-full outline-none transition-all"
                             value={lead.value}
                             onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                           />
                        </div>

                        {/* BRIEFING/NOTAS EDITÁVEL NO CARD */}
                        <div className="relative mb-5">
                          <div className="absolute left-3 top-3 text-slate-300 pointer-events-none"><FileText size={12}/></div>
                          <textarea 
                            className="w-full text-[10px] font-bold text-slate-500 bg-slate-50/50 rounded-[1.5rem] p-4 pl-9 border-none resize-none h-20 mb-1 outline-none focus:bg-white focus:ring-2 ring-blue-50 transition-all custom-scrollbar"
                            placeholder="Adicionar briefing ou notas do lead..."
                            value={lead.notes || ''}
                            onChange={e => updateLead(lead.id, { notes: e.target.value })}
                          />
                        </div>

                        {/* SELETOR DE TAGS RÁPIDO */}
                        <div className="flex justify-center gap-1.5 mb-5 p-2 bg-slate-50/50 rounded-full">
                           {AVAILABLE_TAGS.map(tag => {
                             const isActive = lead.tags?.includes(tag.id);
                             return (
                               <button 
                                 key={tag.id} 
                                 onClick={() => toggleTag(lead, tag.id)}
                                 className={`w-5 h-5 rounded-full border-2 transition-all transform hover:scale-125 ${isActive ? `${tag.color} border-white shadow-sm` : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                 title={tag.label}
                               />
                             );
                           })}
                        </div>

                        {/* BOTÕES DE ATRIBUTOS (FUP, UP, CROSS, POS) */}
                        <div className="grid grid-cols-2 gap-2">
                          <AttributeBtn label="FUP" active={lead.followUp} onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-500" />
                          <AttributeBtn label="UP SELL" active={lead.hasUpSell} onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-600" />
                          <AttributeBtn label="CROSS" active={lead.hasCrossSell} onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-blue-600" />
                          <AttributeBtn label="PÓS-VENDA" active={lead.postSale} onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-emerald-600" />
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

      {/* =======================================================================
          VIEW: METRICS (DASHBOARD DE PERFORMANCE)
          ======================================================================= */}
      {activeTab === 'metrics' && (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
           
           {/* CARDS DE RESUMO SUPERIOR */}
           <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-8">
              <StatCard 
                label="Taxa de Conversão" 
                val={analytics.kpis.conversão.toFixed(1) + "%"} 
                meta={goals.conversion + "%"} 
                icon={<Target className="text-blue-500" size={24}/>} 
                progress={analytics.kpis.conversão / goals.conversion * 100}
              />
              <StatCard 
                label="Ticket Médio" 
                val={"R$ " + analytics.kpis.ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} 
                meta={"R$ " + goals.ticket.toLocaleString('pt-BR')} 
                icon={<Coins className="text-emerald-500" size={24}/>}
                progress={analytics.kpis.ticketMedio / goals.ticket * 100}
              />
              <StatCard 
                label="Recuperação Leads" 
                val={analytics.kpis.reactivation} 
                meta={goals.reactivated} 
                icon={<RotateCcw className="text-purple-500" size={24}/>}
                progress={analytics.kpis.reactivation / goals.reactivated * 100}
              />
              <StatCard 
                label="Adesão Pós-Venda" 
                val={analytics.kpis.posVenda.toFixed(1) + "%"} 
                meta={goals.postSale + "%"} 
                icon={<CheckCircle2 className="text-indigo-500" size={24}/>}
                progress={analytics.kpis.posVenda / goals.postSale * 100}
              />
           </div>

           {/* TABELA DE INDICADORES DETALHADA */}
           <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border border-white">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-end">
                <div>
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">KPI Intelligence Board</h2>
                   <p className="text-blue-400 font-bold uppercase text-[9px] tracking-widest">Acompanhamento em tempo real das métricas críticas</p>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                      <p className="text-[8px] opacity-40 uppercase font-black">Total em Negociação</p>
                      <p className="text-2xl font-black italic">R$ {analytics.activeLeads.reduce((a,c) => a + Number(c.value || 0), 0).toLocaleString('pt-BR')}</p>
                   </div>
                </div>
              </div>

              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[10px] uppercase font-black text-slate-400">
                    <th className="p-10">Indicador Estratégico</th>
                    <th className="p-10 text-center">Meta do Ciclo</th>
                    <th className="p-10 text-center">Status Atual</th>
                    <th className="p-10 text-center">Eficiência (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-slate-700">
                  <KPILine label="Conversão Geral de Funil" meta={goals.conversion + "%"} val={analytics.kpis.conversão.toFixed(1) + "%"} perf={analytics.kpis.conversão / goals.conversion * 100} />
                  <KPILine label="Aproveitamento Up-Sell" meta={goals.upSell + "%"} val={analytics.kpis.upSell.toFixed(1) + "%"} perf={analytics.kpis.upSell / goals.upSell * 100} />
                  <KPILine label="Aproveitamento Cross-Sell" meta={goals.crossSell + "%"} val={analytics.kpis.crossSell.toFixed(1) + "%"} perf={analytics.kpis.crossSell / goals.crossSell * 100} />
                  <KPILine label="Follow-up em Orçamentos" meta={goals.followUp + "%"} val={analytics.kpis.followUpRate.toFixed(1) + "%"} perf={analytics.kpis.followUpRate / goals.followUp * 100} />
                  <KPILine label="Volume de Prospecção (Leads)" meta={goals.contacts} val={analytics.funnelSteps.prospecção} perf={analytics.funnelSteps.prospecção / goals.contacts * 100} />
                </tbody>
              </table>
           </div>
        </div>
      )}

      {/* =======================================================================
          VIEW: FUNIL DE VENDAS (TODAS AS ETAPAS)
          ======================================================================= */}
      {activeTab === 'funnel' && (
        <div className="max-w-5xl mx-auto space-y-6 pt-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-16">
             <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Pipeline<br/><span className="text-blue-600">Dynamics</span></h2>
             <p className="text-slate-400 font-bold mt-4">Visualização proporcional do fluxo de conversão</p>
          </div>

          <div className="space-y-6">
            <FunnelStep 
              label="PROSPECÇÃO TOTAL (LEADS)" 
              value={analytics.funnelSteps.prospecção} 
              color="bg-slate-400" 
              width="100%" 
              desc="Entrada total de oportunidades no sistema"
            />
            <FunnelStep 
              label="PROPOSTAS ENVIADAS" 
              value={analytics.funnelSteps.orçamento} 
              color="bg-blue-500" 
              width={(analytics.funnelSteps.orçamento/analytics.funnelSteps.prospecção*100) + "%"} 
              desc={`${((analytics.funnelSteps.orçamento/analytics.funnelSteps.prospecção)*100).toFixed(1)}% de aproveitamento inicial`}
            />
            <FunnelStep 
              label="NEGOCIAÇÕES ATIVAS" 
              value={analytics.funnelSteps.negociação} 
              color="bg-amber-500" 
              width={(analytics.funnelSteps.negociação/analytics.funnelSteps.prospecção*100) + "%"} 
              desc="Leads com intenção clara de compra"
            />
            <FunnelStep 
              label="FECHAMENTO (WON)" 
              value={analytics.funnelSteps.fechado} 
              color="bg-emerald-500" 
              width={(analytics.funnelSteps.fechado/analytics.funnelSteps.prospecção*100) + "%"} 
              desc="Vendas concretizadas com sucesso"
            />
            <FunnelStep 
              label="PERDIDOS (LOST)" 
              value={analytics.funnelSteps.perdido} 
              color="bg-rose-500" 
              width={(analytics.funnelSteps.perdido/analytics.funnelSteps.prospecção*100) + "%"} 
              desc="Oportunidades que não converteram"
            />
          </div>
        </div>
      )}

      {/* =======================================================================
          VIEW: COMMISSION (DARK MODE + FARÓIS DE STATUS + REGRAS REAIS)
          ======================================================================= */}
      {activeTab === 'commission' && (
        <div className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-top-4 duration-700">
          
          <div className="lg:col-span-2 space-y-8">
            {/* CARD PRINCIPAL DE COMISSÃO */}
            <div className={`p-16 rounded-[4.5rem] text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-700 ${analytics.isMarginOk ? 'bg-slate-950' : 'bg-rose-950 shadow-rose-200/20'}`}>
              <DollarSign size={300} className="absolute -right-20 -bottom-20 opacity-5" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                   <div>
                      <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-[0.4em] mb-4 text-[10px]">
                        <ShieldCheck size={16}/> Pagamento Garantido
                      </div>
                      <h2 className="text-9xl font-black italic tracking-tighter leading-none mb-4">
                        R$ {analytics.finalCommission.toLocaleString('pt-BR')}
                      </h2>
                   </div>
                   {!analytics.isMarginOk && (
                     <div className="bg-white text-rose-600 px-8 py-3 rounded-full font-black text-xs animate-bounce shadow-xl flex items-center gap-3 uppercase">
                       <AlertTriangle size={18}/> Margem Insuficiente (Min 12%)
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-4 gap-8 pt-12 border-t border-white/10">
                  <MiniCommissionStat label="Alíquota Final" val={analytics.finalRate.toFixed(2) + "%"} icon={<Percent size={12}/>} />
                  <MiniCommissionStat label="Bônus Fixo" val={"R$ " + analytics.fixedBonus} icon={<Award size={12}/>} />
                  <MiniCommissionStat label="Faturamento" val={"R$ " + analytics.totalRevenue.toLocaleString('pt-BR')} icon={<BarChart size={12}/>} />
                  <MiniCommissionStat label="Margem Aplicada" val={commSettings.profitMargin + "%"} icon={<Scale size={12}/>} />
                </div>
              </div>
            </div>

            {/* TABELA DE REGRAS E FARÓIS (MEMORIAL DE CÁLCULO) */}
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
              <h3 className="font-black uppercase italic mb-10 text-slate-800 flex items-center gap-4 text-xl">
                <Scale size={24} className="text-blue-600"/> Algoritmo de Premiação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <CommissionRule 
                    status={analytics.revenuePerformance >= 90} 
                    label="Alíquota Base (Faturamento)" 
                    desc="90% Meta (1.5%) | 100% (2.5%) | 110% (3.5%)" 
                    value={analytics.revenuePerformance.toFixed(1) + "% da meta"}
                 />
                 <CommissionRule 
                    status={analytics.funnelSteps.prospecção >= goals.contacts} 
                    label="Bônus Captação Volumétrica" 
                    desc="Fixo de R$ 300,00 para prospecção superior a 400 leads." 
                    value={analytics.funnelSteps.prospecção + " leads"}
                 />
                 <CommissionRule 
                    status={analytics.kpis.conversão >= goals.conversion} 
                    label="Acelerador Eficiência (Conversão)" 
                    desc="+0.5% na alíquota final para conversão acima de 5%." 
                    value={analytics.kpis.conversão.toFixed(1) + "%"}
                 />
                 <CommissionRule 
                    status={analytics.kpis.crossSell >= goals.crossSell} 
                    label="Acelerador Cross-Sell" 
                    desc="+0.5% na alíquota se bater meta de Cross-sell (40%)." 
                    value={analytics.kpis.crossSell.toFixed(1) + "%"}
                 />
                 <CommissionRule 
                    status={analytics.kpis.upSell >= goals.upSell} 
                    label="Acelerador Up-Sell" 
                    desc="+0.5% na alíquota se bater meta de Up-sell (15%)." 
                    value={analytics.kpis.upSell.toFixed(1) + "%"}
                 />
                 <CommissionRule 
                    status={analytics.isMarginOk} 
                    label="Trava de Segurança (Margem)" 
                    desc="O pagamento só é habilitado se a margem de lucro for superior a 12%." 
                    value={commSettings.profitMargin + "%"}
                    critical
                 />
              </div>
            </div>
          </div>

          {/* PAINEL DE GESTÃO (CONFIGURAÇÕES) */}
          <div className="space-y-8">
             <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                   <Settings className="text-slate-400" size={20}/>
                   <h4 className="font-black uppercase italic tracking-[0.2em] text-slate-400 text-[10px]">Parâmetros Globais</h4>
                </div>
                
                <div className="space-y-8">
                   <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent focus-within:border-blue-500 transition-all">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Meta de Receita (R$)</p>
                      <input 
                        type="number" 
                        value={goals.revenue} 
                        onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} 
                        className="w-full bg-transparent font-black text-3xl text-slate-900 outline-none" 
                      />
                   </div>
                   <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-blue-100 transition-all">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Margem de Lucro Real (%)</p>
                      <input 
                        type="number" 
                        value={commSettings.profitMargin} 
                        onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} 
                        className="w-full bg-transparent font-black text-3xl text-blue-600 outline-none" 
                      />
                   </div>
                </div>
             </div>

             <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                   <Calendar className="text-blue-500" size={20}/>
                   <p className="font-black uppercase italic text-[10px] text-blue-400 tracking-widest text-center">Lançamento Semanal (R$)</p>
                </div>
                
                <div className="space-y-5">
                   {[1, 2, 3, 4].map(w => (
                     <div key={w} className="flex justify-between items-center group">
                        <span className="font-black text-slate-500 text-xs group-hover:text-white transition-colors">SEMANA 0{w}</span>
                        <div className="flex items-center">
                           <span className="text-slate-700 italic font-black mr-2 text-[10px]">R$</span>
                           <input 
                             type="number" 
                             value={commSettings.weeks[w].revenue} 
                             onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} 
                             className="bg-slate-900/50 text-right font-black text-white text-lg outline-none w-32 border-b-2 border-white/5 focus:border-blue-500 transition-all py-1" 
                           />
                        </div>
                     </div>
                   ))}
                </div>
                
                <div className="mt-10 p-6 bg-white/5 rounded-[2rem] border border-white/10 flex justify-between items-center">
                   <span className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Faturamento Total</span>
                   <span className="font-black text-xl italic">R$ {analytics.totalRevenue.toLocaleString('pt-BR')}</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: CADASTRO DE NOVO LEAD (BRIEFING + VALOR)
          ======================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[4.5rem] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative border-t-[20px] border-blue-600 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all transform scale-150"
            >
              <X size={32}/>
            </button>

            <div className="mb-12">
               <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none text-slate-900">
                 Novo<br/><span className="text-blue-600">Lead</span>
               </h2>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4 ml-1">Preencha os dados estratégicos da oportunidade</p>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-6 mb-3 block tracking-widest">Nome da Empresa / Cliente</label>
                <div className="absolute left-6 top-[54px] text-slate-300"><BriefcaseIcon size={20}/></div>
                <input 
                  className="w-full p-8 pl-14 bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-[2.5rem] font-black text-2xl outline-none transition-all placeholder:text-slate-200" 
                  placeholder="EX: GOOGLE INC" 
                  value={newLead.name} 
                  onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="relative">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-6 mb-3 block tracking-widest">Valor Estimado (R$)</label>
                   <div className="absolute left-6 top-[54px] text-emerald-500 font-black italic">R$</div>
                   <input 
                     type="number" 
                     className="w-full p-8 pl-14 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-[2.5rem] font-black text-2xl outline-none transition-all text-emerald-600" 
                     placeholder="0.00" 
                     value={newLead.value} 
                     onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} 
                   />
                 </div>
                 <div className="relative">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-6 mb-3 block tracking-widest">Semana de Entrada</label>
                   <select 
                     value={currentWeek}
                     onChange={e => setCurrentWeek(Number(e.target.value))}
                     className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-slate-300 rounded-[2.5rem] font-black text-2xl outline-none transition-all appearance-none cursor-pointer"
                   >
                     <option value={1}>SEMANA 01</option>
                     <option value={2}>SEMANA 02</option>
                     <option value={3}>SEMANA 03</option>
                     <option value={4}>SEMANA 04</option>
                   </select>
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-6 mb-3 block tracking-widest">Briefing da Oportunidade</label>
                <textarea 
                  className="w-full p-8 bg-slate-50 border-2 border-transparent focus:border-blue-300 rounded-[3rem] font-bold text-lg outline-none h-48 resize-none transition-all custom-scrollbar placeholder:text-slate-200" 
                  placeholder="Descreva as dores do cliente, detalhes do projeto ou observações importantes..." 
                  value={newLead.notes} 
                  onChange={e => setNewLead({...newLead, notes: e.target.value})} 
                />
              </div>

              <button 
                onClick={async () => {
                  if (newLead.name && supabase) {
                    await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString(), week: currentWeek}]);
                    setIsModalOpen(false);
                    fetchLeads();
                    setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                  } else { alert("Preencha ao menos o nome da empresa."); }
                }}
                className="w-full p-10 bg-blue-600 text-white rounded-full font-black uppercase text-2xl shadow-2xl shadow-blue-200 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-6 group"
              >
                Gerar Oportunidade <ArrowRight className="group-hover:translate-x-4 transition-transform" size={32}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES AUXILIARES (DEFINIDOS PARA ESCALABILIDADE) ---
// =============================================================================

const AttributeBtn = ({ label, active, onClick, color }: any) => (
  <button 
    onClick={onClick} 
    className={`py-3 rounded-2xl font-black text-[8px] border-2 transition-all transform active:scale-90 ${active ? `${color} text-white border-transparent shadow-lg shadow-${color.split('-')[1]}-100` : 'bg-white text-slate-300 border-slate-50 hover:border-slate-100'}`}
  >
    {label}
  </button>
);

const StatCard = ({ label, val, meta, icon, progress }: any) => (
  <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-white flex flex-col gap-6 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
    <div className="flex justify-between items-start">
      <div className="bg-slate-50 p-5 rounded-[1.5rem] group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">{icon}</div>
      <div className="text-right">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
         <p className="text-3xl font-black italic text-slate-900 tracking-tighter">{val}</p>
      </div>
    </div>
    <div className="space-y-3">
       <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-400">
         <span>Meta: {meta}</span>
         <span className={progress >= 100 ? 'text-emerald-500' : 'text-blue-500'}>{progress.toFixed(0)}%</span>
       </div>
       <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
       </div>
    </div>
  </div>
);

const KPILine = ({ label, meta, val, perf }: any) => (
  <tr className="hover:bg-slate-50 transition-all duration-300">
    <td className="p-10 text-[12px] font-black uppercase tracking-tight text-slate-900">{label}</td>
    <td className="p-10 text-center text-slate-400 italic text-[12px]">{meta}</td>
    <td className="p-10 text-center">
      <span className="bg-blue-50 text-blue-700 px-6 py-2 rounded-full font-black italic border border-blue-100 text-[12px]">{val}</span>
    </td>
    <td className="p-10">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${perf >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
            style={{ width: `${Math.min(perf, 100)}%` }} 
          />
        </div>
        <span className="font-black text-[12px] w-12 text-slate-900">{perf.toFixed(0)}%</span>
      </div>
    </td>
  </tr>
);

const FunnelStep = ({ label, value, color, width, desc }: any) => (
  <div className="flex items-center gap-8 group">
    <div 
      className={`h-20 ${color} rounded-[2.5rem] shadow-xl flex items-center justify-between px-12 text-white transition-all hover:scale-[1.02] hover:shadow-2xl relative overflow-hidden`} 
      style={{ width }}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative z-10">
        <span className="font-black uppercase italic tracking-[0.3em] text-[10px]">{label}</span>
        <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest mt-1">{desc}</p>
      </div>
      <span className="font-black text-4xl font-mono italic relative z-10">{value}</span>
    </div>
    <div className="text-slate-300 font-black text-3xl italic min-w-[100px] tracking-tighter">{width}</div>
  </div>
);

const MiniCommissionStat = ({ label, val, icon }: any) => (
  <div className="text-center group">
    <div className="flex items-center justify-center gap-2 mb-2">
      <div className="text-blue-500 group-hover:scale-125 transition-transform">{icon}</div>
      <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">{label}</p>
    </div>
    <p className="text-2xl font-black italic">{val}</p>
  </div>
);

const CommissionRule = ({ status, label, desc, value, critical }: any) => (
  <div className={`flex items-start gap-6 p-6 rounded-[2.5rem] border-2 transition-all duration-500 ${status ? 'bg-emerald-500/5 border-emerald-500/20' : critical ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 shadow-xl shadow-rose-100' : 'bg-slate-50/50 border-slate-100 opacity-50 grayscale'}`}>
    <div className="mt-1">
      {status ? (
        <div className="bg-emerald-500 p-2 rounded-full text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]">
          <Check size={16} strokeWidth={4}/>
        </div>
      ) : (
        <div className={`p-2 rounded-full ${critical ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'bg-slate-200 text-slate-400'}`}>
          <X size={16} strokeWidth={4}/>
        </div>
      )}
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <p className={`font-black uppercase tracking-tighter text-[11px] ${status ? 'text-emerald-700' : critical ? 'text-rose-700' : 'text-slate-400'}`}>
          {label}
        </p>
        <span className={`text-[10px] font-black italic ${status ? 'text-emerald-500' : 'text-slate-300'}`}>{value}</span>
      </div>
      <p className="text-[9px] font-bold opacity-60 leading-relaxed text-slate-500">
        {desc}
      </p>
    </div>
  </div>
);
