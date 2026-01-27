import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, RotateCcw
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
// A URL eu peguei da sua imagem, mas a KEY você precisa colar a nova
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializa o cliente apenas se houver chave, senão não quebra a tela inicial
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

export default function CRMSystem() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', notes: '' });

  // Função para salvar o novo valor no banco de dados
  const updateLeadValue = async (id: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ value: newValue })
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado local para refletir a mudança na hora
      setLeads(prev => prev.map(l => l.id === id ? { ...l, value: newValue } : l));
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    }
    const archiveAllLeads = async () => {
    const confirm = window.confirm("Deseja arquivar todos os leads deste ciclo?");
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ isArchived: true })
        .eq('isArchived', false);

      if (error) throw error;
      
      setLeads(prev => prev.map(l => ({ ...l, isArchived: true })));
      alert("Ciclo zerado e leads arquivados!");
    } catch (error) {
      console.error('Erro:', error);
    }
  };
  };
  // Metas e Dados
  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, conversion: 5, crossSell: 40, upSell: 15, 
    contacts: 400, followUp: 90, postSale: 100, reactivated: 20
  });

  const [commissionData, setCommissionData] = useState({
    weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
    profitMargin: 0
  });

  // CARREGAMENTO INICIAL
  useEffect(() => {
    if (SUPABASE_KEY === 'COLE_SUA_CHAVE_ANON_PUBLIC_AQUI') {
        alert("ATENÇÃO: Você precisa colar sua chave SUPABASE_KEY no código (linha 10) para o sistema funcionar!");
        setLoading(false);
        return;
    }
    fetchLeads();

    // Inscrição Real-time (atualiza a tela sozinho quando algo muda)
    const channel = supabase.channel('crm-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (error) {
        console.error("Erro Supabase:", error.message);
    } else {
        setLeads(data || []);
    }
    setLoading(false);
  };

  const saveLead = async (leadData) => {
    // Tratamento de segurança: garante que números sejam números e datas existam
    const payload = {
      ...leadData,
      week: Number(leadData.week) || 1, // Se vier sem semana, joga na semana 1
      value: Number(leadData.value),
      lastUpdate: new Date().toISOString()
    };

    const { error } = await supabase.from('leads').upsert(payload);
    
    if (error) {
      alert("Erro ao salvar no Banco: " + error.message);
    } else {
      fetchLeads();
    }
  };

  const deleteLead = async (id) => {
    if(window.confirm("Excluir definitivamente este card?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) alert("Erro ao excluir: " + error.message);
      else fetchLeads();
    }
  };

  // HELPERS (Cálculos visuais)
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
    return v >= target ? 'bg-green-500' : 'bg-red-500';
  };

  // CÁLCULOS COMISSÃO
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const activeWeeksCount = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = activeWeeksCount > 0 ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / activeWeeksCount) : 0;
  const revenueAchievedPercent = (totalRevenue / (Number(goals.revenue) || 1)) * 100;
  let baseComm = revenueAchievedPercent >= 110 ? 3.5 : revenueAchievedPercent >= 100 ? 2.5 : revenueAchievedPercent >= 90 ? 1.5 : 0;
  
  const globalMetrics = getMetrics(leads.filter(l => !l.isArchived));
  const convData = getConversionData();
  const isProfitOk = Number(commissionData.profitMargin) > 0;
  
  let bonusVar = isProfitOk ? ((avgTicketAchieved >= goals.ticket ? 0.5 : 0) + (convData.totalConv >= goals.conversion ? 0.5 : 0) + (globalMetrics.crossSell >= goals.crossSell ? 0.5 : 0) + (globalMetrics.upSell >= goals.upSell ? 0.5 : 0)) : 0;
  const bonusFixo = globalMetrics.contacts >= goals.contacts && globalMetrics.followUp >= goals.followUp && globalMetrics.postSale >= goals.postSale && globalMetrics.reactivated >= goals.reactivated;
  const finalComm = (totalRevenue * ((baseComm + bonusVar) / 100)) + (bonusFixo ? 300 : 0);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 uppercase tracking-widest animate-pulse">Carregando Vendas...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 text-left">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black flex items-center gap-2"><TrendingUp className="text-blue-600" /> SalesPro <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full uppercase">Cloud</span></h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-3 py-1.5 rounded-lg font-black text-xs ${currentWeek === w ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>
          {['pipeline', 'conversion', 'metrics', 'commission', 'archive'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
              {tab === 'archive' ? 'Arquivados' : tab === 'metrics' ? 'Histórico' : tab === 'conversion' ? 'Conversão' : tab === 'commission' ? 'Comissão' : 'Pipeline'}
            </button>
          ))}
       <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:rotate-90 transition-all"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={archiveAllLeads}
              className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition-all ml-2 shadow-sm"
            >
              ZERAR CICLO
            </button>
   </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => (
              <div key={stage} className="bg-slate-200/40 p-3 rounded-2xl border-2 border-dashed border-slate-200 min-h-[500px]">
                <div className="mb-4">
  <div className="flex justify-between items-center mb-1">
    <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-tighter">{stage}</h3>
    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
      {leads.filter(l => l.stage === stage && (Number(l.week) === currentWeek || (!l.week && currentWeek === 1))).length} leads
    </span>
  </div>
  <div className="text-[11px] font-black text-slate-600">
    Total: <span className="text-green-600">
      R$ {leads
        .filter(l => l.stage === stage && (Number(l.week) === currentWeek || (!l.week && currentWeek === 1)))
        .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    </span>
  </div>
</div>
                {/* FILTRO INTELIGENTE: Se lead não tem semana definida (undefined), assume 1 */}
                {leads.filter(l => l.stage === stage && (Number(l.week) === currentWeek || (!l.week && currentWeek === 1)) && !l.isArchived).map(lead => (
                  <div key={lead.id} className={`bg-white p-4 rounded-xl shadow-sm border mb-3 space-y-3 relative group transition-all ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'border-red-400 ring-2 ring-red-100' : ''}`}>
                    <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 border shadow-sm z-10"><Trash2 size={12}/></button>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded">{lead.vendor}</span>
                          {isStale(lead.lastUpdate) && stage !== 'fechado' && <span className="bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded animate-pulse">PARADO</span>}
                        </div>
                        <select className="text-[9px] font-black border-none bg-slate-100 rounded px-1" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                          {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="font-bold text-sm">{lead.name}</div>
                    <div className="flex items-center gap-1 group">
  <span className="text-green-600 font-black text-xs">R$</span>
  <input
    type="number"
    defaultValue={lead.value}
    className="bg-transparent border-b border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none w-20 font-black text-green-600 text-xs transition-all cursor-pointer"
    onBlur={(e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val !== lead.value) {
        updateLeadValue(lead.id, val);
      }
    }}
  />
</div>
                    <textarea className="w-full text-[10px] p-2 bg-slate-50 border-none rounded-lg resize-none font-medium" rows="3" value={lead.notes || ''} onChange={(e) => saveLead({...lead, notes: e.target.value})} placeholder="Notas..." />
                    <div className="grid grid-cols-2 gap-1 pt-2 border-t text-[7px] font-black">
                      <button onClick={() => saveLead({...lead, followUp: !lead.followUp})} className={`p-1.5 rounded ${lead.followUp ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>FOLLOW-UP</button>
                      <button onClick={() => saveLead({...lead, postSale: !lead.postSale})} className={`p-1.5 rounded ${lead.postSale ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-400'}`}>PÓS-VENDA</button>
                      <button onClick={() => saveLead({...lead, reactivated: !lead.reactivated})} className={`p-1.5 rounded ${lead.reactivated ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}>REATIVADO</button>
                      <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} className={`p-1 rounded ${lead.hasCrossSell ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>C</button>
                        <button onClick={() => saveLead({...lead, hasUpSell: !lead.hasUpSell})} className={`p-1 rounded ${lead.hasUpSell ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>U</button>
                      </div>
                    </div>
                    <button onClick={() => saveLead({...lead, isArchived: true})} className="w-full py-1 text-[8px] font-black text-slate-300 uppercase hover:text-slate-600 border-t mt-2">Arquivar</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* HISTÓRICO / METRICS - VERSÃO COMPLETA */}
{activeTab === 'metrics' && (
  <div className="bg-white rounded-3xl shadow-xl border overflow-x-auto">
    <table className="w-full text-left text-sm min-w-[800px]">
      <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
        <tr>
          <th className="p-6">Indicador</th>
          <th className="p-6 text-center">Meta Mês</th>
          {[1,2,3,4].map(w => <th key={w} className="p-6 text-center">S{w}</th>)}
          <th className="p-6 text-center bg-blue-900">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y font-bold">
        <IndicatorRow title="Contatos" meta={goals.contacts} val={globalMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(globalMetrics.contacts, goals.contacts, false, true)} />
        
        <IndicatorRow title="Follow-up (%)" meta={goals.followUp+"%"} val={globalMetrics.followUp.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).followUp.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).followUp, goals.followUp, true) }))} fTotal={getFarol(globalMetrics.followUp, goals.followUp, true, true)} />
        
        <IndicatorRow title="Pós-Venda (%)" meta={goals.postSale+"%"} val={globalMetrics.postSale.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).postSale.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).postSale, goals.postSale, true) }))} fTotal={getFarol(globalMetrics.postSale, goals.postSale, true, true)} />
        
        <IndicatorRow title="Reativados" meta={goals.reactivated} val={globalMetrics.reactivated} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).reactivated, c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).reactivated, goals.reactivated) }))} fTotal={getFarol(globalMetrics.reactivated, goals.reactivated, false, true)} />

        {/* NOVAS LINHAS ADICIONADAS ABAIXO */}
        <IndicatorRow title="Cross Sell (%)" meta={goals.crossSell+"%"} val={globalMetrics.crossSell.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).crossSell.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).crossSell, goals.crossSell, true) }))} fTotal={getFarol(globalMetrics.crossSell, goals.crossSell, true, true)} />
        
        <IndicatorRow title="Up Sell (%)" meta={goals.upSell+"%"} val={globalMetrics.upSell.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).upSell.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).upSell, goals.upSell, true) }))} fTotal={getFarol(globalMetrics.upSell, goals.upSell, true, true)} />
      </tbody>
    </table>
  </div>
)}
        {activeTab === 'metrics' && (
           <div className="bg-white rounded-3xl shadow-xl border overflow-x-auto">
             <table className="w-full text-left text-sm min-w-[800px]">
               <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                 <tr><th className="p-6">Indicador</th><th className="p-6 text-center">Meta Mês</th>{[1,2,3,4].map(w => <th key={w} className="p-6 text-center">S{w}</th>)}<th className="p-6 text-center bg-blue-900">Total</th></tr>
               </thead>
               <tbody className="divide-y font-bold">
                 <IndicatorRow title="Contatos" meta={goals.contacts} val={globalMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(globalMetrics.contacts, goals.contacts, false, true)} />
                 <IndicatorRow title="Follow-up (%)" meta={goals.followUp+"%"} val={globalMetrics.followUp.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).followUp.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).followUp, goals.followUp, true) }))} fTotal={getFarol(globalMetrics.followUp, goals.followUp, true, true)} />
                 <IndicatorRow title="Pós-Venda (%)" meta={goals.postSale+"%"} val={globalMetrics.postSale.toFixed(1)+"%"} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).postSale.toFixed(1)+"%", c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).postSale, goals.postSale, true) }))} fTotal={getFarol(globalMetrics.postSale, goals.postSale, true, true)} />
                 <IndicatorRow title="Reativados" meta={goals.reactivated} val={globalMetrics.reactivated} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).reactivated, c: getFarol(getMetrics(leads.filter(l => Number(l.week) === w && !l.isArchived)).reactivated, goals.reactivated) }))} fTotal={getFarol(globalMetrics.reactivated, goals.reactivated, false, true)} />
               </tbody>
             </table>
           </div>
        )}

        {/* CONVERSÃO */}
        {activeTab === 'conversion' && (
          <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl border shadow-xl">
            <h3 className="text-xl font-black flex items-center gap-2 mb-8"><BarChart2 className="text-blue-600" /> Funil de Conversão</h3>
            <div className="space-y-6">
              {getConversionData().funnelData.map((step, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1 px-1"><span>{step.label}</span><span>{step.count} ({step.rate})</span></div>
                  <div className="h-10 bg-slate-100 rounded-xl overflow-hidden shadow-inner relative">
                    <div className={`h-full ${step.color} transition-all duration-1000`} style={{ width: step.rate }} />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference uppercase">{step.rate}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white flex justify-between items-center">
                 <div><p className="text-[10px] font-black text-slate-400 uppercase">Conversão Final</p><h4 className="text-4xl font-black text-green-400">{convData.totalConv}%</h4></div>
                 <Target size={40} className="opacity-20" />
            </div>
          </div>
        )}

        {/* COMISSÃO */}
        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl flex justify-between items-center">
                <div><p className="text-[10px] font-black uppercase opacity-70">Atingimento: {revenueAchievedPercent.toFixed(1)}%</p><h3 className="text-4xl font-black mt-2">R$ {totalRevenue.toLocaleString()}</h3></div>
                <div className="text-right font-black"><p className="text-[10px] uppercase opacity-70">Ticket Médio</p><p className="text-xl">R$ {avgTicketAchieved.toLocaleString()}</p></div>
              </div>
              <div className="bg-white p-8 rounded-3xl border-4 border-green-500 text-center font-black shadow-xl">
                <p className="text-[10px] text-slate-400 uppercase">Comissão Estimada</p>
                <h3 className="text-5xl text-green-600 my-1">R$ {finalComm.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-400 uppercase">Total: {(baseComm + bonusVar).toFixed(1)}%</p>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white">
               <h3 className="text-xs font-black uppercase text-slate-500 mb-6 border-b border-slate-800 pb-2">Checklist de Bônus</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <CheckItem label="Margem Financeira" status={isProfitOk} desc="Validado" />
                 <CheckItem label="Meta Ticket Médio" status={avgTicketAchieved >= goals.ticket && isProfitOk} desc={`Mínimo: R$ ${goals.ticket}`} />
                 <CheckItem label="Meta Conversão" status={convData.totalConv >= goals.conversion && isProfitOk} desc={`Mínimo: ${goals.conversion}%`} />
                 <CheckItem label="Meta Cross Sell" status={globalMetrics.crossSell >= goals.crossSell && isProfitOk} desc={`Mínimo: ${goals.crossSell}%`} />
                 <CheckItem label="Meta Up Sell" status={globalMetrics.upSell >= goals.upSell && isProfitOk} desc={`Mínimo: ${goals.upSell}%`} />
                 <CheckItem label="Bônus Fixo R$ 300" status={bonusFixo} desc="Garantir 4 Indicadores" />
               </div>
            </div>

             <div className="bg-white rounded-3xl border shadow-xl p-6 overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                   <tr><th className="p-4">Semana</th><th className="p-4">Faturamento Real (R$)</th><th className="p-4">Ticket Médio (R$)</th></tr>
                 </thead>
                 <tbody className="divide-y font-bold">
                   {[1,2,3,4].map(w => (
                     <tr key={w}>
                       <td className="p-4 text-slate-500 uppercase text-xs">Semana {w}</td>
                       <td className="p-4"><input type="number" className="w-full p-2 bg-slate-50 rounded-lg border font-black" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} /></td>
                       <td className="p-4"><input type="number" className="w-full p-2 bg-slate-50 rounded-lg border font-black" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t font-black">
                  <div><label className="text-[9px] uppercase text-blue-600">Meta Faturamento</label><input type="number" className="w-full p-3 border rounded-xl bg-slate-50" value={goals.revenue} onChange={e => setGoals({...goals, revenue: e.target.value})} /></div>
                  <div><label className="text-[9px] uppercase text-blue-600">Margem (%)</label><input type="number" className="w-full p-3 border rounded-xl bg-slate-50" value={commissionData.profitMargin} onChange={e => setCommissionData({...commissionData, profitMargin: e.target.value})} /></div>
                  <div><label className="text-[9px] uppercase text-blue-600">Meta Ticket</label><input type="number" className="w-full p-3 border rounded-xl bg-slate-50" value={goals.ticket} onChange={e => setGoals({...goals, ticket: e.target.value})} /></div>
               </div>
            </div>
          </div>
        )}

        {/* ARQUIVADOS */}
        {activeTab === 'archive' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center font-black uppercase"><h3>Arquivo de Cards</h3><Archive size={20}/></div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b font-black text-slate-400 uppercase tracking-tighter">
                <tr><th className="p-4">Lead</th><th className="p-4">Vendedor</th><th className="p-4">Valor</th><th className="p-4">Ações</th></tr>
              </thead>
              <tbody className="divide-y font-bold">
                {leads.filter(l => l.isArchived).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">{lead.name}</td>
                    <td className="p-4 text-blue-600">{lead.vendor}</td>
                    <td className="p-4">R$ {Number(lead.value).toLocaleString()}</td>
                    <td className="p-4 flex gap-2">
                      <button onClick={() => saveLead({...lead, isArchived: false})} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase flex items-center gap-1"><RotateCcw size={12}/> Restaurar</button>
                      <button onClick={() => deleteLead(lead.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NOVO CARD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-xl font-black mb-6 uppercase text-slate-800">Novo Card na Rede</h2>
            <div className="space-y-4">
              <select className="w-full p-4 rounded-xl border-2 font-black bg-slate-50" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select>
              <input placeholder="Nome do Cliente" className="w-full p-4 rounded-xl border-2 font-black" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              <input type="number" placeholder="Valor (R$)" className="w-full p-4 rounded-xl border-2 font-black" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
              <textarea placeholder="Notas iniciais..." className="w-full p-4 rounded-xl border-2 font-black" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              <button 
                onClick={async () => {
                    if(!newLead.name) return;
                    await saveLead({
                      name: newLead.name,
                      value: newLead.value,
                      vendor: newLead.vendor,
                      notes: newLead.notes,
                      week: currentWeek, // Garante que a semana esteja certa
                      stage: 'contato',
                      isArchived: false,
                      followUp: false, postSale: false, reactivated: false, hasCrossSell: false, hasUpSell: false
                    });
                    setIsModalOpen(false);
                    setNewLead({name:'', value:'', vendor:'Vendedor 1', notes: ''});
                }}
                className="w-full bg-blue-600 text-white p-5 rounded-xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all"
              >
                Cadastrar Card
              </button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] mt-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IndicatorRow = ({ title, meta, val, data, fTotal }) => (
  <tr className="hover:bg-slate-50 border-b border-slate-50">
    <td className="p-6 font-black text-slate-700">{title}</td>
    <td className="p-6 font-bold text-slate-400 text-center bg-slate-50/30 text-[10px] uppercase">Meta: {meta}</td>
    {data.map((d, i) => (
      <td key={i} className="p-6 text-center">
        <div className="flex flex-col items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${d.c}`} /><span className="font-black text-[11px]">{d.v}</span></div>
      </td>
    ))}
    <td className="p-6 text-center bg-blue-50/40">
      <div className="flex flex-col items-center gap-1.5"><div className={`w-3.5 h-3.5 rounded-full ${fTotal}`} /><span className="font-black text-lg text-blue-900">{val}</span></div>
    </td>
  </tr>
);

const CheckItem = ({ label, status, desc }) => (
  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
    <div className="text-left"><p className={`text-[10px] font-black uppercase ${status ? 'text-green-400' : 'text-red-400'}`}>{label}</p><p className="text-[9px] text-slate-500 font-bold">{desc}</p></div>
    {status ? <div className="w-3.5 h-3.5 bg-green-500 rounded-full" /> : <AlertCircle size={16} className="text-red-500/50" />}
  </div>
);

