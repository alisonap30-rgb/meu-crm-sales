import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, RotateCcw 
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'chave-vazia');

export default function CRMSystem() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', notes: '' });

  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, conversion: 5, crossSell: 40, upSell: 15, 
    contacts: 400, followUp: 90, postSale: 100, reactivated: 20
  });

  const [commissionData, setCommissionData] = useState({
    weeks: { 1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 }, 3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 } },
    profitMargin: 0
  });

  // CARREGAMENTO E REAL-TIME
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
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, value: newValue } : l));
  };

  const saveLead = async (leadData) => {
    const payload = { ...leadData, value: Number(leadData.value), lastUpdate: new Date().toISOString() };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
  };

  const deleteLead = async (id) => {
    if(window.confirm("Excluir definitivamente este card?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  const archiveAllLeads = async () => {
    if (!window.confirm("Deseja arquivar todos os leads deste ciclo?")) return;
    const { error } = await supabase.from('leads').update({ isArchived: true }).eq('isArchived', false);
    if (!error) fetchLeads();
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

  // CÁLCULOS COMISSÃO
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const activeWeeksCount = Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length;
  const avgTicketAchieved = activeWeeksCount > 0 ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / activeWeeksCount) : 0;
  const revenueAchievedPercent = (totalRevenue / (Number(goals.revenue) || 1)) * 100;
  let baseComm = revenueAchievedPercent >= 110 ? 3.5 : revenueAchievedPercent >= 100 ? 2.5 : revenueAchievedPercent >= 90 ? 1.5 : 0;
  const globalMetrics = getMetrics(leads.filter(l => !l.isArchived));
  const convData = getConversionData();
  const isProfitOk = Number(commissionData.profitMargin) > 0;
  let bonusVar = isProfitOk ? ((avgTicketAchieved >= goals.ticket ? 0.5 : 0) + (convData.totalConv >= goals.conversion ? 0.5 : 0)) : 0;
  const bonusFixo = globalMetrics.contacts >= goals.contacts && globalMetrics.followUp >= goals.followUp;
  const finalComm = (totalRevenue * ((baseComm + bonusVar) / 100)) + (bonusFixo ? 300 : 0);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 animate-pulse uppercase">Carregando SalesPro...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-black flex items-center gap-2"><TrendingUp className="text-blue-600" /> SalesPro <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full uppercase">Cloud</span></h1>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-3 py-1.5 rounded-lg font-black text-xs ${currentWeek === w ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>

          <div className="flex gap-1">
            {['pipeline', 'metrics', 'conversion', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'archive' ? 'Arquivados' : tab === 'metrics' ? 'Histórico' : tab === 'conversion' ? 'Conversão' : tab === 'commission' ? 'Comissão' : 'Pipeline'}
              </button>
            ))}
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:rotate-90 transition-all ml-2">
            <PlusCircle size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => (
              <div key={stage} className="bg-slate-200/40 p-3 rounded-2xl border-2 border-dashed border-slate-200 min-h-[500px]">
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="font-black text-[10px] uppercase text-slate-400">{stage}</h3>
                  <span className="text-[9px] font-bold bg-white px-2 py-1 rounded shadow-sm text-slate-500">
                    {leads.filter(l => l.stage === stage && Number(l.week || 1) === currentWeek && !l.isArchived).length}
                  </span>
                </div>

                {leads.filter(l => l.stage === stage && Number(l.week || 1) === currentWeek && !l.isArchived).map(lead => (
                  <div key={lead.id} className={`bg-white p-4 rounded-xl shadow-sm border mb-3 relative group transition-all ${isStale(lead.lastUpdate) && stage !== 'fechado' ? 'border-red-400 ring-2 ring-red-100' : ''}`}>
                    <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 border shadow-sm z-10"><Trash2 size={12}/></button>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded">{lead.vendor}</span>
                      <select className="text-[9px] font-black border-none bg-slate-100 rounded px-1" value={lead.stage} onChange={(e) => saveLead({...lead, stage: e.target.value})}>
                        {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="font-bold text-sm mb-2">{lead.name}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-black text-xs">R$</span>
                      <input type="number" defaultValue={lead.value} className="bg-transparent font-black text-green-600 text-xs w-20 focus:outline-none" onBlur={(e) => updateLeadValue(lead.id, parseFloat(e.target.value))} />
                    </div>
                    <button onClick={() => saveLead({...lead, isArchived: true})} className="w-full py-1 text-[8px] font-black text-slate-300 uppercase hover:text-red-400 border-t mt-3">Arquivar</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* MÉTRICAS / HISTÓRICO */}
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
                <IndicatorRow title="Contatos" meta={goals.contacts} val={globalMetrics.contacts} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).contacts, goals.contacts) }))} fTotal={getFarol(globalMetrics.contacts, goals.contacts, false, true)} />
                <IndicatorRow title="Reativados" meta={goals.reactivated} val={globalMetrics.reactivated} data={[1,2,3,4].map(w => ({ v: getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, c: getFarol(getMetrics(leads.filter(l => Number(l.week || 1) === w && !l.isArchived)).reactivated, goals.reactivated) }))} fTotal={getFarol(globalMetrics.reactivated, goals.reactivated, false, true)} />
              </tbody>
            </table>
          </div>
        )}

        {/* ARQUIVADOS */}
        {activeTab === 'archive' && (
          <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center font-black uppercase">
              <h3>Arquivo de Cards</h3>
              <button onClick={archiveAllLeads} className="bg-red-500 text-[10px] px-3 py-1 rounded hover:bg-red-600 transition-colors">Zerar Ciclo Atual</button>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y font-bold">
                {leads.filter(l => l.isArchived).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50">
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
              <button 
                onClick={async () => {
                  if(!newLead.name) return;
                  await saveLead({ ...newLead, week: currentWeek, stage: 'contato', isArchived: false });
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
}

// COMPONENTES AUXILIARES
const IndicatorRow = ({ title, meta, val, data, fTotal }) => (
  <tr className="hover:bg-slate-50">
    <td className="p-6 font-black text-slate-700">{title}</td>
    <td className="p-6 font-bold text-slate-400 text-center bg-slate-50/30 text-[10px] uppercase">Meta: {meta}</td>
    {data.map((d, i) => (
      <td key={i} className="p-6 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className={`w-3 h-3 rounded-full ${d.c}`} />
          <span className="font-black text-[11px]">{d.v}</span>
        </div>
      </td>
    ))}
    <td className="p-6 text-center bg-blue-50/40">
      <div className="flex flex-col items-center gap-1.5">
        <div className={`w-3.5 h-3.5 rounded-full ${fTotal}`} />
        <span className="font-black text-lg text-blue-900">{val}</span>
      </div>
    </td>
  </tr>
);
