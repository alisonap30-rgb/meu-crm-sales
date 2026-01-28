import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, RotateCcw, Tag
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

// Definição das Etiquetas Disponíveis (Estilo Pipedrive)
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
  { id: 'followup', label: 'FOLLOW-UP', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
  { id: 'urgente', label: 'URGENTE', color: 'bg-red-500', light: 'bg-red-50 text-red-600' },
  { id: 'reuniao', label: 'REUNIÃO', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
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
    weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
    profitMargin: 0
  });

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

  const handleEndCycle = async () => {
    const monthName = window.prompt("Digite o nome do ciclo (ex: Jan 26):");
    if (!monthName) return;
    if (window.confirm(`Encerrar o ciclo "${monthName}"?`)) {
      try {
        setLoading(true);
        const { error } = await supabase.from('leads').update({ isArchived: true, cycle_name: monthName }).eq('isArchived', false);
        if (error) throw error;
        setCommissionData({ weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } }, profitMargin: 0 });
        await fetchLeads();
      } catch (e) { alert(e.message); } finally { setLoading(false); }
    }
  };

  // Funções para manipular etiquetas
  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    saveLead({ ...lead, tags: currentTags.join(',') });
  };

  // HELPERS
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
    const cFec = countAtLeast(['fechado']);
    const calc = (n, d) => (d > 0 ? (n / d) * 100 : 0).toFixed(1);
    return {
      totalConv: Number(calc(cFec, cTotal)),
      funnelData: [
        { label: "Contatos", count: cTotal, rate: "100%", color: "bg-blue-600" },
        { label: "Fechados", count: cFec, rate: calc(cFec, cTotal) + "%", color: "bg-green-500" }
      ]
    };
  };

  const getFarol = (v, m, isP = false, isC = false) => {
    const target = isP ? parseFloat(m) : (isC ? parseFloat(m) : parseFloat(m) / 4);
    return v >= target ? 'bg-green-500' : 'bg-red-500';
  };

  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const revenueAchievedPercent = (totalRevenue / (Number(goals.revenue) || 1)) * 100;
  const globalMetrics = getMetrics(leads.filter(l => !l.isArchived));
  const convData = getConversionData();
  const isProfitOk = Number(commissionData.profitMargin) > 0;
  const finalComm = (totalRevenue * (2.5 / 100)); // Simplificado para manter o foco nas etiquetas

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse">CARREGANDO...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black flex items-center gap-2"><TrendingUp className="text-blue-600" /> SalesPro</h1>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-3 py-1.5 rounded-lg font-black text-xs ${currentWeek === w ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>

          <div className="flex gap-1">
            {['pipeline', 'metrics', 'conversion', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'archive' ? 'Histórico' : tab === 'metrics' ? 'Indicadores' : tab === 'conversion' ? 'Funil' : 'Pipeline'}
              </button>
            ))}
            <button onClick={handleEndCycle} className="ml-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase bg-red-50 text-red-600 border border-red-200 flex items-center gap-2"><Archive size={14} /> Fechar Mês</button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg ml-2"><PlusCircle size={20} /></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* PIPELINE COM ETIQUETAS */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage && (Number(l.week) === currentWeek || (!l.week && currentWeek === 1)) && !l.isArchived);
              const columnTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

              return (
                <div key={stage} className="bg-slate-200/40 p-3 rounded-2xl border-2 border-dashed border-slate-200 min-h-[500px]">
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-black text-[10px] uppercase text-slate-400">{stage}</h3>
                      <span className="text-[9px] font-bold bg-white px-2 py-1 rounded shadow-sm text-slate-50">{stageLeads.length}</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-700 bg-white/50 px-2 py-1 rounded border border-white flex justify-between">
                      <span className="opacity-50 text-[8px] uppercase">R$ {columnTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {stageLeads.map(lead => (
                    <div key={lead.id} className={`bg-white p-4 rounded-xl shadow-sm border mb-3 relative group transition-all hover:shadow-md ${isStale(lead.lastUpdate) ? 'border-red-200' : ''}`}>
                      <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 border shadow-sm z-10"><Trash2 size={12}/></button>
                      
                      {/* EXIBIÇÃO DAS ETIQUETAS NO CARD */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {lead.tags?.split(',').filter(t => t).map(tagId => {
                          const tag = AVAILABLE_TAGS.find(at => at.id === tagId);
                          return tag ? (
                            <span key={tagId} className={`${tag.color} w-8 h-1.5 rounded-full`} title={tag.label} />
                          ) : null;
                        })}
                      </div>

                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded">{lead.vendor}</span>
                        <select className="text-[9px] font-black border-none bg-slate-100 rounded px-1" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                          {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                      </div>

                      <div className="font-bold text-sm mb-2 leading-tight">{lead.name}</div>
                      <div className="font-black text-green-600 text-xs mb-3">R$ {Number(lead.value).toLocaleString()}</div>

                      {/* MENU DE SELEÇÃO DE ETIQUETAS */}
                      <div className="pt-2 border-t mt-2">
                        <p className="text-[7px] font-black text-slate-300 uppercase mb-2">Próxima Ação:</p>
                        <div className="flex gap-2">
                          {AVAILABLE_TAGS.map(tag => (
                            <button 
                              key={tag.id}
                              onClick={() => toggleTag(lead, tag.id)}
                              className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-sm scale-110` : 'border-slate-100 hover:border-slate-300'}`}
                              title={tag.label}
                            />
                          ))}
                        </div>
                      </div>

                      {/* NOTAS RÁPIDAS */}
                      <textarea className="w-full text-[10px] p-2 bg-slate-50 border-none rounded-lg mt-3 font-medium text-slate-500" rows="1" value={lead.notes || ''} onChange={(e) => saveLead({...lead, notes: e.target.value})} placeholder="Clique para anotar..." />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* INDICADORES */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                <tr>
                  <th className="p-6 text-center">Indicador</th>
                  <th className="p-6 text-center">Meta Mês</th>
                  {[1,2,3,4].map(w => <th key={w} className="p-6 text-center">S{w}</th>)}
                  <th className="p-6 text-center bg-blue-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold">
                <IndicatorRow title="Contatos" meta={goals.contacts} val={globalMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(globalMetrics.contacts, goals.contacts, false, true)} />
              </tbody>
            </table>
          </div>
        )}

        {/* HISTÓRICO */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            <input type="text" placeholder="Buscar ciclo (ex: Jan 26)..." className="p-3 border-2 rounded-xl font-bold text-sm w-full md:w-80" onChange={(e) => setFilterCycle(e.target.value)} />
            <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-black uppercase text-[9px]">
                  <tr><th className="p-4">Lead</th><th className="p-4">Vendedor</th><th className="p-4">Valor</th><th className="p-4">Ciclo</th><th className="p-4 text-center">Ações</th></tr>
                </thead>
                <tbody className="divide-y font-bold">
                  {leads.filter(l => l.isArchived).filter(l => !filterCycle || (l.cycle_name?.toLowerCase().includes(filterCycle.toLowerCase()))).map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="p-4 font-black">{lead.name}</td>
                      <td className="p-4 text-blue-500 uppercase">{lead.vendor}</td>
                      <td className="p-4 font-black text-green-600">R$ {Number(lead.value).toLocaleString()}</td>
                      <td className="p-4"><span className="bg-slate-100 text-slate-400 px-2 py-1 rounded text-[8px] uppercase font-black">{lead.cycle_name || 'Geral'}</span></td>
                      <td className="p-4 flex justify-center gap-3">
                        <button onClick={() => saveLead({...lead, isArchived: false, cycle_name: null})} className="text-blue-600"><RotateCcw size={16}/></button>
                        <button onClick={() => deleteLead(lead.id)} className="text-red-400"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL NOVO CARD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border-t-8 border-blue-600">
            <h2 className="text-xl font-black mb-6 uppercase text-slate-800 tracking-tighter">Novo Card de Lead</h2>
            <div className="space-y-4">
              <input placeholder="Nome do Cliente" className="w-full p-4 rounded-xl border-2 font-black" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              <input type="number" placeholder="Valor (R$)" className="w-full p-4 rounded-xl border-2 font-black" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
              <select className="w-full p-4 rounded-xl border-2 font-black bg-slate-50" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select>
              <button 
                onClick={async () => {
                  if(!newLead.name) return;
                  await saveLead({ ...newLead, week: currentWeek, stage: 'contato', isArchived: false, tags: '' });
                  setIsModalOpen(false);
                  setNewLead({name:'', value:'', vendor:'Vendedor 1', notes: '', tags: ''});
                }}
                className="w-full bg-blue-600 text-white p-5 rounded-xl font-black uppercase shadow-xl hover:bg-blue-700"
              >
                Gerar Card
              </button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px]">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTES AUXILIARES
const IndicatorRow = ({ title, meta, val, data, fTotal }) => (
  <tr className="hover:bg-slate-50 border-b">
    <td className="p-6 font-black text-slate-700">{title}</td>
    <td className="p-6 font-bold text-slate-300 text-center bg-slate-50/30 text-[9px] uppercase tracking-tighter">Meta: {meta}</td>
    {data.map((d, i) => (
      <td key={i} className="p-6 text-center">
        <div className="flex flex-col items-center gap-1.5"><div className={`w-3 h-3 rounded-full ${d.c}`} /><span className="font-black text-[11px]">{d.v}</span></div>
      </td>
    ))}
    <td className="p-6 text-center bg-blue-50/40 border-l">
      <div className="flex flex-col items-center gap-1.5"><div className={`w-4 h-4 rounded-full ${fTotal} shadow-sm`} /><span className="font-black text-lg text-blue-900">{val}</span></div>
    </td>
  </tr>
);

const CheckItem = ({ label, status, desc }) => (
  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
    <div className="text-left"><p className={`text-[10px] font-black uppercase ${status ? 'text-green-400' : 'text-red-400'}`}>{label}</p><p className="text-[9px] text-slate-500 font-bold">{desc}</p></div>
    {status ? <div className="w-3.5 h-3.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" /> : <AlertCircle size={16} className="text-red-500/50" />}
  </div>
);
