import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Target, CheckCircle2, ChevronRight, Zap, 
  Clock, BarChart, Search, RefreshCw, Layers, ChevronDown, Check, X, 
  Briefcase, Coins, Rocket, Trophy, Crown, BriefcaseIcon, ZapOff, 
  ArrowRightCircle, LayoutDashboard, RotateCcw, AlertCircle
} from 'lucide-react';

// --- DATABASE CONFIG ---
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || "", import.meta.env.VITE_SUPABASE_ANON_KEY || "");

// --- CONSTANTS ---
const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500' }
];

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700' }
];

export default function CRMMasterElite() {
  // --- STATES ---
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- GOALS (EDITABLE FIELDS) ---
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,        // Meta Editável
    contacts: 400,       // Meta Editável
    reactivated: 8       // Meta Editável
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: 0, 2: 0, 3: 0, 4: 0 },
    profitMargin: 15     // REGRA PRINCIPAL: MARGEM > 0
  });

  const [newLead, setNewLead] = useState({ name: '', value: 0, stage: 'contato' });

  // --- DATA ACTIONS ---
  const fetchLeads = useCallback(async () => {
    const { data } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    await supabase.from('leads').update(payload).eq('id', id);
  };

  const toggleTag = (lead: any, tagId: string) => {
    let current = lead.tags ? lead.tags.split(',').filter((t: any) => t) : [];
    const updated = current.includes(tagId) ? current.filter((t: any) => t !== tagId) : [...current, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- BLOCO 1: O CÉREBRO DE CÁLCULO (LÓGICA DE COMISSÃO) ---
  // =============================================================================
  const brain = useMemo(() => {
    const won = leads.filter(l => l.stage === 'fechado');
    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b), 0);
    const revPerf = (totalRev / goals.revenue) * 100;

    // Estatísticas Reais
    const stats = {
      ticket: won.length > 0 ? (won.reduce((a, b) => a + Number(b.value), 0) / won.length) : 0,
      conv: leads.length > 0 ? (won.length / leads.length) * 100 : 0,
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      fup: leads.filter(l => ['orcamento','negociacao','fechado'].includes(l.stage)).length > 0 ? (leads.filter(l => l.followUp).length / leads.filter(l => ['orcamento','negociacao','fechado'].includes(l.stage)).length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      react: leads.filter(l => l.reactivated).length
    };

    // REGRA: MARGEM MÍNIMA > 0
    const isMarginOk = commSettings.profitMargin > 0;

    // Alíquota Base
    let rate = 0;
    if (revPerf >= 110) rate = 3.5;
    else if (revPerf >= 100) rate = 2.5;
    else if (revPerf >= 90) rate = 1.5;

    // Aceleradores +0.5% (Só se Margem > 0)
    const bonusTicket = (isMarginOk && stats.ticket >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && stats.conv >= 5) ? 0.5 : 0;
    const bonusCross = (isMarginOk && stats.cross >= 40) ? 0.5 : 0;
    const bonusUp = (isMarginOk && stats.up >= 15) ? 0.5 : 0;

    const finalRate = isMarginOk ? (rate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // Bônus R$ 300,00 (Regra Principal: TODAS as metas devem ser atingidas)
    const m1 = leads.length >= goals.contacts;
    const m2 = stats.fup >= 90;
    const m3 = stats.post >= 100;
    const m4 = stats.react >= goals.reactivated;

    const qualifies300 = isMarginOk && m1 && m2 && m3 && m4;
    const bonus300Value = qualifies300 ? 300 : 0;

    const totalComm = (totalRev * (finalRate / 100)) + bonus300Value;

    return { totalComm, finalRate, bonus300Value, isMarginOk, stats, checks: { m1, m2, m3, m4 }, revPerf, totalRev };
  }, [leads, goals, commSettings]);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-blue-500 animate-pulse font-black italic">LOADING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className={`bg-slate-950 text-white transition-all duration-500 flex flex-col ${sidebarOpen ? 'w-[380px]' : 'w-[80px]'}`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
           <BriefcaseIcon className="text-blue-500" size={32}/>
           {sidebarOpen && <h1 className="font-black italic text-xl uppercase">Ultra<span className="text-blue-500">Sales</span></h1>}
        </div>
        
        <nav className="p-4 flex-1 space-y-2">
           <NavItem icon={<LayoutDashboard/>} label="Pipeline" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
           <NavItem icon={<Coins/>} label="Comissões" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
           
           {sidebarOpen && (
             <div className="mt-10 p-6 space-y-6 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metas Editáveis</p>
                <SidebarInput label="Ticket Médio" val={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                <SidebarInput label="Contatos/Mês" val={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} />
                <SidebarInput label="Reativados" val={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} />
                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                  <SidebarInput label="Margem de Lucro %" val={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} isMargin />
                </div>
             </div>
           )}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-xl outline-none w-80 font-bold" />
           </div>
           <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs">Novo Lead</button>
        </header>

        <div className="flex-1 overflow-auto p-10">
          
          {activeTab === 'pipeline' && (
            <div className="flex gap-8 h-full min-w-[1500px]">
               {STAGES.map(stage => (
                 <div key={stage.id} className="w-80 flex flex-col bg-slate-200/50 rounded-[2.5rem] p-5 border border-slate-300/30">
                    <h3 className="font-black uppercase text-slate-400 text-[10px] mb-4 px-2">{stage.label}</h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                       {leads.filter(l => l.stage === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                         <div key={lead.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-blue-500 transition-all">
                            {/* ETIQUETAS DO CARD */}
                            <div className="flex gap-1 mb-4">
                               {AVAILABLE_TAGS.map(tag => (
                                 <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-5 h-5 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white scale-110 shadow-md` : 'bg-slate-100 border-slate-200'}`} />
                               ))}
                            </div>
                            
                            <p className="font-black text-slate-900 uppercase text-xs mb-1">{lead.name}</p>
                            <p className="text-emerald-600 font-black italic mb-4">R$ {Number(lead.value).toLocaleString('pt-BR')}</p>

                            {/* BOTÕES DE ATRIBUTOS (PRETO E NEGRITO) */}
                            <div className="grid grid-cols-2 gap-1.5">
                               <CardBtn active={lead.followUp} label="FOLLOW-UP" color="bg-amber-400" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} />
                               <CardBtn active={lead.hasUpSell} label="UP-SELL" color="bg-purple-400" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} />
                               <CardBtn active={lead.hasCrossSell} label="CROSS-SELL" color="bg-blue-400" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} />
                               <CardBtn active={lead.reactivated} label="REATIVADO" color="bg-emerald-400" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} />
                               <CardBtn active={lead.postSale} label="PÓS-VENDA 100%" color="bg-indigo-400" full onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
               {/* DISPLAY PRINCIPAL */}
               <div className={`p-16 rounded-[4rem] text-white relative overflow-hidden transition-all ${brain.isMarginOk ? 'bg-slate-950' : 'bg-rose-950'}`}>
                  <p className="text-blue-500 font-black uppercase text-[10px] tracking-widest mb-4">Comissão Total Calculada</p>
                  <h2 className="text-9xl font-black italic tracking-tighter">R$ {brain.totalComm.toLocaleString('pt-BR')}</h2>
                  
                  {!brain.isMarginOk && (
                    <div className="mt-8 flex items-center gap-3 text-rose-500 font-black uppercase text-xs animate-pulse">
                      <ZapOff size={20}/> Bloqueio: Margem de lucro insuficiente para pagamento de bônus.
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-8 mt-16 pt-10 border-t border-white/10">
                    <StatMini label="Alíquota" val={`${brain.finalRate}%`} />
                    <StatMini label="Bônus Fixo" val={`R$ ${brain.bonus300Value}`} />
                    <StatMini label="Faturamento" val={`R$ ${brain.totalRev.toLocaleString('pt-BR')}`} />
                    <StatMini label="Meta" val={`${brain.revPerf.toFixed(1)}%`} highlight />
                  </div>
               </div>

               {/* REGRAS E ACELERADORES */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm">
                     <h3 className="font-black italic text-xl mb-8 flex items-center gap-3 uppercase"><Rocket className="text-blue-500"/> Aceleradores (+0.5%)</h3>
                     <div className="space-y-4">
                        <RuleRow status={brain.stats.ticket >= goals.ticket} label="Ticket Médio" val={`R$ ${brain.stats.ticket.toFixed(0)}`} meta={`R$ ${goals.ticket}`} />
                        <RuleRow status={brain.stats.conv >= 5} label="Conversão" val={`${brain.stats.conv.toFixed(1)}%`} meta="5%" />
                        <RuleRow status={brain.stats.cross >= 40} label="Cross-Sell" val={`${brain.stats.cross.toFixed(1)}%`} meta="40%" />
                        <RuleRow status={brain.stats.up >= 15} label="Up-Sell" val={`${brain.stats.up.toFixed(1)}%`} meta="15%" />
                     </div>
                  </div>

                  <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                     <h3 className="font-black italic text-xl mb-8 flex items-center gap-3 uppercase text-blue-400"><Trophy/> Bônus Fixo R$ 300</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <Indicator status={brain.checks.m1} label="Contatos" val={`${leads.length}/${goals.contacts}`} />
                        <Indicator status={brain.checks.m2} label="Follow-up" val={`${brain.stats.fup.toFixed(0)}%/90%`} />
                        <Indicator status={brain.checks.m3} label="Pós-Venda" val={`${brain.stats.post.toFixed(0)}%/100%`} />
                        <Indicator status={brain.checks.m4} label="Reativados" val={`${brain.stats.react}/${goals.reactivated}`} />
                     </div>
                  </div>
               </div>

               {/* SEMANAS */}
               <div className="bg-white p-10 rounded-[3rem] shadow-sm">
                  <h3 className="font-black uppercase text-[10px] text-slate-400 mb-8">Lançamento de Faturamento Semanal</h3>
                  <div className="grid grid-cols-4 gap-6">
                     {[1,2,3,4].map(w => (
                       <div key={w}>
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest text-center">Semana {w}</p>
                          <input type="number" value={commSettings.weeks[w as keyof typeof commSettings.weeks]} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: e.target.value}})} className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-black text-xl text-center" />
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center">
            <div className="bg-white p-12 rounded-[3rem] w-full max-w-lg shadow-2xl">
               <h2 className="text-4xl font-black italic uppercase mb-8">Novo <span className="text-blue-600">Lead</span></h2>
               <input className="w-full p-5 bg-slate-100 rounded-2xl mb-4 font-bold outline-none" placeholder="NOME DO CLIENTE" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} />
               <input type="number" className="w-full p-5 bg-slate-100 rounded-2xl mb-8 font-bold outline-none" placeholder="VALOR" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
               <button onClick={async () => { await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString()}]); setIsModalOpen(false); fetchLeads(); }} className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Criar Oportunidade</button>
               <button onClick={() => setIsModalOpen(false)} className="w-full mt-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- MODULAR SUBCOMPONENTS ---

function NavItem({ icon, label, active, onClick, open }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
      {icon} {open && <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>}
    </button>
  );
}

function SidebarInput({ label, val, onChange, isMargin }: any) {
  return (
    <div>
      <p className={`text-[8px] font-black uppercase mb-1 ${isMargin ? 'text-blue-400' : 'text-slate-600'}`}>{label}</p>
      <input type="number" value={val} onChange={e => onChange(Number(e.target.value))} className="bg-transparent border-b border-white/10 w-full text-white font-black text-xl outline-none focus:border-blue-500 transition-all" />
    </div>
  );
}

function CardBtn({ active, label, color, onClick, full }: any) {
  return (
    <button onClick={onClick} className={`py-2 rounded-xl text-[8px] font-black text-black border-2 transition-all ${full ? 'col-span-2' : ''} ${active ? `${color} border-transparent shadow-md` : 'bg-white border-slate-100'}`}>
      {label}
    </button>
  );
}

function StatMini({ label, val, highlight }: any) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-black italic ${highlight ? 'text-blue-500' : 'text-white'}`}>{val}</p>
    </div>
  );
}

function RuleRow({ status, label, val, meta }: any) {
  return (
    <div className={`p-5 rounded-2xl border-2 flex items-center justify-between ${status ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-900">{label}</p>
        <p className="text-[9px] font-bold text-slate-400">Real: {val} | Meta: {meta}</p>
      </div>
      {status ? <CheckCircle2 className="text-emerald-500"/> : <X className="text-slate-300"/>}
    </div>
  );
}

function Indicator({ status, label, val }: any) {
  return (
    <div className={`p-4 rounded-2xl border-2 ${status ? 'bg-blue-600 border-transparent' : 'bg-white/5 border-white/10 opacity-40'}`}>
      <p className="text-[8px] font-black uppercase mb-1 text-blue-200">{label}</p>
      <p className="text-sm font-black italic text-white">{val}</p>
    </div>
  );
}
