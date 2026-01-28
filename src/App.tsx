import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

// Definição das Etiquetas para a Legenda
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMSystem() {
  // --- ESTADOS PRINCIPAIS ---
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState('');
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', notes: '', tags: '' });

  // --- ESTADOS DE METAS ---
  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, conversion: 5, crossSell: 40, upSell: 15, 
    contacts: 400, followUp: 90, postSale: 100, reactivated: 20
  });

  // --- ESTADOS DE COMISSÃO ---
  const [commissionData, setCommissionData] = useState({
    weeks: { 
      1: { revenue: 0, ticket: 0 }, 
      2: { revenue: 0, ticket: 0 }, 
      3: { revenue: 0, ticket: 0 }, 
      4: { revenue: 0, ticket: 0 } 
    },
    profitMargin: 0
  });

  // --- CARREGAMENTO E SINCRONIZAÇÃO ---
  useEffect(() => {
    fetchLeads();
    const channel = supabase.channel('crm-full-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  const saveLead = async (leadData) => {
    const payload = { 
        ...leadData, 
        value: Number(leadData.value) || 0, 
        week: Number(leadData.week) || 1,
        lastUpdate: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
    else console.error("Erro ao salvar lead:", error);
  };

  const deleteLead = async (id) => {
    if(window.confirm("Atenção: Esta ação excluirá o card permanentemente. Confirmar?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  // --- LÓGICA DE ETIQUETAS ---
  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    saveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- FECHAMENTO DE MÊS / ARQUIVAMENTO ---
  const handleEndCycle = async () => {
    const monthName = window.prompt("Para arquivar, digite o nome deste ciclo (Ex: Fevereiro 2026):");
    if (!monthName) return;

    if (window.confirm(`Isso moverá todos os leads para o histórico sob o ciclo "${monthName}". Prosseguir?`)) {
      setLoading(true);
      const { error } = await supabase.from('leads').update({ isArchived: true, cycle_name: monthName }).eq('isArchived', false);
      if (!error) {
        setCommissionData({
          weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
          profitMargin: 0
        });
        await fetchLeads();
        alert("Ciclo encerrado com sucesso!");
      }
      setLoading(false);
    }
  };

  // --- CÁLCULOS TÉCNICOS DE MÉTRICAS ---
  const isStale = (date) => {
    if(!date) return false;
    const diff = Date.now() - new Date(date).getTime();
    return diff > (3 * 24 * 60 * 60 * 1000); // 3 dias sem mexer
  };

  const getMetrics = (filteredLeads) => {
    const won = filteredLeads.filter(l => l.stage === 'fechado');
    const total = filteredLeads.length;
    return {
      contacts: total,
      followUp: total > 0 ? (filteredLeads.filter(l => l.followUp).length / total) * 100 : 0,
      postSale: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      reactivated: filteredLeads.filter(l => l.reactivated && l.stage === 'fechado').length,
      crossSell: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      upSell: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0
    };
  };

  const getFarol = (v, m, isPercent = false, isCumulative = false) => {
    const target = isPercent ? parseFloat(m) : (isCumulative ? parseFloat(m) : parseFloat(m) / 4);
    const val = parseFloat(v);
    if (val >= target) return 'bg-green-500';
    if (val >= target * 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // --- LÓGICA DE COMISSÃO ---
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const activeWeeks = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = activeWeeks > 0 ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / activeWeeks) : 0;
  const revAchiPerc = (totalRevenue / (goals.revenue || 1)) * 100;
  
  let baseComm = revAchiPerc >= 110 ? 3.5 : revAchiPerc >= 100 ? 2.5 : revAchiPerc >= 90 ? 1.5 : 0;
  const currentMetrics = getMetrics(leads.filter(l => !l.isArchived));
  const profitValid = Number(commissionData.profitMargin) > 0;
  
  let bonusVar = profitValid ? (
    (avgTicketAchieved >= goals.ticket ? 0.5 : 0) + 
    (currentMetrics.crossSell >= goals.crossSell ? 0.5 : 0) + 
    (currentMetrics.upSell >= goals.upSell ? 0.5 : 0)
  ) : 0;

  const bonusFixoVal = currentMetrics.contacts >= goals.contacts && currentMetrics.followUp >= goals.followUp;
  const totalCommPercent = baseComm + bonusVar;
  const finalCommVal = (totalRevenue * (totalCommPercent / 100)) + (bonusFixoVal ? 300 : 0);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse uppercase tracking-widest">SalesPro: Carregando Engine...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-900">
      
      {/* CABEÇALHO E CONTROLES DE SEMANA */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
            <TrendingUp className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter">SalesPro <span className="text-blue-600">Cloud</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Control System</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1" />

          {['pipeline', 'metrics', 'commission', 'archive'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>
              {tab === 'archive' ? 'Histórico' : tab === 'metrics' ? 'Indicadores' : tab === 'commission' ? 'Comissão' : 'Pipeline'}
            </button>
          ))}
          
          <button onClick={handleEndCycle} className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-all group" title="Encerrar Mês">
            <Archive size={18} />
          </button>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
            <PlusCircle size={22} />
          </button>
        </div>
      </div>

      {/* LEGENDA DE ETIQUETAS (SISTEMA DE APOIO) */}
      {activeTab === 'pipeline' && (
        <div className="max-w-7xl mx-auto mb-8 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase border-r pr-6 border-slate-100">
            <Info size={16} className="text-blue-500" /> Legenda do Time:
          </div>
          {AVAILABLE_TAGS.map(tag => (
            <div key={tag.id} className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${tag.color} ring-4 ring-slate-50`} />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{tag.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* ABA 1: PIPELINE COMPLETO */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage && Number(l.week || 1) === currentWeek && !l.isArchived);
              const columnTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

              return (
                <div key={stage} className="bg-slate-200/30 p-4 rounded-[2rem] border-2 border-dashed border-slate-200/60 min-h-[700px]">
                  <div className="mb-6 px-1 flex justify-between items-end">
                    <div>
                      <h3 className="font-black text-[11px] uppercase text-slate-400 tracking-widest mb-1">{stage}</h3>
                      <p className="text-lg font-black text-slate-800 tracking-tighter">R$ {columnTotal.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] font-black bg-white text-blue-600 px-3 py-1 rounded-lg shadow-sm border border-slate-100">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-4">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className={`bg-white p-5 rounded-3xl shadow-sm border group transition-all hover:shadow-xl hover:-translate-y-1 relative ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'border-red-200 ring-2 ring-red-50 shadow-red-50' : 'border-slate-100'}`}>
                        <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-2 rounded-full opacity-0 group-hover:opacity-100 shadow-lg border hover:bg-red-500 hover:text-white transition-all z-10"><Trash2 size={14}/></button>
                        
                        {/* Exibição de Tags no Card */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {lead.tags?.split(',').filter(t => t).map(tagId => {
                            const tag = AVAILABLE_TAGS.find(at => at.id === tagId);
                            return tag && (
                              <div key={tagId} className={`px-2.5 py-1 rounded-lg text-[7px] font-black ${tag.light} border shadow-inner uppercase animate-in zoom-in duration-300`}>
                                {tag.label.split(' ')[0]}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <User size={10} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-600 uppercase">{lead.vendor}</span>
                          </div>
                          <select className="text-[9px] font-black border-none bg-blue-50 text-blue-700 rounded-lg px-2 py-1 cursor-pointer outline-none" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                          </select>
                        </div>

                        <h4 className="font-black text-sm text-slate-800 uppercase leading-tight mb-1">{lead.name}</h4>
                        <div className="flex items-center gap-1 text-green-600 font-black mb-4">
                          <DollarSign size={12} className="opacity-40" />
                          <input type="number" defaultValue={lead.value} className="bg-transparent w-full focus:outline-none text-sm" onBlur={(e) => saveLead({...lead, value: e.target.value})} />
                        </div>

                        {/* Campo de Notas Integrado */}
                        <div className="relative mb-4 group/note">
                          <FileText size={10} className="absolute left-2 top-2 text-slate-300" />
                          <textarea 
                            className="w-full text-[10px] p-2 pl-6 bg-slate-50 border-none rounded-xl resize-none font-medium text-slate-500 italic focus:ring-1 ring-blue-100 transition-all" 
                            rows="2" 
                            value={lead.notes || ''} 
                            onChange={(e) => saveLead({...lead, notes: e.target.value})} 
                            placeholder="Notas da negociação..." 
                          />
                        </div>

                        {/* CHECKLIST E ACÕES TÉCNICAS */}
                        <div className="pt-4 border-t border-slate-50 space-y-4">
                          <div>
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-2 flex items-center gap-1"><TagIcon size={10}/> Status da Ação:</p>
                            <div className="flex gap-3">
                              {AVAILABLE_TAGS.map(tag => (
                                <button 
                                  key={tag.id}
                                  onClick={() => toggleTag(lead, tag.id)}
                                  className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-125` : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                  title={tag.label}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => saveLead({...lead, followUp: !lead.followUp})} className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all ${lead.followUp ? 'bg-orange-500 text-white border-orange-600 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>Follow-up</button>
                            <button onClick={() => saveLead({...lead, postSale: !lead.postSale})} className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all ${lead.postSale ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>Pós-Venda</button>
                            <button onClick={() => saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all ${lead.hasCrossSell ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>Cross-Sell (C)</button>
                            <button onClick={() => saveLead({...lead, hasUpSell: !lead.hasUpSell})} className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all ${lead.hasUpSell ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>Up-Sell (U)</button>
                            <button onClick={() => saveLead({...lead, reactivated: !lead.reactivated})} className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all col-span-2 ${lead.reactivated ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>Lead Reativado (Recuperação)</button>
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

        {/* ABA 2: INDICADORES TÉCNICOS (COMPLETA) */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-slate-900 p-3 rounded-2xl text-white"><BarChart2 size={24}/></div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Performance Indicators (KPIs)</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border shadow-sm">Real-time Data Sync</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="p-8">Indicador Estratégico</th>
                  <th className="p-8 text-center">Meta do Ciclo</th>
                  {[1,2,3,4].map(w => <th key={w} className="p-8 text-center">S{w}</th>)}
                  <th className="p-8 text-center bg-blue-900">Média/Total</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                <IndicatorRow title="Volume de Contatos" meta={goals.contacts} val={currentMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(currentMetrics.contacts, goals.contacts, false, true)} />
                <IndicatorRow title="Taxa de Follow-up (%)" meta={goals.followUp+"%"} val={currentMetrics.followUp.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).followUp.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).followUp, goals.followUp, true) }))} fTotal={getFarol(currentMetrics.followUp, goals.followUp, true, true)} />
                <IndicatorRow title="Cross-Sell (Conversão %)" meta={goals.crossSell+"%"} val={currentMetrics.crossSell.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).crossSell.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).crossSell, goals.crossSell, true) }))} fTotal={getFarol(currentMetrics.crossSell, goals.crossSell, true, true)} />
                <IndicatorRow title="Up-Sell (Conversão %)" meta={goals.upSell+"%"} val={currentMetrics.upSell.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).upSell.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).upSell, goals.upSell, true) }))} fTotal={getFarol(currentMetrics.upSell, goals.upSell, true, true)} />
                <IndicatorRow title="Eficiência Pós-Venda (%)" meta={goals.postSale+"%"} val={currentMetrics.postSale.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).postSale.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).postSale, goals.postSale, true) }))} fTotal={getFarol(currentMetrics.postSale, goals.postSale, true, true)} />
                <IndicatorRow title="Leads Reativados" meta={goals.reactivated} val={currentMetrics.reactivated} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, goals.reactivated) }))} fTotal={getFarol(currentMetrics.reactivated, goals.reactivated, false, true)} />
              </tbody>
            </table>
          </div>
        )}

        {/* ABA 3: COMISSÃO E CALCULADORA FINANCEIRA */}
        {activeTab === 'commission' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-600 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform"><DollarSign size={120}/></div>
                <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Faturamento Realizado</p>
                <h3 className="text-7xl font-black tracking-tighter mb-8">R$ {totalRevenue.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-6 pt-8 border-t border-blue-400">
                  <div><p className="text-[10px] font-black uppercase opacity-60">Ticket Médio</p><p className="text-2xl font-black">R$ {avgTicketAchieved.toLocaleString()}</p></div>
                  <div><p className="text-[10px] font-black uppercase opacity-60">Atingimento Meta</p><p className="text-2xl font-black">{revAchiPerc.toFixed(1)}%</p></div>
                </div>
              </div>
              <div className="bg-white p-12 rounded-[3rem] border-4 border-green-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.3em] mb-4">Sua Comissão Prevista</p>
                <h3 className="text-8xl text-green-600 font-black tracking-tighter">R$ {finalCommVal.toLocaleString()}</h3>
                <div className="mt-8 bg-green-50 text-green-700 px-6 py-2 rounded-full font-black uppercase text-xs border border-green-200 shadow-sm animate-pulse">Taxa Total Aplicada: {totalCommPercent.toFixed(1)}%</div>
              </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl">
               <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                 <Target className="text-blue-500" size={24} />
                 <h3 className="text-sm font-black uppercase tracking-widest">Checklist de Performance e Bônus</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <BonusCheck label="Margem Financeira" status={profitValid} desc="Auditado pelo financeiro" />
                 <BonusCheck label="Meta Ticket Médio" status={avgTicketAchieved >= goals.ticket} desc={`Necessário: R$ ${goals.ticket}`} />
                 <BonusCheck label="Atividades Críticas" status={bonusFixoVal} desc="Contatos + Follow-ups" />
               </div>
            </div>

            {/* Configurações de Faturamento Semanal */}
            <div className="bg-white rounded-[3rem] border shadow-xl p-10">
               <h4 className="text-xs font-black uppercase text-blue-600 mb-8 flex items-center gap-2"><ClipboardList size={18}/> Lançamento Semanal de Vendas Brutas</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-10 border-b">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Meta de Faturamento Mensal (R$)</label>
                    <input type="number" className="w-full p-5 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none transition-all shadow-inner" value={goals.revenue} onChange={e => setGoals({...goals, revenue: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Meta de Ticket Médio (R$)</label>
                    <input type="number" className="w-full p-5 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none transition-all shadow-inner" value={goals.ticket} onChange={e => setGoals({...goals, ticket: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Margem de Lucro Declarada (%)</label>
                    <input type="number" className="w-full p-5 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none transition-all shadow-inner" value={commissionData.profitMargin} onChange={e => setCommissionData({...commissionData, profitMargin: e.target.value})} />
                  </div>
               </div>
               
               <table className="w-full">
                 <thead>
                   <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                     <th className="p-4 text-left">Semana</th>
                     <th className="p-4 text-left">Faturamento Realizado (R$)</th>
                     <th className="p-4 text-left">Ticket Médio Alcançado (R$)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {[1,2,3,4].map(w => (
                     <tr key={w} className="group hover:bg-slate-50/50 transition-colors">
                       <td className="p-6 font-black text-slate-400 uppercase text-[10px]">Semana {w}</td>
                       <td className="p-6">
                         <input type="number" className="w-full p-4 bg-slate-50 rounded-xl font-black border-none focus:ring-2 ring-blue-500 shadow-sm" placeholder="Ex: 25000" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} />
                       </td>
                       <td className="p-6">
                         <input type="number" className="w-full p-4 bg-slate-50 rounded-xl font-black border-none focus:ring-2 ring-blue-500 shadow-sm" placeholder="Ex: 4500" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} />
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA 4: HISTÓRICO DE CICLOS (ARQUIVADOS) */}
        {activeTab === 'archive' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-xl rotate-3"><Archive size={30}/></div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Histórico Consolidado</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Consulta de performance de meses anteriores</p>
                </div>
              </div>
              <div className="relative w-full md:w-[400px]">
                <input 
                  type="text" 
                  placeholder="Pesquisar ciclo (ex: Janeiro)..." 
                  className="w-full p-5 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none pl-14 shadow-inner"
                  onChange={(e) => setFilterCycle(e.target.value)}
                />
                <Calendar size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"/>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-8">Nome do Lead / Empresa</th>
                    <th className="p-8">Vendedor</th>
                    <th className="p-8 text-center">Contrato Fechado</th>
                    <th className="p-8 text-center">Ciclo Mensal</th>
                    <th className="p-8 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold uppercase text-slate-600">
                  {leads
                    .filter(l => l.isArchived)
                    .filter(l => !filterCycle || (l.cycle_name?.toLowerCase().includes(filterCycle.toLowerCase())))
                    .map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-8 font-black text-slate-800 text-sm tracking-tight">{lead.name}</td>
                        <td className="p-8"><span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black border border-blue-100">{lead.vendor}</span></td>
                        <td className="p-8 text-center font-black text-green-600 text-sm">R$ {Number(lead.value).toLocaleString()}</td>
                        <td className="p-8 text-center"><span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[9px] font-black">{lead.cycle_name || 'Geral'}</span></td>
                        <td className="p-8">
                          <div className="flex justify-center gap-6">
                            <button onClick={() => saveLead({...lead, isArchived: false, cycle_name: null})} className="text-blue-500 hover:scale-150 transition-transform active:scale-90" title="Restaurar para o Pipeline"><RotateCcw size={20}/></button>
                            <button onClick={() => deleteLead(lead.id)} className="text-red-300 hover:text-red-500 hover:scale-150 transition-transform"><Trash2 size={20}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {leads.filter(l => l.isArchived).length === 0 && (
                <div className="p-24 text-center">
                  <Archive size={60} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Nenhum registro no histórico</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO (DESIGN SYSTEM) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-[0_0_80px_rgba(0,0,0,0.4)] relative border-t-[16px] border-blue-600 animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black mb-10 uppercase text-slate-800 tracking-tighter flex items-center gap-3">
              <PlusCircle className="text-blue-600" size={30}/> Abrir Novo Lead
            </h2>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Nome Completo / Razão Social</label>
                <input placeholder="Ex: Alpha Corp Ltda" className="w-full p-6 rounded-[1.5rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Investimento (R$)</label>
                  <input type="number" placeholder="5000" className="w-full p-6 rounded-[1.5rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Consultor</label>
                  <select className="w-full p-6 rounded-[1.5rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                    <option>Vendedor 1</option>
                    <option>Vendedor 2</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Objetivos da Conta</label>
                <textarea placeholder="Resumo do primeiro contato..." className="w-full p-6 rounded-[1.5rem] border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all text-sm" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              </div>
              
              <button 
                onClick={async () => {
                  if(!newLead.name) return;
                  await saveLead({ ...newLead, week: currentWeek, stage: 'contato', isArchived: false, tags: '' });
                  setIsModalOpen(false);
                  setNewLead({name:'', value:'', vendor:'Vendedor 1', notes: '', tags: ''});
                }}
                className="w-full bg-blue-600 text-white p-7 rounded-[2rem] font-black uppercase shadow-2xl hover:bg-blue-700 hover:scale-[1.03] active:scale-95 transition-all text-md mt-6 tracking-widest"
              >
                Ativar Card no Pipeline
              </button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[11px] tracking-[0.3em] py-2 hover:text-slate-600 transition-colors">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES ATOMICOS AUXILIARES ---

const IndicatorRow = ({ title, meta, val, data, fTotal }) => (
  <tr className="hover:bg-slate-50/80 transition-all group">
    <td className="p-8">
      <div className="flex items-center gap-3">
        <ChevronRight size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
        <span className="font-black text-slate-700">{title}</span>
      </div>
    </td>
    <td className="p-8 text-center text-slate-300 font-bold italic tracking-tighter">Meta: {meta}</td>
    {data.map((d, i) => (
      <td key={i} className="p-8 text-center border-x border-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-3.5 h-3.5 rounded-full ${d.c} shadow-sm ring-4 ring-slate-50 transition-transform group-hover:scale-125`} />
          <span className="font-black text-[11px] text-slate-500">{d.v}</span>
        </div>
      </td>
    ))}
    <td className="p-8 text-center bg-blue-50/30 border-l-2 border-white">
      <div className="flex flex-col items-center gap-2">
        <div className={`w-5 h-5 rounded-full ${fTotal} shadow-lg shadow-green-100`} />
        <span className="font-black text-xl text-blue-900 tracking-tighter">{val}</span>
      </div>
    </td>
  </tr>
);

const BonusCheck = ({ label, status, desc }) => (
  <div className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${status ? 'bg-white/5 border-green-500/40 shadow-lg shadow-green-900/20' : 'bg-white/5 border-white/5 opacity-40'}`}>
    <div className="text-left">
      <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${status ? 'text-green-400' : 'text-slate-400'}`}>{label}</p>
      <p className="text-[9px] text-slate-500 font-bold italic tracking-tight">{desc}</p>
    </div>
    {status ? (
      <div className="w-7 h-7 bg-green-500 rounded-full shadow-lg flex items-center justify-center animate-in zoom-in duration-500">
        <CheckCircle2 size={16} className="text-white" />
      </div>
    ) : (
      <AlertCircle size={24} className="text-slate-700" />
    )}
  </div>
);
