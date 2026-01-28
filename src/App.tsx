import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, RotateCcw, Tag as TagIcon, Info
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

// Definição Global das Etiquetas
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA', color: 'bg-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'FOLLOW-UP', color: 'bg-amber-500', hover: 'hover:bg-amber-600', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'URGENTE', color: 'bg-red-500', hover: 'hover:bg-red-600', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMSystem() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState('');
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', notes: '', tags: '' });

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

  // --- CARREGAMENTO E REAL-TIME ---
  useEffect(() => {
    fetchLeads();
    const channel = supabase.channel('crm-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  const updateLeadValue = async (id, newValue) => {
    const { error } = await supabase.from('leads').update({ value: newValue }).eq('id', id);
    if (!error) fetchLeads();
  };

  const saveLead = async (leadData) => {
    const payload = { 
        ...leadData, 
        value: Number(leadData.value), 
        week: Number(leadData.week) || 1,
        lastUpdate: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
    else alert("Erro ao salvar: " + error.message);
  };

  const deleteLead = async (id) => {
    if(window.confirm("Excluir definitivamente este card?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  // --- LOGICA DE ETIQUETAS ---
  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    saveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- FECHAMENTO DE CICLO ---
  const handleEndCycle = async () => {
    const monthName = window.prompt("Digite o nome do ciclo para salvar (ex: Janeiro 2026):");
    if (!monthName) return;

    if (window.confirm(`Isso irá arquivar todos os leads ativos no ciclo "${monthName}". Prosseguir?`)) {
      try {
        setLoading(true);
        const { error } = await supabase.from('leads').update({ isArchived: true, cycle_name: monthName }).eq('isArchived', false);
        if (error) throw error;
        setCommissionData({
          weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
          profitMargin: 0
        });
        await fetchLeads();
        alert("Ciclo encerrado e histórico salvo!");
      } catch (e) { alert(e.message); } finally { setLoading(false); }
    }
  };

  // --- CÁLCULOS DE MÉTRICAS ---
  const isStale = (date) => date ? (Date.now() - new Date(date).getTime()) > (3 * 24 * 60 * 60 * 1000) : false;

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

  const getConversionData = () => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const countAtLeast = (stages) => activeLeads.filter(l => stages.includes(l.stage)).length;
    const cTotal = activeLeads.length;
    const cOrc = countAtLeast(['orcamento', 'negociacao', 'fechado']);
    const cNeg = countAtLeast(['negociacao', 'fechado']);
    const cFec = countAtLeast(['fechado']);
    const calc = (n, d) => (d > 0 ? (n / d) * 100 : 0).toFixed(1);
    
    return {
      totalConv: Number(calc(cFec, cTotal)),
      funnelData: [
        { label: "Contatos", count: cTotal, rate: "100%", color: "bg-blue-600" },
        { label: "Orçamentos", count: cOrc, rate: calc(cOrc, cTotal) + "%", color: "bg-blue-500" },
        { label: "Negociações", count: cNeg, rate: calc(cNeg, cOrc) + "%", color: "bg-blue-400" },
        { label: "Fechados", count: cFec, rate: calc(cFec, cNeg) + "%", color: "bg-green-500" }
      ]
    };
  };

  // --- LOGICA DE COMISSÃO COMPLETA ---
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const activeWeeksCount = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = activeWeeksCount > 0 ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / activeWeeksCount) : 0;
  const revenueAchievedPercent = (totalRevenue / (Number(goals.revenue) || 1)) * 100;
  
  let baseComm = revenueAchievedPercent >= 110 ? 3.5 : revenueAchievedPercent >= 100 ? 2.5 : revenueAchievedPercent >= 90 ? 1.5 : 0;
  const globalMetrics = getMetrics(leads.filter(l => !l.isArchived));
  const convData = getConversionData();
  const isProfitOk = Number(commissionData.profitMargin) > 0;
  
  let bonusVar = isProfitOk ? (
    (avgTicketAchieved >= goals.ticket ? 0.5 : 0) + 
    (convData.totalConv >= goals.conversion ? 0.5 : 0) + 
    (globalMetrics.crossSell >= goals.crossSell ? 0.5 : 0) + 
    (globalMetrics.upSell >= goals.upSell ? 0.5 : 0)
  ) : 0;

  const bonusFixo = globalMetrics.contacts >= goals.contacts && globalMetrics.followUp >= goals.followUp && globalMetrics.postSale >= goals.postSale && globalMetrics.reactivated >= goals.reactivated;
  const finalComm = (totalRevenue * ((baseComm + bonusVar) / 100)) + (bonusFixo ? 300 : 0);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse uppercase">SalesPro Cloud...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER PRINCIPAL */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black flex items-center gap-2"><TrendingUp className="text-blue-600" /> SalesPro</h1>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-3 py-1.5 rounded-lg font-black text-xs ${currentWeek === w ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>

          <div className="flex gap-1">
            {['pipeline', 'metrics', 'conversion', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'archive' ? 'Histórico' : tab === 'metrics' ? 'Indicadores' : tab === 'conversion' ? 'Funil' : tab === 'commission' ? 'Comissão' : 'Pipeline'}
              </button>
            ))}
            <button onClick={handleEndCycle} className="ml-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"><Archive size={14} /> Fechar Mês</button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg ml-2 hover:scale-110 transition-transform"><PlusCircle size={20} /></button>
        </div>
      </div>

      {/* LEGENDA DE ETIQUETAS (VISÍVEL NO PIPELINE) */}
      {activeTab === 'pipeline' && (
        <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4 p-4 bg-white rounded-2xl border shadow-sm items-center">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mr-4"><Info size={14}/> Legenda de Ações:</div>
          {AVAILABLE_TAGS.map(tag => (
            <div key={tag.id} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${tag.light} text-[9px] font-black`}>
              <div className={`w-2 h-2 rounded-full ${tag.color}`} /> {tag.label}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2">
        
        {/* ABA: PIPELINE COMPLETO */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage && (Number(l.week) === currentWeek || (!l.week && currentWeek === 1)) && !l.isArchived);
              const columnTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

              return (
                <div key={stage} className="bg-slate-200/40 p-3 rounded-2xl border-2 border-dashed border-slate-200 min-h-[600px]">
                  <div className="mb-4 space-y-2 px-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-[10px] uppercase text-slate-400">{stage}</h3>
                      <span className="text-[9px] font-bold bg-white px-2 py-1 rounded shadow-sm text-slate-500">{stageLeads.length}</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-700 bg-white/60 p-2 rounded-xl border border-white flex justify-between shadow-sm">
                      <span className="opacity-40 text-[8px] uppercase">Faturamento:</span>
                      <span>R$ {columnTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {stageLeads.map(lead => (
                    <div key={lead.id} className={`bg-white p-4 rounded-2xl shadow-sm border mb-3 relative group transition-all hover:shadow-xl ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'ring-2 ring-red-100 border-red-300' : 'border-slate-100'}`}>
                      <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-1.5 rounded-full opacity-0 group-hover:opacity-100 border shadow-md z-10 transition-all hover:bg-red-500 hover:text-white"><Trash2 size={12}/></button>
                      
                      {/* EXIBIÇÃO DAS ETIQUETAS NO CARD */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {lead.tags?.split(',').filter(t => t).map(tagId => {
                          const tag = AVAILABLE_TAGS.find(at => at.id === tagId);
                          return tag ? (
                            <div key={tagId} className={`px-2 py-0.5 rounded-full text-[7px] font-black ${tag.light} border shadow-sm uppercase animate-in fade-in zoom-in duration-300`}>
                              {tag.label}
                            </div>
                          ) : null;
                        })}
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{lead.vendor}</span>
                        <select className="text-[9px] font-black border-none bg-slate-100 rounded-lg px-2 py-1 cursor-pointer hover:bg-slate-200 transition-colors" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                          {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                      </div>

                      <div className="font-black text-sm mb-1 text-slate-800 uppercase tracking-tighter">{lead.name}</div>
                      <div className="font-black text-green-600 text-xs mb-3 flex items-center gap-1">
                        <span className="opacity-50">R$</span> 
                        <input type="number" defaultValue={lead.value} className="bg-transparent w-full focus:outline-none" onBlur={(e) => updateLeadValue(lead.id, parseFloat(e.target.value))} />
                      </div>

                      {/* NOTAS DO LEAD */}
                      <textarea className="w-full text-[10px] p-2 bg-slate-50 border-none rounded-xl resize-none font-medium mb-3 text-slate-500 italic" rows="2" value={lead.notes || ''} onChange={(e) => saveLead({...lead, notes: e.target.value})} placeholder="Sem notas..." />

                      {/* RODAPÉ DO CARD: SELEÇÃO DE ETIQUETAS E CHECKLISTS */}
                      <div className="pt-3 border-t space-y-3">
                        <div>
                          <p className="text-[7px] font-black text-slate-300 uppercase mb-2 flex items-center gap-1"><TagIcon size={8}/> Próximo Passo:</p>
                          <div className="flex gap-2.5">
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

                        <div className="grid grid-cols-2 gap-1 text-[7px] font-black uppercase">
                          <button onClick={() => saveLead({...lead, followUp: !lead.followUp})} className={`p-1.5 rounded-lg border transition-all ${lead.followUp ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-300 border-slate-100'}`}>Follow-up</button>
                          <button onClick={() => saveLead({...lead, postSale: !lead.postSale})} className={`p-1.5 rounded-lg border transition-all ${lead.postSale ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-300 border-slate-100'}`}>Pós-Venda</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ABA: INDICADORES TÉCNICOS */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                <tr>
                  <th className="p-6">Indicador de Performance</th>
                  <th className="p-6 text-center">Meta Mês</th>
                  {[1,2,3,4].map(w => <th key={w} className="p-6 text-center">Semana {w}</th>)}
                  <th className="p-6 text-center bg-blue-900 shadow-inner">Total Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold">
                <IndicatorRow title="Volume de Contatos" meta={goals.contacts} val={globalMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(globalMetrics.contacts, goals.contacts, false, true)} />
                <IndicatorRow title="Taxa de Follow-up (%)" meta={goals.followUp+"%"} val={globalMetrics.followUp.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).followUp.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).followUp, goals.followUp, true) }))} fTotal={getFarol(globalMetrics.followUp, goals.followUp, true, true)} />
                <IndicatorRow title="Reativados" meta={goals.reactivated} val={globalMetrics.reactivated} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, goals.reactivated) }))} fTotal={getFarol(globalMetrics.reactivated, goals.reactivated, false, true)} />
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: FUNIL DE CONVERSÃO */}
        {activeTab === 'conversion' && (
          <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] border shadow-2xl">
            <h3 className="text-2xl font-black mb-12 text-center uppercase tracking-widest text-slate-800 flex justify-center items-center gap-3"><BarChart2 className="text-blue-600" size={32}/> Funil de Vendas</h3>
            <div className="space-y-6">
              {getConversionData().funnelData.map((step, idx) => (
                <div key={idx} className="group">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2 px-4 transition-colors group-hover:text-blue-600">
                    <span>{step.label}</span>
                    <span>{step.count} leads ({step.rate})</span>
                  </div>
                  <div className="h-14 bg-slate-50 rounded-2xl overflow-hidden shadow-inner border border-slate-100 p-1">
                    <div className={`h-full ${step.color} rounded-xl transition-all duration-1000 ease-out flex items-center justify-end px-4 shadow-lg`} style={{ width: step.rate }}>
                       <span className="text-[10px] font-black text-white">{step.rate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 p-10 bg-slate-900 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl ring-8 ring-slate-50">
               <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Conversão Final</p>
                 <h4 className="text-6xl font-black text-green-400">{convData.totalConv}%</h4>
               </div>
               <Target size={80} className="text-blue-600 opacity-30" />
            </div>
          </div>
        )}

        {/* ABA: COMISSÃO E METAS */}
        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-600 p-10 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Faturamento Mensal</p>
                  <h3 className="text-5xl font-black mt-2 leading-none">R$ {totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="mt-8 flex justify-between items-end border-t border-blue-400 pt-6">
                   <div><p className="text-[9px] font-black uppercase opacity-60">Ticket Médio</p><p className="text-xl font-black">R$ {avgTicketAchieved.toLocaleString()}</p></div>
                   <div className="text-right"><p className="text-[9px] font-black uppercase opacity-60">Atingimento</p><p className="text-xl font-black">{revenueAchievedPercent.toFixed(1)}%</p></div>
                </div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border-4 border-green-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Comissão Prevista</p>
                <h3 className="text-7xl text-green-600 font-black leading-none">R$ {finalComm.toLocaleString()}</h3>
                <div className="mt-6 bg-green-50 px-4 py-2 rounded-full text-green-700 text-[10px] font-black uppercase">Taxa Aplicada: {(baseComm + bonusVar).toFixed(1)}%</div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
               <h3 className="text-xs font-black uppercase text-slate-500 mb-6 border-b border-slate-800 pb-2 flex items-center gap-2"><Target size={14}/> Checklist de Bônus</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <CheckItem label="Margem Financeira" status={isProfitOk} desc="Validado pelo Financeiro" />
                 <CheckItem label="Meta Ticket Médio" status={avgTicketAchieved >= goals.ticket} desc={`Mínimo: R$ ${goals.ticket}`} />
                 <CheckItem label="Indicadores Base" status={bonusFixo} desc="Follow-up e Pós-Venda" />
               </div>
            </div>

            <div className="bg-white rounded-[2rem] border shadow-xl p-8">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-blue-600">Meta Faturamento</label><input type="number" className="w-full p-4 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none" value={goals.revenue} onChange={e => setGoals({...goals, revenue: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-blue-600">Meta Ticket Médio</label><input type="number" className="w-full p-4 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none" value={goals.ticket} onChange={e => setGoals({...goals, ticket: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-blue-600">Margem Lucro (%)</label><input type="number" className="w-full p-4 border-2 rounded-2xl font-black bg-slate-50 focus:border-blue-500 outline-none" value={commissionData.profitMargin} onChange={e => setCommissionData({...commissionData, profitMargin: e.target.value})} /></div>
               </div>
               <table className="w-full">
                 <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                   <tr><th className="p-4">Período</th><th className="p-4">Entradas Realizadas (R$)</th><th className="p-4">Ticket do Período (R$)</th></tr>
                 </thead>
                 <tbody className="divide-y font-bold">
                   {[1,2,3,4].map(w => (
                     <tr key={w}>
                       <td className="p-4 text-slate-500 uppercase text-[10px]">Semana {w}</td>
                       <td className="p-4"><input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-black border-none focus:ring-2 ring-blue-500" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} /></td>
                       <td className="p-4"><input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-black border-none focus:ring-2 ring-blue-500" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA: HISTÓRICO DE CICLOS */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg"><Archive size={24}/></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Histórico Consolidado</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Leads arquivados por ciclo mensal</p>
                </div>
              </div>
              <div className="relative w-full md:w-96">
                <input 
                  type="text" 
                  placeholder="Pesquisar Ciclo (ex: Janeiro)..." 
                  className="w-full p-4 border-2 rounded-2xl font-bold bg-slate-50 focus:border-blue-500 outline-none pl-12 shadow-inner"
                  onChange={(e) => setFilterCycle(e.target.value)}
                />
                <Info size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-2xl border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-widest">
                  <tr>
                    <th className="p-6">Nome do Lead</th>
                    <th className="p-6">Consultor</th>
                    <th className="p-6">Valor Contrato</th>
                    <th className="p-6">Ciclo de Fechamento</th>
                    <th className="p-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold">
                  {leads
                    .filter(l => l.isArchived)
                    .filter(l => !filterCycle || (l.cycle_name?.toLowerCase().includes(filterCycle.toLowerCase())))
                    .map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-blue-500">
                        <td className="p-6 font-black text-slate-800 uppercase">{lead.name}</td>
                        <td className="p-6"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-blue-100">{lead.vendor}</span></td>
                        <td className="p-6 font-black text-green-600">R$ {Number(lead.value).toLocaleString()}</td>
                        <td className="p-6"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">{lead.cycle_name || 'Geral'}</span></td>
                        <td className="p-6 flex justify-center gap-4">
                          <button onClick={() => saveLead({...lead, isArchived: false, cycle_name: null})} className="text-blue-600 hover:scale-125 transition-transform" title="Restaurar"><RotateCcw size={18}/></button>
                          <button onClick={() => deleteLead(lead.id)} className="text-red-400 hover:scale-125 transition-transform"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {leads.filter(l => l.isArchived).length === 0 && (
                <div className="p-20 text-center flex flex-col items-center gap-4">
                  <Archive size={48} className="text-slate-200" />
                  <p className="text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Histórico de ciclos vazio</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR NOVO CARD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.3)] relative border-t-[12px] border-blue-600">
            <h2 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-tighter flex items-center gap-2"><PlusCircle className="text-blue-600"/> Novo Card no CRM</h2>
            <div className="space-y-5">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Nome do Cliente</label><input placeholder="Ex: Empresa Silva" className="w-full p-5 rounded-2xl border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Valor Estimado (R$)</label><input type="number" placeholder="Ex: 5000" className="w-full p-5 rounded-2xl border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Consultor Responsável</label><select className="w-full p-5 rounded-2xl border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Anotações Preliminares</label><textarea placeholder="Detalhes do primeiro contato..." className="w-full p-5 rounded-2xl border-2 font-black bg-slate-50 focus:border-blue-600 outline-none transition-all" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} /></div>
              
              <button 
                onClick={async () => {
                  if(!newLead.name) return;
                  await saveLead({ ...newLead, week: currentWeek, stage: 'contato', isArchived: false, tags: '' });
                  setIsModalOpen(false);
                  setNewLead({name:'', value:'', vendor:'Vendedor 1', notes: '', tags: ''});
                }}
                className="w-full bg-blue-600 text-white p-6 rounded-[1.5rem] font-black uppercase shadow-2xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-sm mt-4"
              >
                Ativar Card no Fluxo
              </button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest py-2 hover:text-slate-600 transition-colors">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES ESTILIZADOS ---
const IndicatorRow = ({ title, meta, val, data, fTotal }) => (
  <tr className="hover:bg-slate-50 transition-colors group border-b">
    <td className="p-6 font-black text-slate-700 uppercase text-[11px] tracking-tight">{title}</td>
    <td className="p-6 font-bold text-slate-300 text-center bg-slate-50/20 text-[9px] uppercase tracking-tighter">Meta: {meta}</td>
    {data.map((d, i) => (
      <td key={i} className="p-6 text-center">
        <div className="flex flex-col items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${d.c} shadow-sm transition-transform group-hover:scale-125`} /><span className="font-black text-[11px]">{d.v}</span></div>
      </td>
    ))}
    <td className="p-6 text-center bg-blue-50/40 border-l-2 border-white shadow-inner">
      <div className="flex flex-col items-center gap-1.5"><div className={`w-4 h-4 rounded-full ${fTotal} shadow-lg`} /><span className="font-black text-lg text-blue-900">{val}</span></div>
    </td>
  </tr>
);

const CheckItem = ({ label, status, desc }) => (
  <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all ${status ? 'bg-white/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}>
    <div className="text-left">
      <p className={`text-[10px] font-black uppercase tracking-widest ${status ? 'text-green-400' : 'text-slate-500'}`}>{label}</p>
      <p className="text-[9px] text-slate-500 font-bold italic">{desc}</p>
    </div>
    {status ? (
      <div className="w-5 h-5 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.6)] flex items-center justify-center animate-bounce">
        <Target size={10} className="text-white" />
      </div>
    ) : (
      <AlertCircle size={20} className="text-slate-700" />
    )}
  </div>
);
