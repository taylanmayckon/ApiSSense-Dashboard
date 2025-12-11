import { useEffect, useRef } from 'react';
import mqtt from 'mqtt';

export function useMqttData(enabled, setters) {
  // 1. DESESTRUTURAÇÃO: Pegamos todas as funções que atualizam a tela
  const { 
    setSystem, 
    setScale, 
    setScd41,        // ✅ CORRIGIDO: era setInternalEnv
    setExternalEnv, 
    setVoc, 
    setFlow 
  } = setters;
  
  const clientRef = useRef(null);

  // Função para enviar comandos (Tara, Reset, etc)
  const publishCommand = (topic, message) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, message);
      console.log(`📤 Comando enviado: ${topic} -> ${message}`);
    } else {
      console.warn('⚠️ Cliente MQTT não conectado. Comando não enviado.');
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
      clientId: `apissense_dashboard_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ Conectado ao broker MQTT! Assinando tópicos...');
      client.subscribe(TOPIC_WILDCARD, (err) => {
        if (err) {
          console.error('❌ Erro ao assinar tópicos:', err);
        } else {
          console.log('✅ Assinado em: apissense/#');
        }
      });
    });

    client.on('error', (err) => {
      console.error('❌ Erro de conexão MQTT:', err);
    });

    client.on('message', (topic, message) => {
      const payloadStr = message.toString();
      console.log(`📥 [${topic}] Recebido:`, payloadStr);
      
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
          console.log('✅ Sistema atualizado:', data);
          break;
        }
        
        // CÉLULAS DE CARGA 
        // Esperado: { "weight": 1234.56, "unit": "g" }
        // NOTA: Sensor desabilitado - peso permanece estático
        case 'apissense/loadcell1': {
          const data = parseJSON();
          if (!data) break;
          // Comentado até o sensor estar funcionando
          setScale(prev => ({
            ...prev,
            raw: data.weight !== undefined ? data.weight / 1000 : prev.raw
          }));
          console.log('✅ Peso atualizado:', data);
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
          console.log('✅ Fluxo de abelhas atualizado:', data);
          break;
        }

        // SENSOR DE ATMOSFERA (SCD41 - CO2, Temperatura, Umidade)
        // Esperado: { "co2": 600, "temperature": 34.5, "humidity": 60 }
        case 'apissense/scd41': {
          const data = parseJSON();
          if (!data) break;
          setScd41(prev => ({
            ...prev,
            co2: data.co2 !== undefined ? data.co2 : prev.co2,
            temp: data.temperature !== undefined ? data.temperature : prev.temp,
            hum: data.humidity !== undefined ? data.humidity : prev.hum
          }));
          console.log('✅ SCD41 atualizado:', data);
          break;
        }

        // GASES VOLÁTEIS (VOC)
        // Esperado: { "index": 150 }
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
          console.log('✅ VOC atualizado:', { value: newVal, risk: newRisk });
          break;
        }

        // SENSOR TEMP + UMIDADE EXTERNO (DHT22)
        // Esperado: { "temperature": 28.5, "humidity": 45 }
        case 'apissense/dht22': {
          const data = parseJSON();
          if (!data) break;
          setExternalEnv(prev => ({
            ...prev,
            temp: data.temperature ?? prev.temp,
            hum: data.humidity ?? prev.humidity
          }));
          console.log('✅ DHT22 (Clima externo) atualizado:', data);
          break;
        }

        // PAYLOAD CONSOLIDADO (OPCIONAL)
        // Esperado: { "bees": {...}, "co2": ..., "temp": ..., "hum": ..., "weight": ..., "voc": ... }
        case 'apissense/all': {
          const data = parseJSON();
          if (!data) break;
          
          // Atualiza fluxo de abelhas
          if (data.bees) {
            setFlow(prev => ({
              ...prev,
              in: data.bees.in ?? prev.in,
              out: data.bees.out ?? prev.out
            }));
          }
          
          // Atualiza SCD41
          if (data.co2 !== undefined || data.temp !== undefined || data.hum !== undefined) {
            setScd41(prev => ({
              ...prev,
              co2: data.co2 ?? prev.co2,
              temp: data.temp ?? prev.temp,
              hum: data.hum ?? prev.hum
            }));
          }
          
          // Atualiza balança
          // Comentado até o sensor estar funcionando
          // if (data.weight !== undefined) {
          //   setScale(prev => ({
          //     ...prev,
          //     raw: data.weight / 1000 // Converte g para kg
          //   }));
          // }
          
          // Atualiza VOC
          if (data.voc !== undefined) {
            const newRisk = data.voc > 300 ? 'Alto' : data.voc > 100 ? 'Médio' : 'Baixo';
            setVoc({ value: data.voc, risk: newRisk });
          }
          
          console.log('✅ Payload consolidado processado:', data);
          break;
        }

        default:
          console.log(`ℹ️ Tópico não mapeado: ${topic}`);
          break;
      }
    });

    return () => {
      console.log('🔌 Desconectando do broker MQTT...');
      if (client) client.end();
    };
  }, [enabled, setScale, setFlow, setSystem, setScd41, setExternalEnv, setVoc]);

  return { publishCommand };
}