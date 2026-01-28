import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, RotateCcw, Tag as TagIcon, Info, CheckCircle2
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

// Definição Global das Etiquetas
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'FOLLOW-UP', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'URGENTE', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
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

  // --- FECHAMENTO DE CICLO (ENCERRAR MÊS) ---
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
        alert("Ciclo encerrado e histórico salvo com sucesso!");
      } catch (e) { alert(e.message); } finally { setLoading(false); }
    }
  };

  // --- CÁLCULOS E MÉTRICAS ---
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

  const getFarol = (v, m, isP = false, isC = false) => {
    const target = isP ? parseFloat(m) : (isC ? parseFloat(m) : parseFloat(m) / 4);
    const value = parseFloat(v);
    return value >= target ? 'bg-green-500' : 'bg-red-500';
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">CARREGANDO SISTEMA...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER COMPLETO */}
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
            <button onClick={handleEndCycle} className="ml-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"><Archive size={14} /> Encerrar Mês</button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg ml-2 hover:scale-110 transition-transform"><PlusCircle size={20} /></button>
        </div>
      </div>

      {/* LEGENDA DE ETIQUETAS */}
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
        
        {/* ABA: PIPELINE (COM TUDO INTEGRADO) */}
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
                      <span className="opacity-40 text-[8px] uppercase">R$</span>
                      <span>{columnTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {stageLeads.map(lead => (
                    <div key={lead.id} className={`bg-white p-4 rounded-2xl shadow-sm border mb-3 relative group transition-all hover:shadow-xl ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'ring-2 ring-red-100 border-red-300' : 'border-slate-100'}`}>
                      <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-1.5 rounded-full opacity-0 group-hover:opacity-100 border shadow-md z-10 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={12}/></button>
                      
                      {/* ETIQUETAS DO LEAD */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {lead.tags?.split(',').filter(t => t).map(tagId => {
                          const tag = AVAILABLE_TAGS.find(at => at.id === tagId);
                          return tag ? (
                            <div key={tagId} className={`px-2 py-0.5 rounded-full text-[7px] font-black ${tag.light} border shadow-sm uppercase`}>
                              {tag.label}
                            </div>
                          ) : null;
                        })}
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{lead.vendor}</span>
                        <select className="text-[9px] font-black border-none bg-slate-100 rounded-lg px-2 py-1" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                          {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                      </div>

                      <div className="font-black text-sm mb-1 text-slate-800 uppercase tracking-tighter leading-tight">{lead.name}</div>
                      <div className="font-black text-green-600 text-xs mb-3 flex items-center gap-1">
                        <span className="opacity-40 text-[10px]">R$</span> 
                        <input type="number" defaultValue={lead.value} className="bg-transparent w-full focus:outline-none" onBlur={(e) => updateLeadValue(lead.id, parseFloat(e.target.value))} />
                      </div>

                      <textarea className="w-full text-[10px] p-2 bg-slate-50 border-none rounded-xl resize-none font-medium mb-3 text-slate-500 italic" rows="2" value={lead.notes || ''} onChange={(e) => saveLead({...lead, notes: e.target.value})} placeholder="Clique para anotar..." />

                      {/* RODAPÉ: ETIQUETAS + INDICADORES DE CARD */}
                      <div className="pt-3 border-t space-y-3">
                        <div>
                          <p className="text-[7px] font-black text-slate-300 uppercase mb-2 flex items-center gap-1"><TagIcon size={8}/> Marcar Ação:</p>
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
                          <button onClick={() => saveLead({...lead, postSale: !lead.postSale})} className={`p-1.5 rounded-lg border transition-all ${lead.postSale ? 'bg-purple-600 text-white border-purple-700 shadow-sm' : 'bg-white text-slate-300 border-slate-100'}`}>Pós-Venda</button>
                          <button onClick={() => saveLead({...lead, reactivated: !lead.reactivated})} className={`p-1.5 rounded-lg border transition-all ${lead.reactivated ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-slate-300 border-slate-100'}`}>Reativado</button>
                          <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} className={`p-1.5 rounded-lg border transition-all ${lead.hasCrossSell ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-300 border-slate-100'}`}>C</button>
                            <button onClick={() => saveLead({...lead, hasUpSell: !lead.hasUpSell})} className={`p-1.5 rounded-lg border transition-all ${lead.hasUpSell ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-300 border-slate-100'}`}>U</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ABA: INDICADORES (COMPLETOS) */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[900px]">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                <tr>
