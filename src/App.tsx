import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart
} from 'lucide-center';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

// Definição das Etiquetas para a Legenda e Cards
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100', hover: 'hover:bg-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100', hover: 'hover:bg-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100', hover: 'hover:bg-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100', hover: 'hover:bg-emerald-100' },
];

export default function CRMSystem() {
  // --- ESTADOS DE CONTROLE DE INTERFACE ---
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState('');

  // --- ESTADOS DE DADOS (LEADS E METAS) ---
  const [leads, setLeads] = useState([]);
  const [newLead, setNewLead] = useState({ 
    name: '', value: '', vendor: 'Vendedor 1', notes: '', tags: '', stage: 'contato' 
  });

  const [goals, setGoals] = useState({
    revenue: 100000, 
    ticket: 5000, 
    conversion: 5, 
    crossSell: 40, 
    upSell: 15, 
    contacts: 400, 
    followUp: 90, 
    postSale: 100, 
    reactivated: 20
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

  // --- SINCRONIZAÇÃO COM SUPABASE ---
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchLeads();
      setLoading(false);
    };
    initializeData();

    const channel = supabase.channel('crm-realtime-engine')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Falha ao buscar leads:", err.message);
    }
  };

  const saveLead = async (leadData) => {
    try {
      const payload = { 
        ...leadData, 
        value: Number(leadData.value) || 0, 
        week: Number(leadData.week) || 1,
        lastUpdate: new Date().toISOString() 
      };
      
      const { error } = await supabase.from('leads').upsert(payload);
      if (error) throw error;
      // O fetchLeads será disparado pelo canal de realtime
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const deleteLead = async (id) => {
    if(!window.confirm("Esta ação é irreversível. O lead será removido do banco de dados. Deseja continuar?")) return;
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    saveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- SISTEMA DE ARQUIVAMENTO (FECHAMENTO DE CICLO) ---
  const handleArchiveCycle = async () => {
    const cycleName = window.prompt("Digite o nome do ciclo para arquivamento (Ex: Janeiro/2026):");
    if (!cycleName) return;

    const confirm = window.confirm("Isso moverá todos os leads ativos para o histórico. Esta operação é segura.");
    if (confirm) {
      setLoading(true);
      const activeLeads = leads.filter(l => !l.isArchived);
      for (const lead of activeLeads) {
        await supabase.from('leads').update({ 
          isArchived: true, 
          cycle_name: cycleName 
        }).eq('id', lead.id);
      }
      setCommissionData({
        weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
        profitMargin: 0
      });
      await fetchLeads();
      setLoading(false);
      alert("Ciclo arquivado com sucesso!");
    }
  };

  // --- CÁLCULOS DE PERFORMANCE ---
  const checkLeadStaleStatus = (lastUpdate) => {
    if (!lastUpdate) return false;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return (Date.now() - new Date(lastUpdate).getTime()) > threeDaysInMs;
  };

  const calculateKPIs = (dataList) => {
    const won = dataList.filter(l => l.stage === 'fechado');
    const total = dataList.length || 0;
    return {
      contacts: total,
      followUpRate: total > 0 ? (dataList.filter(l => l.followUp).length / total) * 100 : 0,
      postSaleRate: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      reactivatedCount: dataList.filter(l => l.reactivated && l.stage === 'fechado').length,
      crossSellRate: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      upSellRate: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0
    };
  };

  const getStatusColor = (current, target, isPercent = false, isCumulative = false) => {
    const goalValue = isPercent ? target : (isCumulative ? target : target / 4);
    if (current >= goalValue) return 'bg-emerald-500';
    if (current >= goalValue * 0.75) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // --- LOGICA FINANCEIRA ---
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, w) => acc + Number(w.revenue), 0);
  const weeksWithData = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = weeksWithData > 0 ? (Object.values(commissionData.weeks).reduce((acc, w) => acc + Number(w.ticket), 0) / weeksWithData) : 0;
  const percentOfGoal = (totalRevenue / (goals.revenue || 1)) * 100;
  
  const currentKpis = calculateKPIs(leads.filter(l => !l.isArchived));

  const getBaseCommission = () => {
    if (percentOfGoal >= 110) return 3.5;
    if (percentOfGoal >= 100) return 2.5;
    if (percentOfGoal >= 90) return 1.5;
    return 0;
  };

  const calculateBonus = () => {
    if (Number(commissionData.profitMargin) <= 0) return 0;
    let bonus = 0;
    if (avgTicketAchieved >= goals.ticket) bonus += 0.5;
    if (currentKpis.crossSellRate >= goals.crossSell) bonus += 0.5;
    if (currentKpis.upSellRate >= goals.upSell) bonus += 0.5;
    return bonus;
  };

  const hasFixedBonus = currentKpis.contacts >= goals.contacts && currentKpis.followUpRate >= goals.followUp;
  const finalCommissionPercent = getBaseCommission() + calculateBonus();
  const commissionInCurrency = (totalRevenue * (finalCommissionPercent / 100)) + (hasFixedBonus ? 300 : 0);

  if (loading) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-blue-600 font-black uppercase tracking-widest animate-pulse">Sincronizando Base de Dados...</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER PRINCIPAL */}
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-[2rem] shadow-2xl shadow-blue-200 rotate-3">
              <TrendingUp className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-800">SalesPro <span className="text-blue-600">Max</span></h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Engine v4.2 Full Integration</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-[2.5rem] shadow-xl border border-white">
            <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] mr-4">
              {[1, 2, 3, 4].map(w => (
                <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
              ))}
            </div>

            <nav className="flex gap-2">
              {[
                { id: 'pipeline', label: 'Pipeline', icon: <BarChart size={14}/> },
                { id: 'metrics', label: 'KPIs', icon: <Target size={14}/> },
                { id: 'commission', label: 'Financeiro', icon: <DollarSign size={14}/> },
                { id: 'archive', label: 'Histórico', icon: <Archive size={14}/> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl translate-y-[-2px]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
            
            <div className="flex gap-2 border-l pl-4 border-slate-200">
              <button onClick={handleArchiveCycle} className="bg-rose-50 text-rose-600 p-3 rounded-2xl hover:bg-rose-600 hover:text-white transition-all" title="Arquivar Mês Atual"><Archive size={20} /></button>
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><PlusCircle size={24} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        
        {/* VIEW: PIPELINE COM REGRAS DE STATUS */}
        {activeTab === 'pipeline' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Legenda Dinâmica */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-2 rounded-xl"><Info className="text-blue-600" size={20}/></div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Status de Atendimento:</p>
              </div>
              <div className="flex flex-wrap gap-8">
                {AVAILABLE_TAGS.map(tag => (
                  <div key={tag.id} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${tag.color} shadow-sm ring-4 ring-slate-50`} />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{tag.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage && Number(l.week || 1) === currentWeek && !l.isArchived);
                const totalValue = stageLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);

                return (
                  <div key={stage} className="bg-slate-200/40 p-5 rounded-[2.5rem] border-2 border-dashed border-slate-300/50 min-h-[750px]">
                    <div className="mb-8 flex justify-between items-start px-2">
                      <div>
                        <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{stage}</h3>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {totalValue.toLocaleString()}</p>
                      </div>
                      <div className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-blue-600 shadow-sm">{stageLeads.length}</div>
                    </div>

                    <div className="space-y-5">
                      {stageLeads.map(lead => {
                        const isExpired = checkLeadStaleStatus(lead.lastUpdate) && stage !== 'fechado' && stage !== 'perdido';
                        return (
                          <div key={lead.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:-translate-y-1 group relative ${isExpired ? 'border-rose-200 bg-rose-50/30 ring-4 ring-rose-50' : 'border-white'}`}>
                            {isExpired && (
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white p-1 rounded-full shadow-lg z-20">
                                <Clock size={12} className="animate-spin" />
                              </div>
                            )}

                            <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-2.5 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white">
                              <Trash2 size={14}/>
                            </button>

                            {/* Tags do Lead */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {lead.tags?.split(',').filter(t => t).map(tagId => {
                                const tagConfig = AVAILABLE_TAGS.find(t => t.id === tagId);
                                return tagConfig && (
                                  <div key={tagId} className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase ${tagConfig.light} border animate-in zoom-in`}>
                                    {tagConfig.label.split(' ')[0]}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><User size={10}/> {lead.vendor}</span>
                              <select 
                                className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded-lg border-none outline-none focus:ring-2 ring-blue-500"
                                value={lead.stage}
                                onChange={(e) => saveLead({...lead, stage: e.target.value})}
                              >
                                {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => (
                                  <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>

                            <h4 className="font-black text-sm text-slate-800 uppercase mb-1 leading-tight">{lead.name}</h4>
                            <div className="text-emerald-600 font-black text-sm mb-4">R$ {Number(lead.value).toLocaleString()}</div>

                            {/* Mini Notas Persistentes */}
                            <div className="mb-5">
                              <textarea 
                                className="w-full text-[10px] p-3 bg-slate-50 border-none rounded-2xl resize-none font-medium text-slate-500 placeholder:italic"
                                rows="2"
                                placeholder="Notas da negociação..."
                                value={lead.notes || ''}
                                onChange={(e) => saveLead({...lead, notes: e.target.value})}
                              />
                            </div>

                            {/* INTERAÇÕES RÁPIDAS (METRICAS) */}
                            <div className="pt-5 border-t border-slate-100">
                              <p className="text-[8px] font-black text-slate-300 uppercase mb-3 flex items-center gap-1"><Zap size={10}/> Acionáveis:</p>
                              <div className="flex gap-3 mb-4">
                                {AVAILABLE_TAGS.map(tag => (
                                  <button 
                                    key={tag.id} 
                                    onClick={() => toggleTag(lead, tag.id)}
                                    className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-lg scale-125` : 'bg-slate-100 border-transparent hover:border-slate-300'}`}
                                  />
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <QuickActionButton label="Follow-up" active={lead.followUp} onClick={() => saveLead({...lead, followUp: !lead.followUp})} color="bg-orange-500" />
                                <QuickActionButton label="Pós-Venda" active={lead.postSale} onClick={() => saveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" />
                                <QuickActionButton label="Cross-Sell" active={lead.hasCrossSell} onClick={() => saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                                <QuickActionButton label="Up-Sell" active={lead.hasUpSell} onClick={() => saveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-emerald-600" />
                                <button 
                                  onClick={() => saveLead({...lead, reactivated: !lead.reactivated})}
                                  className={`col-span-2 p-2 rounded-xl border text-[8px] font-black uppercase transition-all ${lead.reactivated ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-300 hover:border-slate-200'}`}
                                >
                                  Lead de Recuperação
                                </button>
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
          </div>
        )}

        {/* VIEW: KPIs TÉCNICOS */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
            <div className="p-10 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-4 rounded-3xl text-white"><BarChart2 size={28}/></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Indicadores de Conversão</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento em tempo real por semana operativa</p>
                </div>
              </div>
              <div className="hidden md:flex gap-4">
                <KPIMiniCard label="Total Leads" value={leads.filter(l => !l.isArchived).length} icon={<User size={12}/>} />
                <KPIMiniCard label="Fechamentos" value={leads.filter(l => l.stage === 'fechado' && !l.isArchived).length} icon={<Award size={12}/>} />
              </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
                <tr>
                  <th className="p-10">Métrica Estratégica</th>
                  <th className="p-10 text-center">Meta do Ciclo</th>
                  {[1, 2, 3, 4].map(w => <th key={w} className="p-10 text-center">S{w} Performance</th>)}
                  <th className="p-10 text-center bg-blue-900">Total Consolidado</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                <KPIEntry 
                  title="Volume de Novos Contatos" 
                  meta={goals.contacts} 
                  total={currentKpis.contacts} 
                  weeks={leads} 
                  goals={goals} 
                  field="contacts" 
                  format={(v) => v} 
                />
                <KPIEntry 
                  title="Aproveitamento Follow-up (%)" 
                  meta={goals.followUp + "%"} 
                  total={currentKpis.followUpRate.toFixed(1) + "%"} 
                  weeks={leads} 
                  goals={goals} 
                  field="followUpRate" 
                  format={(v) => v.toFixed(1) + "%"}
                  isPercent
                />
                <KPIEntry 
                  title="Taxa de Cross-Sell (%)" 
                  meta={goals.crossSell + "%"} 
                  total={currentKpis.crossSellRate.toFixed(1) + "%"} 
                  weeks={leads} 
                  goals={goals} 
                  field="crossSellRate" 
                  format={(v) => v.toFixed(1) + "%"}
                  isPercent
                />
                <KPIEntry 
                  title="Taxa de Up-Sell (%)" 
                  meta={goals.upSell + "%"} 
                  total={currentKpis.upSellRate.toFixed(1) + "%"} 
                  weeks={leads} 
                  goals={goals} 
                  field="upSellRate" 
                  format={(v) => v.toFixed(1) + "%"}
                  isPercent
                />
                <KPIEntry 
                  title="Eficiência de Pós-Venda (%)" 
                  meta={goals.postSale + "%"} 
                  total={currentKpis.postSaleRate.toFixed(1) + "%"} 
                  weeks={leads} 
                  goals={goals} 
                  field="postSaleRate" 
                  format={(v) => v.toFixed(1) + "%"}
                  isPercent
                />
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW: FINANCEIRO E REGRAS DE COMISSÃO */}
        {activeTab === 'commission' && (
          <div className="space-y-10 animate-in zoom-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                  <DollarSign size={200}/>
                </div>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60 mb-3">Faturamento Bruto (Acumulado)</p>
                <h3 className="text-7xl font-black tracking-tighter mb-10">R$ {totalRevenue.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-blue-400/50">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Ticket Médio Alcançado</p>
                    <p className="text-3xl font-black">R$ {avgTicketAchieved.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-1">Atingimento da Meta</p>
                    <p className="text-3xl font-black">{percentOfGoal.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border-[6px] border-emerald-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <div className="bg-emerald-50 p-4 rounded-3xl mb-6">
                  <Award className="text-emerald-600" size={40}/>
                </div>
                <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Comissão Líquida Prevista</p>
                <h3 className="text-8xl text-emerald-600 font-black tracking-tighter">R$ {commissionInCurrency.toLocaleString()}</h3>
                <div className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200">
                  Taxa Paga: {finalCommissionPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* TABELA DE REGRAS (O QUE FALTAVA) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <ShieldCheck className="text-blue-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Escalonação Base</h4>
                  </div>
                  <div className="space-y-6">
                    <RuleItem label="Meta < 90%" value="0.0%" active={percentOfGoal < 90} />
                    <RuleItem label="Meta 90% a 99%" value="1.5%" active={percentOfGoal >= 90 && percentOfGoal < 100} />
                    <RuleItem label="Meta 100% a 109%" value="2.5%" active={percentOfGoal >= 100 && percentOfGoal < 110} />
                    <RuleItem label="Meta 110% (Super)" value="3.5%" active={percentOfGoal >= 110} />
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <Zap className="text-amber-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Aceleradores (+0.5%)</h4>
                  </div>
                  <div className="space-y-6">
                    <RuleItem label="Ticket Médio (Meta)" value="+0.5%" active={avgTicketAchieved >= goals.ticket} subtitle={`Mínimo R$ ${goals.ticket}`} />
                    <RuleItem label="Taxa Cross-Sell" value="+0.5%" active={currentKpis.crossSellRate >= goals.crossSell} subtitle={`Mínimo ${goals.crossSell}%`} />
                    <RuleItem label="Taxa Up-Sell" value="+0.5%" active={currentKpis.upSellRate >= goals.upSell} subtitle={`Mínimo ${goals.upSell}%`} />
                    <p className="text-[9px] text-slate-500 italic mt-4">*Requer Margem de Lucro Positiva para ativar bônus.</p>
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                    <Award className="text-emerald-500" size={24}/>
                    <h4 className="text-sm font-black uppercase tracking-widest">Bônus Operacional</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-white/5 p-6 rounded-3xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Prêmio Fixo: R$ 300,00</p>
                      <p className="text-xs font-medium text-slate-300 mb-4 leading-relaxed">Pago ao atingir o volume de contatos e a taxa de follow-up simultaneamente.</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase">Status:</span>
                        <span className={`text-xs font-black ${hasFixedBonus ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hasFixedBonus ? 'HABILITADO' : 'PENDENTE'}
                        </span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* LANÇAMENTOS FINANCEIROS */}
            <div className="bg-white rounded-[3rem] border shadow-xl p-12">
               <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                 <h4 className="text-sm font-black uppercase text-blue-600 flex items-center gap-3"><ClipboardList size={20}/> Gestão de Receita e Metas</h4>
                 <div className="flex gap-4">
                   <div className="bg-slate-50 px-6 py-2 rounded-2xl border text-[10px] font-black uppercase text-slate-400">Total: R$ {totalRevenue.toLocaleString()}</div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 pb-12 border-b border-slate-100">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Meta Mensal de Faturamento</label>
                    <input type="number" className="w-full p-6 border-2 rounded-[1.5rem] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner" value={goals.revenue} onChange={e => setGoals({...goals, revenue: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Meta Mensal de Ticket Médio</label>
                    <input type="number" className="w-full p-6 border-2 rounded-[1.5rem] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner" value={goals.ticket} onChange={e => setGoals({...goals, ticket: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Margem de Lucro Declarada (%)</label>
                    <input type="number" className="w-full p-6 border-2 rounded-[1.5rem] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner" value={commissionData.profitMargin} onChange={e => setCommissionData({...commissionData, profitMargin: e.target.value})} />
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="text-[11px] font-black uppercase text-slate-400 border-b">
                       <th className="p-6 text-left">Calendário Semanal</th>
                       <th className="p-6 text-left">Faturamento Bruto Realizado (R$)</th>
                       <th className="p-6 text-left">Ticket Médio Alcançado (R$)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {[1, 2, 3, 4].map(w => (
                       <tr key={w} className="group hover:bg-slate-50/50 transition-colors">
                         <td className="p-8 font-black text-slate-400 uppercase text-xs">Semana Operativa {w}</td>
                         <td className="p-8">
                           <div className="relative">
                             <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                             <input type="number" className="w-full p-5 pl-12 bg-slate-100/50 rounded-2xl font-black border-none focus:ring-4 ring-blue-500/10 shadow-sm" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} />
                           </div>
                         </td>
                         <td className="p-8">
                           <div className="relative">
                             <TrendingUp size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                             <input type="number" className="w-full p-5 pl-12 bg-slate-100/50 rounded-2xl font-black border-none focus:ring-4 ring-blue-500/10 shadow-sm" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} />
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* VIEW: HISTÓRICO INTEGRADO */}
        {activeTab === 'archive' && (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-700">
            <div className="bg-white p-12 rounded-[3rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-10">
              <div className="flex items-center gap-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200"><Archive size={36}/></div>
                <div>
                  <h3 className="text-3xl font-black tracking-tighter">Histórico de Performance</h3>
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Relatório consolidado de ciclos encerrados</p>
                </div>
              </div>
              <div className="relative w-full lg:w-[450px]">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                <input 
                  type="text" 
                  placeholder="Pesquisar por ciclo (Ex: Fevereiro)..." 
                  className="w-full p-6 pl-14 border-2 rounded-3xl font-black bg-slate-50 focus:border-blue-500 outline-none shadow-inner"
                  onChange={(e) => setFilterCycle(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-10">Cliente / Organização</th>
                    <th className="p-10">Vendedor Responsável</th>
                    <th className="p-10 text-center">Valor do Contrato</th>
                    <th className="p-10 text-center">Ciclo de Fechamento</th>
                    <th className="p-10 text-center">Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold uppercase text-slate-600">
                  {leads
                    .filter(l => l.isArchived)
                    .filter(l => !filterCycle || (l.cycle_name?.toLowerCase().includes(filterCycle.toLowerCase())))
                    .map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="p-10">
                          <p className="font-black text-slate-800 text-base">{lead.name}</p>
                          <p className="text-[9px] text-slate-400 lowercase">{lead.id.substring(0,8)}</p>
                        </td>
                        <td className="p-10">
                          <span className="bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-[10px] font-black border border-blue-100">{lead.vendor}</span>
                        </td>
                        <td className="p-10 text-center font-black text-emerald-600 text-base">R$ {Number(lead.value).toLocaleString()}</td>
                        <td className="p-10 text-center">
                          <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-2xl text-[10px] font-black">{lead.cycle_name || 'LEGADO'}</span>
                        </td>
                        <td className="p-10">
                          <div className="flex justify-center gap-6">
                            <button onClick={() => saveLead({...lead, isArchived: false})} className="text-blue-500 hover:scale-150 transition-transform" title="Restaurar para o Pipeline Ativo">
                              <RotateCcw size={22}/>
                            </button>
                            <button onClick={() => deleteLead(lead.id)} className="text-rose-300 hover:text-rose-600 hover:scale-150 transition-transform">
                              <Trash2 size={22}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {leads.filter(l => l.isArchived).length === 0 && (
                <div className="p-32 text-center">
                  <Archive size={80} className="mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-300 font-black uppercase text-xs tracking-[0.4em]">Nenhum registro encontrado no histórico</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL SYSTEM (DESIGN ENTERPRISE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] relative border-t-[20px] border-blue-600 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-200">
                <PlusCircle size={32}/>
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase text-slate-800 tracking-tighter">Novo Lead Ativo</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Início do Ciclo de Vendas</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nome do Prospecto / Empresa</label>
                <input placeholder="Ex: Global Tech Solutions" className="w-full p-6 rounded-[1.8rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Volume Projetado (R$)</label>
                  <input type="number" placeholder="0,00" className="w-full p-6 rounded-[1.8rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Responsável</label>
                  <select className="w-full p-6 rounded-[1.8rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm appearance-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                    <option>Vendedor 1</option>
                    <option>Vendedor 2</option>
                    <option>Vendedor 3</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Briefing Inicial</label>
                <textarea placeholder="Descreva os principais pontos da oportunidade..." className="w-full p-6 rounded-[1.8rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              </div>
              
              <div className="flex flex-col gap-4 mt-8">
                <button 
                  onClick={async () => {
                    if(!newLead.name || !newLead.value) return alert("Preencha Nome e Valor.");
                    await saveLead({ ...newLead, week: currentWeek, isArchived: false });
                    setIsModalOpen(false);
                    setNewLead({name:'', value:'', vendor:'Vendedor 1', notes: '', tags: '', stage: 'contato'});
                  }}
                  className="w-full bg-blue-600 text-white p-7 rounded-[2rem] font-black uppercase shadow-2xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-lg tracking-[0.2em]"
                >
                  Inserir no Pipeline
                </button>
                <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[11px] tracking-widest py-3">Cancelar Operação</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES ATÔMICOS (PEÇAS DO MOTOR) ---

const KPIEntry = ({ title, meta, total, weeks, goals, field, format, isPercent = false }) => {
  const getWeeklyVal = (w) => {
    const filtered = weeks.filter(l => Number(l.week || 1) === w && !l.isArchived);
    const won = filtered.filter(l => l.stage === 'fechado');
    const totalCount = filtered.length;
    
    if (field === 'contacts') return totalCount;
    if (field === 'followUpRate') return totalCount > 0 ? (filtered.filter(l => l.followUp).length / totalCount) * 100 : 0;
    if (field === 'crossSellRate') return won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'upSellRate') return won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0;
    if (field === 'postSaleRate') return won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0;
    return 0;
  };

  const getFarol = (val) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    if (val >= target) return 'bg-emerald-500';
    if (val >= target * 0.7) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group">
      <td className="p-10">
        <div className="flex items-center gap-4">
          <ChevronRight size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
          <span className="font-black text-slate-700 text-sm tracking-tight">{title}</span>
        </div>
      </td>
      <td className="p-10 text-center text-slate-300 font-bold italic tracking-tighter">Meta: {meta}</td>
      {[1, 2, 3, 4].map(w => {
        const val = getWeeklyVal(w);
        return (
          <td key={w} className="p-10 text-center border-x border-slate-50">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getFarol(val)} shadow-lg ring-4 ring-slate-100 transition-transform group-hover:scale-125`} />
              <span className="font-black text-[11px] text-slate-500">{format(val)}</span>
            </div>
          </td>
        );
      })}
      <td className="p-10 text-center bg-blue-50/40 border-l-4 border-white">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${getFarol(parseFloat(total))} shadow-xl`} />
          <span className="font-black text-2xl text-blue-900 tracking-tighter">{total}</span>
        </div>
      </td>
    </tr>
  );
};

const QuickActionButton = ({ label, active, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`p-2.5 rounded-2xl border text-[8px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105 shadow-md` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}
  >
    {label}
  </button>
);

const RuleItem = ({ label, value, active, subtitle }) => (
  <div className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-40'}`}>
    <div>
      <p className="text-[11px] font-black uppercase tracking-widest text-white">{label}</p>
      {subtitle && <p className="text-[9px] text-slate-400 font-bold mt-1 italic">{subtitle}</p>}
    </div>
    <span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{value}</span>
  </div>
);

const KPIMiniCard = ({ label, value, icon }) => (
  <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
    <div className="bg-slate-50 p-2 rounded-lg text-slate-400">{icon}</div>
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}</p>
    </div>
  </div>
);
