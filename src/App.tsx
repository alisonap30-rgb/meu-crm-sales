import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw
} from 'lucide-react';

// --- INITIALIZATION & CONFIG ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-500' },
  { id: 'orcamento', label: 'Orçamento/Proposta', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500' }
];

export default function CRMSystemHardMode() {
  // --- CORE STATES ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- GOALS & FINANCIAL ENGINE STATES ---
  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 20, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0, ticket: 0 },
      2: { revenue: 0, ticket: 0 },
      3: { revenue: 0, ticket: 0 },
      4: { revenue: 0, ticket: 0 }
    },
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- DATABASE OPERATIONS ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Erro ao buscar dados:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const subscription = supabase
      .channel('crm_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [fetchLeads]);

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    setIsSaving(true);
    const payload = {
      ...leadData,
      value: parseFloat(leadData.value) || 0,
      week: leadData.week || currentWeek,
      lastUpdate: new Date().toISOString()
    };
    
    const { error } = await supabase.from('leads').upsert(payload);
    if (error) alert("Erro ao salvar: " + error.message);
    setIsSaving(false);
    fetchLeads();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Confirmar exclusão definitiva?")) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) fetchLeads();
  };

  // --- DRAG AND DROP ENGINE ---
  const onDragStart = (e, leadId) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-slate-200');
  };

  const onDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-slate-200');
  };

  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-200');
    const leadId = e.dataTransfer.getData("text/plain");
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.stage !== targetStage) {
      await handleSaveLead({ ...lead, stage: targetStage });
    }
  };

  // --- FINANCIAL CALCULATION LOGIC ---
  const calculateFinancials = () => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    
    const totalRev = Object.values(commSettings.weeks).reduce((acc, w) => acc + Number(w.revenue), 0);
    const weeksWithSales = Object.values(commSettings.weeks).filter(w => Number(w.ticket) > 0).length;
    const avgTicket = weeksWithSales > 0 
      ? Object.values(commSettings.weeks).reduce((acc, w) => acc + Number(w.ticket), 0) / weeksWithSales 
      : 0;

    const revPerf = (totalRev / goals.revenue) * 100;
    
    // KPIs Operacionais
    const kpis = {
      contacts: activeLeads.length,
      fUpRate: activeLeads.length > 0 ? (activeLeads.filter(l => l.followUp).length / activeLeads.length) * 100 : 0,
      crossRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      upRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      postRate: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      convRate: activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0
    };

    // Comissão Base
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Aceleradores
    const accelerators = (commSettings.profitMargin > 0) ? (
      (avgTicket >= goals.ticket ? 0.5 : 0) +
      (kpis.crossRate >= goals.crossSell ? 0.5 : 0) +
      (kpis.upRate >= goals.upSell ? 0.5 : 0)
    ) : 0;

    const hasFixedBonus = kpis.contacts >= goals.contacts && kpis.fUpRate >= goals.followUp;
    const finalRate = baseRate + accelerators;
    const commissionVal = (totalRev * (finalRate / 100)) + (hasFixedBonus ? 300 : 0);

    return { totalRev, avgTicket, revPerf, kpis, finalRate, commissionVal, hasFixedBonus };
  };

  const fin = calculateFinancials();

  if (loading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-black italic tracking-tighter">
      <RefreshCw className="animate-spin mb-4 text-blue-500" size={48} />
      <p className="animate-pulse">BUILDING ENTERPRISE ARCHITECTURE...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-slate-900 font-sans selection:bg-blue-100">
      
      {/* NAVEGAÇÃO SUPERIOR */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-5 rounded-[2.2rem] shadow-2xl shadow-blue-200">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic text-slate-800">SALES<span className="text-blue-600">PRO</span></h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Real-Time Node</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-1">
            {['pipeline', 'metrics', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'metrics' ? 'Indicadores' : tab === 'commission' ? 'Financeiro' : tab}
              </button>
            ))}
          </nav>
          <div className="flex gap-2 border-l pl-4 border-slate-100">
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><PlusCircle size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        
        {/* ABA: PIPELINE (COM DRAG & DROP E NOTAS DINÂMICAS) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in duration-500">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && Number(l.week) === currentWeek && !l.isArchived);
              const columnValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              
              return (
                <div 
                  key={stage.id} 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, stage.id)}
                  className="bg-slate-200/40 p-5 rounded-[2.5rem] border-2 border-dashed border-slate-300/40 min-h-[850px] transition-all"
                >
                  <div className="mb-8 px-2 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{stage.label}</h3>
                      <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {columnValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-blue-600 shadow-sm border">{stageLeads.length}</div>
                  </div>

                  <div className="space-y-5">
                    {stageLeads.map(lead => {
                      const isStale = (Date.now() - new Date(lead.lastUpdate).getTime()) > (3 * 24 * 60 * 60 * 1000) && stage.id !== 'fechado';
                      return (
                        <div 
                          key={lead.id} 
                          draggable 
                          onDragStart={(e) => onDragStart(e, lead.id)}
                          className={`bg-white p-6 rounded-[2.2rem] shadow-sm border-2 transition-all hover:shadow-2xl relative group ${isStale ? 'border-rose-100 bg-rose-50/30' : 'border-white'}`}
                        >
                          {isStale && <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white p-1 rounded-full shadow-lg animate-bounce z-20"><Clock size={12}/></div>}
                          <button onClick={() => handleDelete(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-2.5 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"><Trash2 size={14}/></button>
                          
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1"><User size={10}/> {lead.vendor}</span>
                            <Grab size={14} className="text-slate-200 group-hover:text-blue-400 cursor-grab active:cursor-grabbing" />
                          </div>

                          <h4 className="font-black text-xs text-slate-800 uppercase mb-1 leading-tight">{lead.name}</h4>
                          <div className="text-emerald-600 font-black text-sm mb-4">R$ {Number(lead.value).toLocaleString()}</div>
                          
                          <textarea 
                            className="w-full text-[10px] p-3.5 bg-slate-50 border-none rounded-2xl resize-none font-medium text-slate-500 placeholder:italic mb-4 focus:ring-2 focus:ring-blue-100 transition-all"
                            rows="2" placeholder="Notas de acompanhamento..."
                            value={lead.notes || ''}
                            onChange={(e) => handleSaveLead({...lead, notes: e.target.value})}
                          />

                          <div className="pt-5 border-t border-slate-50">
                            <div className="grid grid-cols-2 gap-2">
                              <QuickAction label="Follow-Up" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" />
                              <QuickAction label="Pós-Venda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" />
                              <QuickAction label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                              <QuickAction label="Up-Sell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-emerald-600" />
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

        {/* ABA: INDICADORES (KPIs COMPLETOS) */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-12 border-b bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4"><BarChart2 className="text-blue-600" size={32}/> Performance Analítica</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Consolidação de métricas por período operacional</p>
              </div>
              <div className="flex gap-4">
                <MetricStat label="CONVERSÃO" val={fin.kpis.convRate.toFixed(1) + "%"} />
                <MetricStat label="FOLLOW-UP" val={fin.kpis.fUpRate.toFixed(1) + "%"} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="p-10">Métrica Estratégica</th>
                    <th className="p-10 text-center">Meta do Ciclo</th>
                    {[1, 2, 3, 4].map(w => <th key={w} className="p-10 text-center">Semana {w}</th>)}
                    <th className="p-10 text-center bg-blue-900">Total Ciclo</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                  <KPILine title="Novos Contatos / Leads" meta={goals.contacts} field="contacts" data={leads} total={fin.kpis.contacts} format={v=>v} />
                  <KPILine title="Taxa de Follow-up" meta={goals.followUp+"%"} field="fUp" data={leads} total={fin.kpis.fUpRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                  <KPILine title="Taxa Cross-Sell" meta={goals.crossSell+"%"} field="cross" data={leads} total={fin.kpis.crossRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                  <KPILine title="Taxa Up-Sell" meta={goals.upSell+"%"} field="up" data={leads} total={fin.kpis.upRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                  <KPILine title="Conversão Geral" meta={goals.conversion+"%"} field="conv" data={leads} total={fin.kpis.convRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO (MOTOR DE COMISSÃO) */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in zoom-in duration-500 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-14 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                <DollarSign className="absolute -right-10 -top-10 opacity-10 group-hover:rotate-12 transition-all duration-1000" size={300}/>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60 mb-4">Faturamento Bruto Consolidado</p>
                <h3 className="text-8xl font-black tracking-tighter mb-12 font-mono">R$ {fin.totalRev.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-white/20">
                  <div><p className="text-[10px] font-black opacity-50 mb-1 uppercase tracking-widest">Ticket Médio</p><p className="text-3xl font-black">R$ {fin.avgTicket.toLocaleString()}</p></div>
                  <div><p className="text-[10px] font-black opacity-50 mb-1 uppercase tracking-widest">Atingimento</p><p className="text-3xl font-black">{fin.revPerf.toFixed(1)}%</p></div>
                </div>
              </div>

              <div className="bg-white p-14 rounded-[4rem] border-[8px] border-emerald-500 shadow-2xl flex flex-col justify-center items-center text-center relative">
                <div className="bg-emerald-50 p-6 rounded-full mb-6 text-emerald-600 shadow-inner"><Award size={54}/></div>
                <p className="text-[13px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Remuneração Variável Estimada</p>
                <h3 className="text-9xl text-emerald-600 font-black tracking-tighter font-mono">R$ {fin.commissionVal.toLocaleString()}</h3>
                <div className="mt-10 bg-emerald-600 text-white px-10 py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100">Fee Aplicado: {fin.finalRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <FinanceRuleBox title="Escada de Receita" icon={<ShieldCheck className="text-blue-500"/>}>
                  <RuleItem label="Meta 90% a 99%" val="1.5%" active={fin.revPerf >= 90 && fin.revPerf < 100}/>
                  <RuleItem label="Meta 100% a 109%" val="2.5%" active={fin.revPerf >= 100 && fin.revPerf < 110}/>
                  <RuleItem label="Meta 110%+" val="3.5%" active={fin.revPerf >= 110}/>
               </FinanceRuleBox>
               <FinanceRuleBox title="Aceleradores (+0.5%)" icon={<Zap className="text-amber-500"/>}>
                  <RuleItem label="Ticket Médio" val="+0.5%" active={fin.avgTicket >= goals.ticket}/>
                  <RuleItem label="Cross-Sell" val="+0.5%" active={fin.kpis.crossRate >= goals.crossSell}/>
                  <RuleItem label="Up-Sell" val="+0.5%" active={fin.kpis.upRate >= goals.upSell}/>
               </FinanceRuleBox>
               <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase mb-8 border-b border-white/10 pb-6 flex items-center gap-3"><Award className="text-emerald-500"/> Bônus Fixo R$ 300</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-10">Liberado mediante atingimento simultâneo das metas de **Volume de Contatos** e **Taxa de Follow-up**.</p>
                  </div>
                  <div className={`p-8 rounded-[2rem] border-2 transition-all text-center ${fin.hasFixedBonus ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/10 opacity-40'}`}>
                    <p className="text-[10px] font-black uppercase mb-1 tracking-widest">Status da Bonificação:</p>
                    <p className="text-xl font-black">{fin.hasFixedBonus ? 'HABILITADO' : 'PENDENTE'}</p>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-[4rem] border shadow-2xl p-16">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                 <div>
                    <h4 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-4"><Settings className="text-blue-600"/> Parâmetros de Gestão</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure as metas e os lançamentos financeiros do ciclo</p>
                 </div>
                 <div className="flex gap-4">
                    <MetInput label="Faturamento" val={goals.revenue} onChange={v=>setGoals({...goals, revenue:v})}/>
                    <MetInput label="Ticket Médio" val={goals.ticket} onChange={v=>setGoals({...goals, ticket:v})}/>
                 </div>
               </div>
               
               <table className="w-full text-left">
                 <thead><tr className="text-[11px] font-black text-slate-300 uppercase border-b"><th className="pb-8 pl-4">Cronograma Semanal</th><th className="pb-8">Faturamento (R$)</th><th className="pb-8">Ticket Médio (R$)</th></tr></thead>
                 <tbody className="divide-y">
                   {[1, 2, 3, 4].map(w => (
                     <tr key={w} className="group hover:bg-slate-50 transition-all">
                       <td className="py-10 pl-4 font-black text-slate-400 text-xs tracking-widest group-hover:text-blue-600 transition-colors">SEMANA OPERACIONAL {w}</td>
                       <td className="py-4 px-4"><input type="number" className="w-full p-6 bg-slate-100 rounded-3xl font-black border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} /></td>
                       <td className="py-4 px-4"><input type="number" className="w-full p-6 bg-slate-100 rounded-3xl font-black border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none" value={commSettings.weeks[w].ticket} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], ticket: e.target.value}}})} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA: ARQUIVO (HISTÓRICO) */}
        {activeTab === 'archive' && (
          <div className="animate-in slide-in-from-right-10 duration-700">
             <div className="bg-white p-12 rounded-[3.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                <div className="flex items-center gap-6">
                   <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl"><Archive size={32}/></div>
                   <div>
                      <h3 className="text-3xl font-black tracking-tighter">Histórico de Atividade</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Registros de leads arquivados e ciclos passados</p>
                   </div>
                </div>
                <div className="relative w-full md:w-96">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                   <input type="text" placeholder="Localizar cliente..." className="w-full p-6 pl-16 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-600 transition-all" onChange={e => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="bg-white rounded-[3.5rem] shadow-2xl border overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                      <tr><th className="p-12">Lead / Cliente</th><th className="p-12">Consultor</th><th className="p-12 text-center">Valor Total</th><th className="p-12 text-center">Gestão</th></tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase text-slate-600 text-xs">
                      {leads.filter(l => l.isArchived).filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-12 font-black text-slate-800 text-sm">{lead.name}</td>
                           <td className="p-12"><span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">{lead.vendor}</span></td>
                           <td className="p-12 text-center text-emerald-600 font-black">R$ {Number(lead.value).toLocaleString()}</td>
                           <td className="p-12 text-center">
                              <button onClick={() => handleSaveLead({...lead, isArchived: false})} className="bg-white p-4 rounded-2xl shadow-sm border hover:bg-blue-600 hover:text-white transition-all hover:scale-110 active:scale-90"><RotateCcw size={20}/></button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {/* MODAL: ATIVAÇÃO DE LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[4rem] p-16 max-w-2xl w-full shadow-2xl border-t-[24px] border-blue-600 animate-in zoom-in duration-300 relative">
            <h2 className="text-4xl font-black mb-12 uppercase italic tracking-tighter text-slate-800">Ativar Oportunidade</h2>
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nome da Empresa ou Cliente</label>
                  <input className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all shadow-inner" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="Ex: Corporação Acme Ltda" />
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Valor Projetado (R$)</label>
                    <input type="number" className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all shadow-inner" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} placeholder="0,00" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vendedor Responsável</label>
                    <select className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all shadow-inner" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select>
                  </div>
               </div>
               <button 
                disabled={isSaving || !newLead.name}
                onClick={async () => {
                   await handleSaveLead({...newLead, week: currentWeek, isArchived: false});
                   setIsModalOpen(false);
                   setNewLead({name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato'});
                }} 
                className="w-full bg-blue-600 text-white p-9 rounded-[2.5rem] font-black uppercase shadow-2xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all tracking-[0.3em] flex items-center justify-center gap-4"
               >
                 {isSaving ? 'PROCESSANDO...' : 'LANÇAR NO PIPELINE'} <ArrowRight size={24}/>
               </button>
               <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-2">Abandonar Lançamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HELPER UI COMPONENTS ---

const QuickAction = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className={`p-3 rounded-2xl border-2 text-[9px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105 shadow-md` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

const MetricStat = ({ label, val }) => (
  <div className="bg-white p-5 px-8 rounded-3xl border shadow-sm text-center"><p className="text-[9px] font-black text-slate-400 mb-1 tracking-widest">{label}</p><p className="text-2xl font-black text-slate-800 tracking-tighter">{val}</p></div>
);

const FinanceRuleBox = ({ title, icon, children }) => (
  <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-xl"><h4 className="text-xs font-black uppercase mb-10 border-b border-white/10 pb-6 flex items-center gap-4">{icon} {title}</h4><div className="space-y-5">{children}</div></div>
);

const RuleItem = ({ label, val, active }) => (
  <div className={`flex justify-between items-center p-5 rounded-[1.5rem] border-2 transition-all ${active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-30'}`}><span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span><span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{val}</span></div>
);

const MetInput = ({ label, val, onChange }) => (
  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">{label}</label><input type="number" className="w-40 p-5 border-2 rounded-3xl font-black bg-slate-50 outline-none focus:border-blue-600 transition-all text-sm" value={val} onChange={e => onChange(e.target.value)} /></div>
);

const KPILine = ({ title, meta, total, field, data, format, isPercent=false }) => {
  const getStatus = (v) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta)/4;
    if (v >= target) return 'bg-emerald-500 shadow-emerald-200';
    if (v >= target * 0.7) return 'bg-amber-500 shadow-amber-200';
    return 'bg-rose-500 shadow-rose-200';
  };
  
  const getWVal = (w) => {
    const sLeads = data.filter(l => Number(l.week) === w && !l.isArchived);
    const won = sLeads.filter(l => l.stage === 'fechado');
    if (field === 'contacts') return sLeads.length;
    if (field === 'fUp') return sLeads.length > 0 ? (sLeads.filter(l=>l.followUp).length / sLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter(l=>l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'up') return won.length > 0 ? (won.filter(l=>l.hasUpSell).length / won.length) * 100 : 0;
    if (field === 'conv') return sLeads.length > 0 ? (won.length / sLeads.length) * 100 : 0;
    return 0;
  };

  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="p-12 font-black text-slate-800 text-sm tracking-tight">{title}</td>
      <td className="p-12 text-center italic text-slate-400 font-bold">{meta}</td>
      {[1, 2, 3, 4].map(w => {
        const v = getWVal(w);
        return (
          <td key={w} className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getStatus(v)} shadow-lg ring-4 ring-slate-100 transition-all`}></div>
              <span className="text-[10px] font-black">{format(v)}</span>
            </div>
          </td>
        );
      })}
      <td className="p-12 text-center bg-blue-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${getStatus(parseFloat(total))} shadow-xl`}></div>
          <span className="text-xl font-black text-blue-900 tracking-tighter">{total}</span>
        </div>
      </td>
    </tr>
  );
};
