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
  Globe, LayoutDashboard, ListChecks, ArrowRightCircle, Scale
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÃO SUPABASE ---
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// =============================================================================
// --- ESTRUTURAS DE DADOS ---
// =============================================================================

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', desc: 'Leads iniciais' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', desc: 'Propostas enviadas' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', desc: 'Ajuste de valores' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', desc: 'Venda convertida' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', desc: 'Oportunidade perdida' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700' }
];

export default function CRMMasterFinalUltra() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [goals, setGoals] = useState({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 8, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 } } as any,
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- BUSCA DE DADOS ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) await supabase.from('leads').update(payload).eq('id', id);
  };

  // --- LÓGICA DE DRAG AND DROP ---
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("leadId", id);
  };

  const onDrop = (e: React.DragEvent, newStage: string) => {
    const id = e.dataTransfer.getData("leadId");
    updateLead(id, { stage: newStage });
  };

  // ===========================================================================
  // --- MOTOR DE CÁLCULOS (ANALYTICS) ---
  // ===========================================================================

  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    
    // FILTRO DE BUSCA CONSERTADO
    const searched = active.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const won = active.filter(l => l.stage === 'fechado');
    
    // TOTAIS POR ETAPA DO FUNIL
    const funnelSteps = {
      prospecção: active.length,
      orçamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociação: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: active.filter(l => l.stage === 'perdido').length
    };

    // KPIs DE PROCESSO
    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      fup: funnelSteps.orçamento > 0 ? (active.filter(l => l.followUp).length / funnelSteps.orçamento) * 100 : 0,
      conv: active.length > 0 ? (won.length / active.length) * 100 : 0
    };

    // REGRAS DE COMISSÃO
    const totalRev = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRev / goals.revenue) * 100;
    const isMarginOk = commSettings.profitMargin >= 12;

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const bonus_conv = kpis.conv >= goals.conversion ? 0.5 : 0;
    const bonus_cross = kpis.cross >= goals.crossSell ? 0.5 : 0;
    const bonus_up = kpis.up >= goals.upSell ? 0.5 : 0;
    const finalRate = isMarginOk ? (baseRate + bonus_conv + bonus_cross + bonus_up) : 0;
    
    const fixedBonus = funnelSteps.prospecção >= goals.contacts ? 300 : 0;
    const totalComm = (totalRev * (finalRate / 100)) + fixedBonus;

    return { searched, funnelSteps, kpis, totalRev, revPerf, finalRate, totalComm, isMarginOk, fixedBonus };
  }, [leads, searchTerm, commSettings, goals]);

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-white font-black italic animate-pulse">CARREGANDO ENGINE...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 text-[11px]">
      
      {/* HEADER COMPACTO */}
      <header className="max-w-[1800px] mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-slate-950 p-3 rounded-2xl text-blue-500 shadow-lg"><TrendingUp size={24}/></div>
          <h1 className="text-3xl font-black italic tracking-tighter">ULTRA<span className="text-blue-600">CRM</span></h1>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-full shadow-sm border">
          {['pipeline', 'metrics', 'funnel', 'commission'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-2 rounded-full font-black uppercase text-[9px] transition-all ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>
              {t}
            </button>
          ))}
          <div className="relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12}/>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar Lead..." className="pl-8 pr-4 py-2 bg-slate-100 rounded-full outline-none w-40 focus:w-60 transition-all font-bold" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full hover:rotate-90 transition-all"><PlusCircle size={20}/></button>
        </div>
      </header>

      {/* VIEW: PIPELINE COM DRAG & DROP E TOTALIZADORES */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[calc(100-200px)]">
          {STAGES.map(stage => {
            const stageLeads = analytics.searched.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
            const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

            return (
              <div 
                key={stage.id} 
                onDragOver={e => e.preventDefault()} 
                onDrop={e => onDrop(e, stage.id)}
                className="bg-slate-200/50 rounded-[2rem] p-4 flex flex-col border border-dashed border-slate-300"
              >
                {/* TOTALIZADOR DE COLUNA */}
                <div className="mb-4 px-2">
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-black uppercase text-slate-500 tracking-widest text-[9px]">{stage.label}</span>
                    <span className="bg-white px-2 py-0.5 rounded text-[8px] font-bold border">{stageLeads.length}</span>
                  </div>
                  <div className="text-lg font-black italic text-slate-800 tracking-tighter">
                    R$ {stageTotal.toLocaleString('pt-BR')}
                  </div>
                  <div className={`h-1 w-full mt-2 rounded-full ${stage.color} opacity-30`} />
                </div>

                <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                  {stageLeads.map(lead => (
                    <div 
                      key={lead.id} 
                      draggable 
                      onDragStart={e => onDragStart(e, lead.id)}
                      className="bg-white p-4 rounded-3xl shadow-sm border-2 border-white hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-slate-900 uppercase leading-none truncate pr-4">{lead.name}</h4>
                        <button onClick={() => supabase?.from('leads').delete().eq('id', lead.id).then(fetchLeads)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                      </div>
                      <div className="text-emerald-600 font-black text-sm italic mb-3">R$ {Number(lead.value).toLocaleString('pt-BR')}</div>
                      
                      <div className="grid grid-cols-2 gap-1 mt-4">
                        <MiniTag label="FUP" active={lead.followUp} onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-500" />
                        <MiniTag label="UP" active={lead.hasUpSell} onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-600" />
                        <MiniTag label="CROSS" active={lead.hasCrossSell} onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-blue-600" />
                        <MiniTag label="PÓS" active={lead.postSale} onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-emerald-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: KPI COM UP-SELL */}
      {activeTab === 'metrics' && (
        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-xl overflow-hidden border">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase italic">Dashboard de Performance</h2>
            <div className="flex gap-4">
              <div className="text-center bg-white/5 p-3 rounded-2xl min-w-[100px] border border-white/10">
                <p className="text-[8px] opacity-50 uppercase font-black mb-1 tracking-widest">Conversão</p>
                <p className="text-xl font-black text-blue-400 font-mono italic">{analytics.kpis.conv.toFixed(1)}%</p>
              </div>
              <div className="text-center bg-white/5 p-3 rounded-2xl min-w-[100px] border border-white/10">
                <p className="text-[8px] opacity-50 uppercase font-black mb-1 tracking-widest">Follow-up</p>
                <p className="text-xl font-black text-amber-400 font-mono italic">{analytics.kpis.fup.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[9px] uppercase font-black text-slate-400">
                <th className="p-8">Indicador Estratégico</th>
                <th className="p-8 text-center">Meta do Ciclo</th>
                <th className="p-8 text-center">Status Atual</th>
                <th className="p-8 text-center">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y font-bold text-slate-700">
              <KPILine label="Conversão Geral" meta={goals.conversion + "%"} val={analytics.kpis.conv.toFixed(1) + "%"} perf={analytics.kpis.conv / goals.conversion * 100} />
              <KPILine label="Vendas com Up-Sell" meta={goals.upSell + "%"} val={analytics.kpis.up.toFixed(1) + "%"} perf={analytics.kpis.up / goals.upSell * 100} />
              <KPILine label="Aproveitamento Cross-Sell" meta={goals.crossSell + "%"} val={analytics.kpis.cross.toFixed(1) + "%"} perf={analytics.kpis.cross / goals.crossSell * 100} />
              <KPILine label="Manutenção de Follow-up" meta={goals.followUp + "%"} val={analytics.kpis.fup.toFixed(1) + "%"} perf={analytics.kpis.fup / goals.followUp * 100} />
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: FUNIL COM TODAS AS ETAPAS */}
      {activeTab === 'funnel' && (
        <div className="max-w-4xl mx-auto space-y-4 pt-10">
          <FunnelStep label="TOTAL PROSPECÇÃO" value={analytics.funnelSteps.prospecção} color="bg-slate-400" width="100%" />
          <FunnelStep label="PROPOSTAS ENVIADAS" value={analytics.funnelSteps.orçamento} color="bg-blue-500" width={(analytics.funnelSteps.orçamento/analytics.funnelSteps.prospecção*100) + "%"} />
          <FunnelStep label="EM NEGOCIAÇÃO" value={analytics.funnelSteps.negociação} color="bg-amber-500" width={(analytics.funnelSteps.negociação/analytics.funnelSteps.prospecção*100) + "%"} />
          <FunnelStep label="FECHAMENTO (WON)" value={analytics.funnelSteps.fechado} color="bg-emerald-500" width={(analytics.funnelSteps.fechado/analytics.funnelSteps.prospecção*100) + "%"} />
          <FunnelStep label="PERDIDOS (LOST)" value={analytics.funnelSteps.perdido} color="bg-rose-500" width={(analytics.funnelSteps.perdido/analytics.funnelSteps.prospecção*100) + "%"} />
        </div>
      )}

      {/* VIEW: COMISSÃO COM MEMORIAL DE REGRAS */}
      {activeTab === 'commission' && (
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <DollarSign size={200} className="absolute -right-10 -bottom-10 opacity-5" />
              <p className="text-blue-400 font-black uppercase tracking-[0.3em] mb-4">Total Commission</p>
              <h2 className="text-7xl font-black italic tracking-tighter mb-8">R$ {analytics.totalComm.toLocaleString('pt-BR')}</h2>
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                <div><p className="text-[8px] opacity-40 uppercase mb-1">Alíquota Base</p><p className="text-xl font-bold italic">{analytics.finalRate.toFixed(2)}%</p></div>
                <div><p className="text-[8px] opacity-40 uppercase mb-1">Bônus Meta</p><p className="text-xl font-bold italic">R$ {analytics.fixedBonus}</p></div>
                <div><p className="text-[8px] opacity-40 uppercase mb-1">Status Margem</p><p className={`text-xl font-bold italic ${analytics.isMarginOk ? 'text-emerald-400' : 'text-rose-500'}`}>{analytics.isMarginOk ? 'LIBERADO' : 'TRAVADO'}</p></div>
              </div>
            </div>

            {/* TABELA DE REGRAS */}
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
              <h3 className="font-black uppercase italic mb-6 flex items-center gap-3"><Scale size={16}/> Memorial de Cálculo e Regras</h3>
              <div className="space-y-4 text-[10px]">
                <Rule label="Meta Base (90% - 100% - 110%)" desc="Paga 1.5% / 2.5% / 3.5% sobre o faturamento." status={analytics.revPerf >= 90} />
                <Rule label="Acelerador Conversão (>5%)" desc="+0.5% na alíquota se atingir a meta de fechamento." status={analytics.kpis.conv >= goals.conversion} />
                <Rule label="Acelerador Cross-Sell (>40%)" desc="+0.5% na alíquota se atingir meta de cross-sell." status={analytics.kpis.cross >= goals.crossSell} />
                <Rule label="Acelerador Up-Sell (>15%)" desc="+0.5% na alíquota se atingir meta de up-sell." status={analytics.kpis.up >= goals.upSell} />
                <Rule label="Bônus Fixo Prospecção (>400 leads)" desc="R$ 300,00 fixos por volume de novos leads." status={analytics.funnelSteps.prospecção >= goals.contacts} />
                <Rule label="Trava de Margem Mínima (12%)" desc="Bloqueia comissão se a margem for menor que 12%." status={analytics.isMarginOk} critical />
              </div>
            </div>
          </div>

          {/* INPUTS DE GESTÃO */}
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
            <h4 className="font-black uppercase italic tracking-widest text-slate-400 text-center">Configurações</h4>
            <div className="space-y-4">
               <div>
                 <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 ml-4">Margem de Lucro (%)</label>
                 <input type="number" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-center outline-none border-2 border-transparent focus:border-blue-500" />
               </div>
               <div className="pt-4 border-t">
                 <label className="text-[9px] font-black uppercase text-slate-400 block mb-4 text-center">Lançamento Semanal (R$)</label>
                 {[1, 2, 3, 4].map(w => (
                   <div key={w} className="flex items-center gap-3 mb-2">
                     <span className="w-10 font-black text-slate-300">W0{w}</span>
                     <input type="number" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-right outline-none" />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500"><X size={32}/></button>
            <h2 className="text-4xl font-black uppercase italic italic tracking-tighter mb-10">Novo Lead</h2>
            <div className="space-y-6">
              <input className="w-full p-6 bg-slate-50 rounded-3xl font-black text-xl outline-none focus:ring-4 ring-blue-50" placeholder="NOME DA EMPRESA" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              <input type="number" className="w-full p-6 bg-slate-50 rounded-3xl font-black text-xl outline-none focus:ring-4 ring-blue-50" placeholder="VALOR ESTIMADO R$" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
              <button 
                onClick={async () => {
                  if (supabase) await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString(), week: currentWeek}]);
                  setIsModalOpen(false);
                  fetchLeads();
                }}
                className="w-full p-8 bg-blue-600 text-white rounded-full font-black uppercase text-lg shadow-xl shadow-blue-200 hover:scale-[1.02] transition-all"
              >
                CRIAR OPORTUNIDADE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

const MiniTag = ({ label, active, onClick, color }: any) => (
  <button onClick={onClick} className={`py-1.5 rounded-lg font-black text-[7px] border transition-all ${active ? `${color} text-white border-transparent shadow-sm` : 'bg-white text-slate-300 border-slate-100'}`}>
    {label}
  </button>
);

const KPILine = ({ label, meta, val, perf }: any) => (
  <tr className="hover:bg-slate-50 transition-all border-b">
    <td className="p-8 text-[11px] font-black uppercase tracking-tight">{label}</td>
    <td className="p-8 text-center text-slate-300 italic">{meta}</td>
    <td className="p-8 text-center"><span className="bg-slate-100 px-3 py-1 rounded-full text-blue-600 font-black">{val}</span></td>
    <td className="p-8">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${perf >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(perf, 100)}%` }} />
        </div>
        <span className="font-black text-[10px] w-10">{perf.toFixed(0)}%</span>
      </div>
    </td>
  </tr>
);

const FunnelStep = ({ label, value, color, width }: any) => (
  <div className="flex items-center gap-6 group">
    <div className={`h-16 ${color} rounded-[2rem] shadow-lg flex items-center justify-between px-10 text-white transition-all hover:scale-[1.01]`} style={{ width }}>
      <span className="font-black uppercase italic tracking-widest text-[9px]">{label}</span>
      <span className="font-black text-2xl font-mono">{value}</span>
    </div>
    <div className="text-slate-200 font-black text-2xl italic">{width}</div>
  </div>
);

const Rule = ({ label, desc, status, critical }: any) => (
  <div className={`flex items-start gap-4 p-4 rounded-2xl border ${status ? 'bg-emerald-50/50 border-emerald-100' : critical ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
    {status ? <CheckCircle2 className="text-emerald-500 mt-1" size={16}/> : <AlertCircle className={critical ? 'text-rose-500 mt-1' : 'text-slate-300 mt-1'} size={16}/>}
    <div>
      <p className={`font-black uppercase tracking-tight ${status ? 'text-emerald-700' : critical ? 'text-rose-700' : 'text-slate-600'}`}>{label}</p>
      <p className="opacity-60 font-bold">{desc}</p>
    </div>
  </div>
);
