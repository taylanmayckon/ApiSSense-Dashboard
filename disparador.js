import mqtt from 'mqtt';

// Conecta na porta 1883 (TCP) do seu broker local
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('🔫 Disparando dados de teste...');

  // 1. Teste de Bateria (Vai ficar vermelha no dashboard)
  const payloadBateria = JSON.stringify({ 
    battery: 25
  });
  
  client.publish('apissense/system', payloadBateria);
  console.log(`Enviado para apissense/system: ${payloadBateria}`);

  // 2. Teste de Peso (Vai mostrar 5.000 kg)
  const payloadPeso = JSON.stringify({ 
    raw: 15.250, 
    tare: 0.250 
  });

  client.publish('apissense/loadcell1', payloadPeso);
  console.log(`Enviado para apissense/loadcell1: ${payloadPeso}`);

  // Fecha a conexão após enviar
  setTimeout(() => {
    client.end();
    console.log('✅ Feito!');
  }, 500);
});