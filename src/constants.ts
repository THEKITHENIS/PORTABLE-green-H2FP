export interface ComponentData {
  name: string;
  id: string;
  specs: string[];
  status: string;
  color: string;
}

export const COMPONENTS_DATA: Record<string, ComponentData> = {
  car: {
    name: "Hyundai ix35 FCEV",
    id: "HYUNDAI-IX35-FCEV",
    specs: ["Tipo: Vehículo de Pila de Combustible", "Autonomía: ~600 km", "Presión Tanques: 350 bar", "Emisiones: Solo Vapor de Agua"],
    status: "Sistema de Propulsión H2",
    color: "#ffffff",
  },
  wtm: {
    name: "Módulo WTM (Agua)",
    id: "WTM 2.0 (QJA-E-006)",
    specs: ["Capacidad: 35 Litros", "Agua: Desionizada / Ultrapura", "Presión Trabajo: ~4 bar", "Conductividad: < 0.1 µS/cm"],
    status: "Nivel: 85%",
    color: "#0066ff",
  },
  el: {
    name: "Electrolizador AEM",
    id: "EL 4.0 (QJA-E-005)",
    specs: ["Producción: 500 NL/h (0.5 m³/h)", "Presión: 35 barg", "Stack: 30 Celdas Anion Exchange", "Consumo: 2.4 kW"],
    status: "Generando H2",
    color: "#00cc44",
  },
  dry: {
    name: "Secador H2 (Purificador)",
    id: "DRY 2.0 (QJA-E-001)",
    specs: ["Pureza H2: > 99.999% (Grado 5.0)", "Punto Rocío: -60°C", "Ciclo: TSA (Thermal Swing Adsorption)", "Filtro Partículas: 0.01 µm"],
    status: "Secado Activo",
    color: "#999999",
  },
  booster: {
    name: "Booster H2",
    id: "HASKEL AG-75",
    specs: ["Entrada: 35 bar (desde EL)", "Salida: 350-385 bar", "Ratio Compresión: 1:75"],
    status: "Comprimiendo",
    color: "#b87333",
  },
  plc: {
    name: "PLC Control Maestro",
    id: "SIEMENS S7-1200",
    specs: ["Lógica: Programable Industrial", "Seguridad: SIL-2 Certified", "Comms: Modbus TCP / Profinet", "HMI: Panel táctil 7\""],
    status: "Sistema OK",
    color: "#ffffff",
  },
  dispenser: {
    name: "Tótem Dispensador H2",
    id: "H2 DISPENSER HD-350",
    specs: ["Presión Servicio: 350 bar", "Protocolo: SAE J2601 / J2799 (IR)", "Válvula: Solenoide Alta Presión", "Seguridad: Disco Ruptura / Fusible Térmico", "Medición: Coriolis Mass Flow Meter"],
    status: "Listo para Repostaje",
    color: "#8899aa",
  },
  comp: {
    name: "Compresor Aire Drive",
    id: "ELGI EN 5 (Tornillo)",
    specs: ["Presión: 8-10 bar", "Caudal: 0.5 m³/min", "Potencia: 4.0 kW", "Secado: Frigorífico Integrado"],
    status: "Presión: 8.2 Bar",
    color: "#ecf0f1",
  },
  nozzle: {
    name: "Pistola de Carga",
    id: "WEH TK17 H2 350 bar",
    specs: ["Conexión: NGV1 Standard", "Seguridad: Interlock Mecánico", "Interfaz: Comunicación IR con Vehículo", "Caudal Máx: 60 g/s"],
    status: "Acoplada / Lista",
    color: "#111111",
  },
  vent: {
    name: "Línea de Venteo",
    id: "SAFETY VENT STACK",
    specs: ["Función: Evacuación segura de H2", "Ubicación: Punto más alto de planta", "Seguridad: Arrestallamas integrado", "Material: Acero Inox 316L"],
    status: "Pasiva / Seguridad",
    color: "#fbbf24",
  },
  drive_air: {
    name: "Línea Aire Drive",
    id: "PNEUMATIC CONTROL LINE",
    specs: ["Presión: 8 bar regulada", "Función: Accionamiento de Booster", "Filtrado: Aceite y Humedad < 0.01mg/m³"],
    status: "Presurizada",
    color: "#94a3b8",
  },
  car_stack: {
    name: "Pila de Combustible (Stack)",
    id: "IX35 FUEL CELL MODULE",
    specs: ["Potencia: 100 kW", "Celdas: 433 unidades", "Tensión: 240V - 450V DC", "Refrigeración: Agua/Glicol"],
    status: "Generando Energía",
    color: "#475569",
  },
  car_motor: {
    name: "Motor de Tracción",
    id: "AC INDUCTION MOTOR",
    specs: ["Potencia Máx: 100 kW (134 CV)", "Par Motor: 300 Nm", "Velocidad Máx: 160 km/h", "Reductora: Integrada"],
    status: "Listo",
    color: "#1e293b",
  },
  car_battery: {
    name: "Batería de Alto Voltaje",
    id: "LI-POLYMER BATTERY",
    specs: ["Capacidad: 2.4 kWh", "Tensión Nominal: 180V", "Peso: 47 kg", "Función: Apoyo en aceleración y regeneración"],
    status: "Carga: 85%",
    color: "#334155",
  },
  car_tanks: {
    name: "Depósitos de Hidrógeno",
    id: "TYPE III TANKS (700 bar)",
    specs: ["Capacidad Total: 144 L (5.6 kg)", "Tanque 1: 104 Litros", "Tanque 2: 40 Litros", "Presión Trabajo: 700 bar", "Material: Fibra de Carbono / Aluminio"],
    status: "Almacenando",
    color: "#0ea5e9",
  },
  dry_h2_line: {
    name: "Línea H2 Seco",
    id: "DRY HYDROGEN LINE",
    specs: ["Origen: Secador H2", "Destino: Booster", "Pureza: 99.999%", "Presión: 35 bar"],
    status: "Flujo Activo",
    color: "#94a3b8",
  },
  booster_plc_line: {
    name: "Línea Control Booster",
    id: "BOOSTER-PLC COMMS",
    specs: ["Tipo: Señal Analógica/Digital", "Función: Monitoreo de presión y control de ciclos", "Seguridad: Parada de emergencia vinculada"],
    status: "Comunicando",
    color: "#78350f",
  },
};
