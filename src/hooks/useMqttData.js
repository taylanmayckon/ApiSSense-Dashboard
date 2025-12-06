import { useEffect, useRef } from 'react';
import mqtt from 'mqtt';

export function useMqttData(enabled, setters) {
  // 1. DESESTRUTURAÇÃO: Pegamos todas as funções que atualizam a tela
  const { 
    setSystem, 
    setScale, 
    setInternalEnv, 
    setExternalEnv, 
    setVoc, 
    setFlow 
  } = setters;
  
  const clientRef = useRef(null);

  // Função para enviar comandos (Tara, Reset, etc)
  const publishCommand = (topic, message) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, message);
    }
  };

  useEffect(() => {
    if (!enabled) {
      if (clientRef.current) {
        clientRef.current.end();
        clientRef.current = null;
      }
      return;
    }

    const MQTT_URL = 'ws://localhost:8888';
    const TOPIC_WILDCARD = 'apissense/#'; 

    console.log("📡 Iniciando conexão MQTT (Modo JSON Unificado)...");

    const client = mqtt.connect(MQTT_URL, {
      clientId: `apissense_dashboard`,
      clean: true,
      connectTimeout: 4000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ Conectado! Assinando tópicos...');
      client.subscribe(TOPIC_WILDCARD);
    });

    client.on('message', (topic, message) => {
      const payloadStr = message.toString();
      
      // Função auxiliar para tentar ler JSON sem quebrar o app
      const parseJSON = () => {
        try {
          return JSON.parse(payloadStr);
        } catch (e) {
          console.warn(`⚠️ Erro ao ler JSON do tópico ${topic}:`, e);
          return null;
        }
      };

      switch (topic) {

        // SISTEMA GERAL (Bateria + SD Cards) 
        // Esperado: { "battery": 90, "sd1_used": 4, "sd1_total": 32, "sd2_used": 4, "sd2_total": 32 }
        case 'apissense/system': {
          const data = parseJSON();
          if (!data) break;
          setSystem(prev => ({
            ...prev,
            battery: data.battery ?? prev.battery,
            sd1: (data.sd1_used && data.sd1_total) ? { used: data.sd1_used, total: data.sd1_total } : prev.sd1,
            sd2: (data.sd2_used && data.sd2_total) ? { used: data.sd2_used, total: data.sd2_total } : prev.sd2,
          }));
          break;
        }
        
        // CÉLULAs DE CARGA 
        // Esperado: { "raw": 24.5, "tare": 0.5 }
        case 'apissense/loadcell1': {
          const data = parseJSON();
          if (!data) break;
          setScale(prev => ({
            ...prev,
            raw: data.raw !== undefined ? data.raw : prev.raw, // Peso bruto (total)
            tare: data.tare !== undefined ? data.tare : prev.tare // Peso liquido (com tara)
          }));
          break;
        }

        // CONTAGEM DE ABELHAS
        // Esperado: { "in": 10, "out": 5 }
        case 'apissense/beecount': {
          const data = parseJSON();
          if (!data) break;
          setFlow(prev => ({
            ...prev,
            in: data.in !== undefined ? data.in : prev.in,
            out: data.out !== undefined ? data.out : prev.out
          }));
          break;
        }

        // SENSOR DE ATMOSFERA (CO2)
        // Esperado: { "co2": 600, "temp": 34.5, "hum": 60 }
        case 'apissense/atmosphera': {
          const data = parseJSON();
          if (!data) break;
          setInternalEnv(prev => ({
            ...prev,
            co2: data.co2 ?? prev.co2,
            temp: data.temp ?? prev.temp,
            hum: data.hum ?? prev.hum
          }));
          break;
        }

        // GASES VOLÁTEIS
        case 'apissense/voc': {
          const data = parseJSON();
          let newVal;
          if (typeof data === 'object' && data.index !== undefined) {
             newVal = data.index;
          } 
          // Se 'data' for apenas um número direto (ex: 150), usa ele mesmo
          else if (typeof data === 'number') {
             newVal = data;
          } 
          // Se veio string numérica ("150"), converte
          else if (!isNaN(parseFloat(data))) {
             newVal = parseFloat(data);
          }
          else {
             console.warn("Formato VOC desconhecido:", data);
             break;
          }
          const newRisk = newVal > 300 ? 'Alto' : newVal > 100 ? 'Médio' : 'Baixo';
          setVoc(prev => ({
            ...prev,
            value: newVal,
            risk: newRisk
          }));
          break;
        }
        
        // SENSOR TEMP + UMIDADE 
        // Esperado: { "temp": 28.5, "hum": 45 }
        case 'apissense/temp_umi': {
          const data = parseJSON();
          if (!data) break;
          setExternalEnv(prev => ({
            ...prev,
            temp: data.temp ?? prev.temp,
            hum: data.hum ?? prev.hum
          }));
          break;
        }

        default:
          break;
      }
    });

    return () => {
      if (client) client.end();
    };
  }, [enabled, setScale, setFlow, setSystem, setInternalEnv, setExternalEnv, setVoc]);

  return { publishCommand };
}