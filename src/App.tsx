import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMSystem() {
  // --- ESTADOS DE CONTROLE ---
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState('');
  const [newLead, setNewLead] = useState({ 
    name: '', value: '', vendor: 'Vendedor 1', notes: '', tags: '', stage: 'contato' 
  });

  // --- REGRAS DE NEGÓCIO E METAS ---
  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, conversion: 5, crossSell: 40, upSell: 15, 
    contacts: 400, followUp: 90, postSale: 100, reactivated: 20
  });

  const [commissionData, setCommissionData] = useState({
    weeks: { 
      1: { revenue: 0, ticket: 0 }, 
      2: { revenue: 0, ticket: 0 }, 
      3: { revenue: 0, ticket: 0 }, 
      4: { revenue: 0, ticket: 0 } 
    },
    profitMargin: 0
  });

  // --- SINCRONIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    if (!supabase) return;
    fetchLeads();
    const channel = supabase.channel('crm-full-engine')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  const saveLead = async (leadData) => {
    if (!supabase) return;
    const payload = { 
        ...leadData, 
        value: Number(leadData.value) || 0, 
        week: Number(leadData.week) || 1,
        lastUpdate: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
  };

  const deleteLead = async (id) => {
    if(!supabase) return;
    if(window.confirm("Esta ação removerá o lead permanentemente. Confirmar?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    saveLead({ ...lead, tags: currentTags.join(',') });
  };

  const handleEndCycle = async () => {
    if (!supabase) return;
    const monthName = window.prompt("Nome do ciclo para arquivamento (Ex: Março/2026):");
    if (!monthName) return;
    
    setLoading(true);
    const { error } = await supabase.from('leads').update({ 
      isArchived: true, 
      cycle_name: monthName 
    }).eq('isArchived', false);
    
    if (!error) {
      setCommissionData({
        weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
        profitMargin: 0
      });
      await fetchLeads();
    }
    setLoading(false);
  };

  // --- LÓGICA DE STALE (LEAD PARADO) ---
  const isStale = (date) => {
    if(!date) return false;
    const diff = Date.now() - new Date(date).getTime();
    return diff > (3 * 24 * 60 * 60 * 1000); // 3 dias sem mexer
  };

  // --- CÁLCULOS FINANCEIROS ---
  const calculateKPIs = (dataList) => {
    const active = dataList.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const total = active.length || 0;
    return {
      contacts: total,
      followUpRate: total > 0 ? (active.filter(l => l.followUp).length / total) * 100 : 0,
      crossSellRate: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      upSellRate: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      postSaleRate: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
    };
  };

  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const activeWeeks = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = activeWeeks > 0 ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / activeWeeks) : 0;
  const revPerc = (totalRevenue / (goals.revenue || 1)) * 100;
  
  const currentKpis = calculateKPIs(leads);
  const baseComm = revPerc >= 110 ? 3.5 : revPerc >= 100 ? 2.5 : revPerc >= 90 ? 1.5 : 0;
  const bonusVar = (Number(commissionData.profitMargin) > 0) ? (
    (avgTicketAchieved >= goals.ticket ? 0.5 : 0) + 
    (currentKpis.crossSellRate >= goals.crossSell ? 0.5 : 0) + 
    (currentKpis.upSellRate >= goals.upSell ? 0.5 : 0)
  ) : 0;

  const hasFixedBonus = currentKpis.contacts >= goals.contacts && currentKpis.followUpRate >= goals.followUp;
  const totalCommPercent = baseComm + bonusVar;
  const finalCommVal = (totalRevenue * (totalCommPercent / 100)) + (hasFixedBonus ? 300 : 0);

  if (loading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-blue-500 font-black tracking-widest animate-pulse uppercase">Iniciando SalesPro Engine...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER INTEGRADO */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-[2rem] shadow-2xl shadow-blue-200">
            <TrendingUp className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-800">SalesPro <span className="text-blue-600">Max</span></h1>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Live Sync</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-2.5 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-2">
            {[
                { id: 'pipeline', label: 'Pipeline', icon: <BarChart size={14}/> },
                { id: 'metrics', label: 'KPIs', icon: <Target size={14}/> },
                { id: 'commission', label: 'Financeiro', icon: <DollarSign size={14}/> },
                { id: 'archive', label: 'Histórico', icon: <Archive size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex gap-2 border-l pl-4 border-slate-200">
            <button onClick={handleEndCycle} className="bg-rose-50 text-rose-600 p-3 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Archive size={20} /></button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><PlusCircle size={24} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        
        {/* ABA: PIPELINE (A VISÃO DE GESTÃO) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in duration-700">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage && Number(l.week || 1) === currentWeek && !l.isArchived);
              const totalVal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              return (
                <div key={stage} className="bg-slate-200/40 p-5 rounded-[2.5rem] border-2 border-dashed border-slate-300/50 min-h-[750px]">
                  <div className="mb-8 px-2 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{stage}</h3>
                      <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {totalVal.toLocaleString()}</p>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-blue-600 shadow-sm">{stageLeads.length}</div>
                  </div>

                  <div className="space-y-5">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:-translate-y-1 relative group ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'border-rose-200 bg-rose-50/30' : 'border-white'}`}>
                        {isStale(lead.lastUpdate) && stage !== 'fechado' && (
                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white p-1 rounded-full shadow-lg animate-pulse z-20">
                                <Clock size={12} />
                            </div>
                        )}
                        <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-2.5 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"><Trash2 size={14}/></button>
                        
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{lead.vendor}</span>
                            <div className="flex gap-1">
                                {lead.tags?.split(',').filter(t=>t).map(tId => {
                                    const tag = AVAILABLE_TAGS.find(x => x.id === tId);
                                    return <div key={tId} className={`w-2 h-2 rounded-full ${tag?.color}`} title={tag?.label}></div>
                                })}
                            </div>
                        </div>

                        <h4 className="font-black text-sm text-slate-800 uppercase mb-1 leading-tight">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-sm mb-4 font-mono">R$ {Number(lead.value).toLocaleString()}</div>
                        
                        <textarea 
                            className="w-full text-[10px] p-3 bg-slate-50 border-none rounded-2xl resize-none font-medium text-slate-500 placeholder:italic mb-4"
                            rows="2" placeholder="Notas da negociação..."
                            value={lead.notes || ''}
                            onChange={(e) => saveLead({...lead, notes: e.target.value})}
                        />

                        <div className="pt-5 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <QuickAction label="Follow-Up" active={lead.followUp} onClick={()=>saveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" />
                                <QuickAction label="Pós-Venda" active={lead.postSale} onClick={()=>saveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" />
                                <QuickAction label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                                <QuickAction label="Up-Sell" active={lead.hasUpSell} onClick={()=>saveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-emerald-600" />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[8px] font-black text-slate-300 uppercase">Tags Rápidas:</p>
                                <div className="flex gap-1.5">
                                    {AVAILABLE_TAGS.map(tag => (
                                        <button key={tag.id} onClick={()=>toggleTag(lead, tag.id)} className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? tag.color : 'bg-slate-100 border-transparent'}`}></button>
                                    ))}
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA: KPIs (INDICADORES SEMANAIS) */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
            <div className="p-10 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><BarChart2 size={28}/></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Indicadores de Conversão</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento Dinâmico por Ciclo</p>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-10">Métrica Estratégica</th>
                  <th className="p-10 text-center">Meta do Mês</th>
                  {[1, 2, 3, 4].map(w => <th key={w} className="p-10 text-center">Semana {w}</th>)}
                  <th className="p-10 text-center bg-blue-900">Consolidado</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                <MetricRow title="Novos Contatos" meta={goals.contacts} field="contacts" data={leads} goals={goals} total={currentKpis.contacts} format={v=>v} />
                <MetricRow title="Taxa de Follow-Up" meta={goals.followUp+"%"} field="followUpRate" data={leads} goals={goals} total={currentKpis.followUpRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                <MetricRow title="Taxa Cross-Sell" meta={goals.crossSell+"%"} field="crossSellRate" data={leads} goals={goals} total={currentKpis.crossSellRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                <MetricRow title="Taxa Up-Sell" meta={goals.upSell+"%"} field="upSellRate" data={leads} goals={goals} total={currentKpis.upSellRate.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: FINANCEIRO (COMISSÕES E REGRAS) */}
        {activeTab === 'commission' && (
          <div className="space-y-10 animate-in zoom-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-1000"><DollarSign size={200}/></div>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60 mb-3">Faturamento Realizado</p>
                <h3 className="text-7xl font-black tracking-tighter mb-10 font-mono">R$ {totalRevenue.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-blue-400/50">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Ticket Médio</p>
                    <p className="text-3xl font-black">R$ {avgTicketAchieved.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Atingimento Meta</p>
                    <p className="text-3xl font-black">{revPerc.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border-[6px] border-emerald-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <div className="bg-emerald-50 p-4 rounded-3xl mb-6"><Award className="text-emerald-600" size={40}/></div>
                <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Comissão Líquida Prevista</p>
                <h3 className="text-8xl text-emerald-600 font-black tracking-tighter font-mono">R$ {finalCommVal.toLocaleString()}</h3>
                <div className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200">
                    Taxa Total: {totalCommPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* PAINEL DE REGRAS DE COMISSÃO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <ShieldCheck className="text-blue-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Escalonação Base</h4>
                  </div>
                  <div className="space-y-6">
                    <RuleItem label="Meta < 90%" val="0.0%" active={revPerc < 90} />
                    <RuleItem label="Meta 90% a 99%" val="1.5%" active={revPerc >= 90 && revPerc < 100} />
                    <RuleItem label="Meta 100% a 109%" val="2.5%" active={revPerc >= 100 && revPerc < 110} />
                    <RuleItem label="Meta 110% (Super Meta)" val="3.5%" active={revPerc >= 110} />
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <Zap className="text-amber-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Aceleradores (+0.5% cada)</h4>
                  </div>
                  <div className="space-y-6">
                    <RuleItem label="Meta Ticket Médio" val="+0.5%" active={avgTicketAchieved >= goals.ticket} />
                    <RuleItem label="Meta Cross-Sell" val="+0.5%" active={currentKpis.crossSellRate >= goals.crossSell} />
                    <RuleItem label="Meta Up-Sell" val="+0.5%" active={currentKpis.upSellRate >= goals.upSell} />
                    <p className="text-[9px] text-slate-500 italic mt-4">*Aceleradores requerem Margem de Lucro Positiva.</p>
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <Award className="text-emerald-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Bônus Operacional (Fixo)</h4>
                  </div>
                  <div className="bg-white/5 p-8 rounded-[2rem]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Prêmio: R$ 300,00</p>
                    <p className="text-xs font-medium text-slate-300 mb-6 leading-relaxed">Concedido ao atingir as metas de Novos Contatos e Taxa de Follow-Up simultaneamente.</p>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-white">Status Atual:</span>
                        <span className={`text-xs font-black ${hasFixedBonus ? 'text-emerald-400' : 'text-rose-400'}`}>{hasFixedBonus ? 'HABILITADO' : 'BLOQUEADO'}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* TABELA DE LANÇAMENTOS SEMANAIS */}
            <div className="bg-white rounded-[3rem] border shadow-xl p-12">
               <div className="flex justify-between items-center mb-10">
                 <h4 className="text-sm font-black uppercase text-blue-600 flex items-center gap-3"><ClipboardList size={20}/> Gestão de Metas e Lançamentos</h4>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 pb-12 border-b border-slate-100">
                  <MetInput label="Meta Faturamento" val={goals.revenue} onChange={v=>setGoals({...goals, revenue:v})} />
                  <MetInput label="Meta Ticket Médio" val={goals.ticket} onChange={v=>setGoals({...goals, ticket:v})} />
                  <MetInput label="Margem de Lucro (%)" val={commissionData.profitMargin} onChange={v=>setCommissionData({...commissionData, profitMargin:v})} />
               </div>

               <table className="w-full text-left">
                 <thead>
                    <tr className="text-[11px] font-black uppercase text-slate-400 border-b">
                        <th className="p-6">Cronograma Semanal</th>
                        <th className="p-6">Faturamento Realizado (R$)</th>
                        <th className="p-6">Ticket Médio Alcançado (R$)</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 font-bold">
                    {[1, 2, 3, 4].map(w => (
                        <tr key={w} className="hover:bg-slate-50 transition-colors">
                            <td className="p-8 text-xs text-slate-400">SEMANA OPERATIVA {w}</td>
                            <td className="p-8">
                                <input type="number" className="w-full p-5 bg-slate-100 rounded-2xl border-none font-black" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} />
                            </td>
                            <td className="p-8">
                                <input type="number" className="w-full p-5 bg-slate-100 rounded-2xl border-none font-black" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} />
                            </td>
                        </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA: HISTÓRICO (ARQUIVADOS) */}
        {activeTab === 'archive' && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-700">
            <div className="bg-white p-12 rounded-[3rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
               <div className="flex items-center gap-6">
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200"><Archive size={36}/></div>
                    <div>
                        <h3 className="text-3xl font-black tracking-tighter">Histórico de Performance</h3>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Registros de Ciclos Encerrados</p>
                    </div>
               </div>
               <input type="text" placeholder="Filtrar por Ciclo..." className="w-full md:w-96 p-6 border-2 rounded-3xl font-black bg-slate-50 outline-none" onChange={e => setFilterCycle(e.target.value)} />
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                    <tr><th className="p-10">Lead / Organização</th><th className="p-10">Vendedor</th><th className="p-10 text-center">Valor</th><th className="p-10 text-center">Ciclo</th><th className="p-10 text-center">Gestão</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold uppercase text-slate-600 text-xs">
                    {leads.filter(l => l.isArchived).filter(l => !filterCycle || l.cycle_name?.toLowerCase().includes(filterCycle.toLowerCase())).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50">
                            <td className="p-10 font-black text-slate-800 text-sm">{lead.name}</td>
                            <td className="p-10"><span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">{lead.vendor}</span></td>
                            <td className="p-10 text-center text-emerald-600 font-black">R$ {Number(lead.value).toLocaleString()}</td>
                            <td className="p-10 text-center"><span className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl">{lead.cycle_name || 'LEGADO'}</span></td>
                            <td className="p-10 text-center">
                                <button onClick={() => saveLead({...lead, isArchived: false})} className="text-blue-500 hover:scale-150 transition-transform"><RotateCcw size={22}/></button>
                            </td>
                        </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL NOVO LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-xl w-full shadow-2xl border-t-[20px] border-blue-600 animate-in zoom-in">
            <h2 className="text-3xl font-black mb-10 uppercase text-slate-800 tracking-tighter">Ativar Novo Lead</h2>
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Empresa / Prospecto</label>
                    <input className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Valor Projetado (R$)</label>
                        <input type="number" className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Responsável</label>
                        <select className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Briefing</label>
                    <textarea className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
                </div>
                <button onClick={async () => { 
                    if(!newLead.name) return;
                    await saveLead({ ...newLead, week: currentWeek, isArchived: false });
                    setIsModalOpen(false);
                    setNewLead({name:'', value:'', vendor:'Vendedor 1', notes:'', tags:'', stage:'contato'});
                }} className="w-full bg-blue-600 text-white p-7 rounded-[2rem] font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all tracking-[0.2em]">Inserir no Pipeline</button>
                <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest py-2">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const QuickAction = ({ label, active, color, onClick }) => (
    <button onClick={onClick} className={`p-2.5 rounded-2xl border text-[8px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105 shadow-md` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

const MetricRow = ({ title, meta, total, field, data, goals, format, isPercent=false }) => {
    const getFarol = (v) => {
        const target = isPercent ? parseFloat(meta) : parseFloat(meta)/4;
        if(v >= target) return 'bg-emerald-500';
        if(v >= target * 0.7) return 'bg-amber-500';
        return 'bg-rose-500';
    };
    const getWeekVal = (w) => {
        const sLeads = data.filter(l => Number(l.week||1) === w && !l.isArchived);
        const won = sLeads.filter(l => l.stage === 'fechado');
        if(field === 'contacts') return sLeads.length;
        if(field === 'followUpRate') return sLeads.length > 0 ? (sLeads.filter(l=>l.followUp).length / sLeads.length) * 100 : 0;
        if(field === 'crossSellRate') return won.length > 0 ? (won.filter(l=>l.hasCrossSell).length / won.length) * 100 : 0;
        if(field === 'upSellRate') return won.length > 0 ? (won.filter(l=>l.hasUpSell).length / won.length) * 100 : 0;
        return 0;
    };
    return (
        <tr className="hover:bg-slate-50 transition-all group">
            <td className="p-10 font-black text-slate-700">{title}</td>
            <td className="p-10 text-center italic text-slate-400 font-bold">Meta: {meta}</td>
            {[1,2,3,4].map(w => {
                const val = getWeekVal(w);
                return (
                    <td key={w} className="p-10 text-center"><div className="flex flex-col items-center gap-2"><div className={`w-4 h-4 rounded-full ${getFarol(val)} shadow-lg ring-4 ring-slate-100`}/><span className="text-[10px] font-black">{format(val)}</span></div></td>
                );
            })}
            <td className="p-10 text-center bg-blue-50/50"><div className="flex flex-col items-center gap-2"><div className={`w-6 h-6 rounded-full ${getFarol(parseFloat(total))} shadow-xl`}/><span className="text-xl font-black text-blue-900">{total}</span></div></td>
        </tr>
    );
};

const RuleItem = ({ label, val, active }) => (
    <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-30'}`}><span className="text-[11px] font-black uppercase tracking-widest text-white">{label}</span><span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{val}</span></div>
);

const MetInput = ({ label, val, onChange }) => (
    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label><input type="number" className="w-full p-6 border-2 rounded-[1.8rem] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner" value={val} onChange={e => onChange(e.target.value)} /></div>
);
