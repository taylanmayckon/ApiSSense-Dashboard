import { useEffect } from 'react';

export function useSimulation(enabled, setters) {
  const { setInternalEnv, setVoc, setScale, setSystem } = setters;

  useEffect(() => {
    // Se a simulação estiver desligada, não faz nada
    if (!enabled) return;

    console.log("Modo Simulação Ativado");

    const interval = setInterval(() => {
      // 1. Simulação do Ambiente Interno (CO2 flutuando)
      setInternalEnv(prev => ({
        co2: prev.co2 + (Math.random() - 0.5) * 10,
        temp: prev.temp + (Math.random() - 0.5) * 0.1,
        hum: prev.hum + (Math.random() - 0.5) * 0.5
      }));
      
      // 2. Simulação de VOC (Gases)
      setVoc(prev => ({
        value: Math.max(0, Math.min(500, prev.value + (Math.random() - 0.5) * 5)),
        risk: prev.value > 300 ? 'Alto' : prev.value > 100 ? 'Médio' : 'Baixo'
      }));

      // 3. Simulação da Balança (Ruído no sensor)
      setScale(prev => ({ ...prev, raw: prev.raw + (Math.random() - 0.5) * 0.002 }));
      
      // 4. Simulação da Bateria (Descarregando)
      if (Math.random() > 0.95) {
        setSystem(prev => ({ ...prev, battery: Math.max(0, prev.battery - 0.1) }));
      }

    }, 1500);

    // Limpeza ao desmontar ou desativar
    return () => clearInterval(interval);
  }, [enabled, setInternalEnv, setVoc, setScale, setSystem]);
}