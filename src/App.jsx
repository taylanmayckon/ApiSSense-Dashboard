import React, { useState } from 'react';
import { 
  Scale, 
  MoveUp, 
  MoveDown, 
  RefreshCw, 
  Hexagon,
  Activity,
  Battery,
  BatteryCharging,
  HardDrive, 
  Wind,
  Thermometer,
  Droplets,
  Zap,
  Settings,
  Trash2,
  Cpu
} from 'lucide-react';

// Importa os dois hooks (Mock e MQTT)
import { useSimulation } from './hooks/useSimulation';
import { useMqttData } from './hooks/useMqttData';

// --- Componentes Visuais (Mantidos aqui conforme sua preferência) ---

// Card Base
const DashboardCard = ({ title, icon: Icon, children, accentColor = "border-amber-500" }) => (
  <div className={`
    relative bg-zinc-900/80 backdrop-blur-md 
    border border-zinc-800 rounded-xl p-5 
    shadow-lg hover:shadow-xl hover:bg-zinc-900 
    transition-all duration-300 group
    border-b-4 ${accentColor} flex flex-col h-full justify-between
  `}>
    <div>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-zinc-400 font-medium text-xs uppercase tracking-wider flex items-center gap-2">
          {Icon && <Icon size={16} className="text-zinc-600" />}
          {title}
        </h3>
      </div>
      {children}
    </div>
  </div>
);

// Botão Pequeno (Action)
const IconButton = ({ onClick, icon: Icon, label, color = "hover:bg-zinc-800", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg text-zinc-400 transition-colors ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'} flex items-center gap-2 text-xs font-bold uppercase`}
    title={label}
  >
    {Icon && <Icon size={16} />}
    <span>{label}</span>
  </button>
);

// Display de Valor
const ValueDisplay = ({ value, unit, label, color = "text-white", size = "text-3xl" }) => (
  <div>
    <div className="flex items-baseline gap-1">
      <span className={`${size} font-bold tracking-tight ${color}`}>{value}</span>
      {unit && <span className="text-zinc-500 text-sm font-medium">{unit}</span>}
    </div>
    {label && <span className="text-[10px] text-zinc-500 uppercase font-semibold">{label}</span>}
  </div>
);

// Barra de Progresso Simples
const ProgressBar = ({ value, max, color = "bg-amber-500", label }) => (
  <div className="w-full">
    <div className="flex justify-between text-xs text-zinc-500 mb-1">
      <span>{label}</span>
      <span>{Math.round((value / max) * 100)}%</span>
    </div>
    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
      <div 
        className={`${color} h-full transition-all duration-500`} 
        style={{ width: `${(value / max) * 100}%` }}
      ></div>
    </div>
  </div>
);

// --- Aplicação Principal ---

export default function ApiSSense() {
  // --- Estados do Sistema ---
  const [system, setSystem] = useState({
    battery: 100,
    isCharging: false,
    sd1: { used: 4.2, total: 32 }, 
    sd2: { used: 12.8, total: 32 }, 
  });

  // --- Estados dos Sensores ---
  const [scale, setScale] = useState({ raw: 1.500, tare: 0, isCalibrating: false });
  const [flow, setFlow] = useState({ in: 450, out: 412 });
  
  // MUDANÇA: Renomeado de 'internalEnv' para 'scd41' para clareza
  const [scd41, setScd41] = useState({ co2: 650, temp: 34.2, hum: 60 });
  
  const [externalEnv, setExternalEnv] = useState({ temp: 28.5, hum: 45 });
  const [voc, setVoc] = useState({ value: 150, risk: 'Baixo' });

  // 1. CONFIGURAÇÃO CENTRAL DE DADOS
  // Mude para 'false' para ativar o MQTT real e desligar a simulação
  const USE_MOCK = false; 

  // MUDANÇA: Atualizar o setter para 'setScd41'
  const allSetters = {
    setSystem,
    setScale,
    setFlow,
    setScd41,  // ← MUDANÇA AQUI
    setExternalEnv,
    setVoc
  };

  // 2. CHAMADA DOS HOOKS (Lógica "Ou um Ou Outro")
  
  // Hook de Simulação (só roda se USE_MOCK for true)
  useSimulation(USE_MOCK, allSetters);

  // Hook de MQTT (só roda se USE_MOCK for false)
  const { publishCommand } = useMqttData(!USE_MOCK, allSetters);

  // --- HANDLERS (Comandos dos Botões) ---

  const handleTare = () => {
    if (USE_MOCK) {
      setScale(prev => ({ ...prev, tare: prev.raw }));
    } else {
      publishCommand('apissense/loadcell1/cmd', 'TARE');
    }
  };

  const handleResetFlow = () => {
    if (USE_MOCK) {
       setFlow({ in: 0, out: 0 });
    } else {
       publishCommand('apissense/beecount/cmd', 'RESET');
    }
  };
  
  const handleCalibrate = () => {
    setScale(prev => ({ ...prev, isCalibrating: true }));
    setTimeout(() => {
      alert("Modo de Calibração: Implementar lógica de comando MQTT aqui se necessário.");
      setScale(prev => ({ ...prev, isCalibrating: false }));
    }, 1000);
  };

  // Cálculos de renderização
  const currentWeight = Math.max(0, scale.raw - scale.tare).toFixed(3);
  const netFlow = flow.in - flow.out;

  const getBatteryColor = (level) => {
    if (level > 50) return "text-green-500";
    if (level > 20) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans p-4 md:p-8">
      
      {/* --- HEADER --- */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl text-black shadow-lg shadow-amber-500/20">
            <Hexagon size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tighter text-white leading-none">
              ApiS<span className="text-amber-500">Sense</span>
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-1">Monitoramento</p>
          </div>
        </div>

        {/* Status do Sistema (Bateria) */}
        <div className="flex items-center gap-6 bg-zinc-900/50 px-6 py-3 rounded-full border border-zinc-800">
           <div className="flex items-center gap-3">
             <div className={`flex items-center gap-2 ${getBatteryColor(system.battery)}`}>
               {system.isCharging ? <BatteryCharging size={20} /> : <Battery size={20} />}
               <span className="font-mono font-bold text-lg">{system.battery.toFixed(0)}%</span>
             </div>
             <div className="h-8 w-px bg-zinc-800 mx-2"></div>
             <div className="flex flex-col text-xs text-zinc-500">
               <span className="uppercase font-bold text-zinc-400">Bateria Atual</span>
               <span>Uptime: --</span>
             </div>
           </div>
        </div>
      </header>

      {/* --- GRID DE CARDS --- */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. BALANÇA (Destaque) */}
        <DashboardCard title="Célula de Carga" icon={Scale} accentColor="border-amber-500">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <ValueDisplay value={currentWeight} unit="kg" label="Peso Líquido" color="text-amber-400" size="text-4xl" />
              <ValueDisplay value={scale.raw.toFixed(3)} unit="kg" label="Peso Bruto" size="text-sm" color="text-zinc-500" />
            </div>
            
            <div className="pt-4 border-t border-zinc-800 flex gap-2">
              <IconButton onClick={handleTare} icon={RefreshCw} label="Tarar" color="hover:bg-amber-500/10 hover:text-amber-500" />
              <IconButton 
                onClick={handleCalibrate} 
                icon={Settings} 
                label={scale.isCalibrating ? "Calibrando..." : "Calibrar"} 
                disabled={scale.isCalibrating} 
              />
            </div>
          </div>
        </DashboardCard>

        {/* 2. CONTROLE DE FLUXO */}
        <DashboardCard title="Contagem de Abelhas" icon={Activity} accentColor="border-blue-500">
          <div className="space-y-4">
             <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2 text-green-500">
                  <MoveDown size={18} />
                  <div>
                    <span className="block text-lg font-bold font-mono">{flow.in}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Entradas</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-zinc-800"></div>
                <div className="flex items-center gap-2 text-amber-500">
                  <div>
                    <span className="block text-lg font-bold font-mono text-right">{flow.out}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 block text-right">Saídas</span>
                  </div>
                  <MoveUp size={18} />
                </div>
             </div>
             
             <div className="flex justify-between items-center pt-2">
               <span className={`text-sm font-bold ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                 Saldo: {netFlow > 0 ? '+' : ''}{netFlow}
               </span>
               <IconButton onClick={handleResetFlow} icon={Trash2} label="Zerar Fluxo" color="hover:bg-red-500/10 hover:text-red-500" />
             </div>
          </div>
        </DashboardCard>

        {/* 3. ATMOSFERA INTERNA - SCD41 */}
        <DashboardCard title="SCD41 - Atmosfera Interna" icon={Wind} accentColor="border-green-500">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="col-span-2">
               <ValueDisplay value={scd41.co2.toFixed(0)} unit="ppm" label="Nível de CO2" color="text-green-400" />
               <ProgressBar value={scd41.co2} max={2000} color="bg-green-500" label="" />
            </div>
            <div>
               <ValueDisplay value={scd41.temp.toFixed(1)} unit="°C" label="Temp. Interna" size="text-xl" />
            </div>
            <div>
               <ValueDisplay value={scd41.hum.toFixed(0)} unit="%" label="Umid. Interna" size="text-xl" />
            </div>
          </div>
        </DashboardCard>

        {/* 4. VOC */}
        <DashboardCard title="Gases Voláteis (VOCs)" icon={Zap} accentColor="border-purple-500">
          <div className="flex flex-col h-full justify-between gap-4">
             <div className="flex items-center justify-between">
                <ValueDisplay value={voc.value.toFixed(0)} unit="idx" label="Índice VOC" color="text-purple-400" />
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  voc.risk === 'Alto' ? 'border-red-500 text-red-500 bg-red-500/10' : 
                  voc.risk === 'Médio' ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 
                  'border-green-500 text-green-500 bg-green-500/10'
                }`}>
                  Risco {voc.risk}
                </div>
             </div>
          </div>
        </DashboardCard>

        {/* 5. CLIMA EXTERNO - SHT31 */}
        <DashboardCard title="DHT22 - Clima Externo" icon={Thermometer} accentColor="border-orange-500">
          <div className="flex items-center justify-around h-full">
             <div className="text-center">
                <Thermometer size={24} className="text-orange-500 mx-auto mb-2" />
                <ValueDisplay value={externalEnv.temp.toFixed(1)} unit="°C" label="Temperatura" size="text-2xl" />
             </div>
             <div className="h-12 w-px bg-zinc-800"></div>
             <div className="text-center">
                <Droplets size={24} className="text-blue-500 mx-auto mb-2" />
                <ValueDisplay value={externalEnv.hum.toFixed(0)} unit="%" label="Umidade" size="text-2xl" />
             </div>
          </div>
        </DashboardCard>

        {/* 6. ARMAZENAMENTO */}
        <DashboardCard title="Armazenamento Local" icon={HardDrive} accentColor="border-zinc-500">
           <div className="space-y-4">
             <ProgressBar 
               value={system.sd1.used} max={system.sd1.total} label={`SD Card 01 (Logs)`} color="bg-indigo-500" 
             />
             <ProgressBar 
               value={system.sd2.used} max={system.sd2.total} label={`SD Card 02 (Audios)`} color="bg-cyan-500" 
             />
             <div className="flex justify-end pt-2">
                <div className="text-[10px] text-green-500 flex items-center gap-1 uppercase font-bold bg-green-500/10 px-2 py-1 rounded">
                   <Cpu size={12} /> Gravando Logs
                </div>
             </div>
           </div>
        </DashboardCard>

      </main>
    </div>
  );
}