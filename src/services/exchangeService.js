import { supabase } from '../supabaseClient';

const FALLBACK_RATES = {
  bcv: 60.0,
  usdt: 65.0,
  eur: 64.8,
  date: new Date().toISOString().substring(0, 10),
  status: 'fallback'
};

// Obtener las tasas de cambio en caliente (3 niveles)
export async function fetchExchangeRates() {
  let ratesResult = null;

  // Nivel 1: Edge Function de Supabase
  try {
    const supabaseUrl = import.meta.env.VITE_SALDO_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/get-rates`, {
      headers: {
        'apikey': import.meta.env.VITE_SALDO_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SALDO_SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.rates) {
        ratesResult = {
          bcv: parseFloat(data.rates.bcv),
          usdt: parseFloat(data.rates.usdt),
          eur: parseFloat(data.rates.eur),
          date: new Date().toISOString().substring(0, 10),
          status: 'live'
        };
      }
    }
  } catch (error) {
    console.warn("Fallo Nivel 1 (Supabase Edge Function):", error);
  }

  // Nivel 2: DolarApi Directo
  if (!ratesResult) {
    try {
      const bcvRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (bcvRes.ok) {
        const bcvData = await bcvRes.json();
        const bcv = parseFloat(bcvData.promedio || bcvData.precio || FALLBACK_RATES.bcv);
        
        // Paralelo de DolarApi
        let usdt = bcv * 1.02;
        try {
          const pRes = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData && (pData.promedio || pData.precio)) {
              usdt = parseFloat(pData.promedio || pData.precio);
            }
          }
        } catch (e) {
          console.warn("Error obteniendo paralelo de DolarApi:", e);
        }

        ratesResult = {
          bcv,
          usdt,
          eur: bcv * 1.09,
          date: new Date().toISOString().substring(0, 10),
          status: 'dolarapi'
        };
      }
    } catch (error) {
      console.warn("Fallo Nivel 2 (DolarApi):", error);
    }
  }

  if (!ratesResult) {
    ratesResult = FALLBACK_RATES;
  }

  // Guardar en la caché de Supabase daily_rates
  if (ratesResult && ratesResult.bcv) {
    const todayStr = new Date().toISOString().substring(0, 10);
    supabase.from('daily_rates').upsert({
      date: todayStr,
      rate_bcv: ratesResult.bcv,
      rate_p2p: ratesResult.usdt,
      rate_eur: ratesResult.eur
    }).then(({ error }) => {
      if (error) console.warn("Error guardando tasa diaria en Supabase:", error);
    });
  }

  return ratesResult;
}

/**
 * Si una fecha cae en Sábado o Domingo, devuelve la fecha del Lunes siguiente.
 * (Ejemplo: Sábado 7 -> Lunes 9).
 */
export function getEffectiveRateDate(dateStr) {
  if (!dateStr) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado

  if (dayOfWeek === 6) { // Sábado -> Lunes (+2 días)
    dateObj.setDate(dateObj.getDate() + 2);
  } else if (dayOfWeek === 0) { // Domingo -> Lunes (+1 día)
    dateObj.setDate(dateObj.getDate() + 1);
  }

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Obtener tasas de cambio para una fecha específica (con soporte para regla de fin de semana -> Lunes)
export async function fetchRatesForDate(inputDateStr) {
  const dateStr = getEffectiveRateDate(inputDateStr);
  const todayStr = new Date().toISOString().substring(0, 10);
  
  if (!dateStr || dateStr === todayStr) {
    const live = await fetchExchangeRates();
    return { ...live, effectiveDate: dateStr, isWeekendAdjusted: dateStr !== inputDateStr };
  }

  // 1. Intentar consultar en la tabla daily_rates de Supabase
  try {
    const { data, error } = await supabase
      .from('daily_rates')
      .select('rate_bcv, rate_p2p, rate_eur')
      .eq('date', dateStr)
      .maybeSingle();

    if (!error && data) {
      return {
        bcv: parseFloat(data.rate_bcv),
        usdt: parseFloat(data.rate_p2p),
        eur: parseFloat(data.rate_eur || (parseFloat(data.rate_bcv) * 1.09)),
        date: dateStr,
        status: 'cache'
      };
    }
  } catch (err) {
    console.warn("Error leyendo daily_rates de Supabase:", err);
  }

  // 2. Consultar DolarApi histórico por fecha (ve.dolarapi.com/v1/historicos/dolares/oficial/YYYY/MM/DD)
  let fetchedBcv = null;
  let fetchedUsdt = null;

  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      const pathDate = `${year}/${month}/${day}`;
      
      const [bcvRes, pRes] = await Promise.all([
        fetch(`https://ve.dolarapi.com/v1/historicos/dolares/oficial/${pathDate}`),
        fetch(`https://ve.dolarapi.com/v1/historicos/dolares/paralelo/${pathDate}`)
      ]);

      if (bcvRes.ok) {
        const bcvData = await bcvRes.json();
        if (bcvData && (bcvData.promedio || bcvData.precio)) {
          fetchedBcv = parseFloat(bcvData.promedio || bcvData.precio);
        }
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData && (pData.promedio || pData.precio)) {
          fetchedUsdt = parseFloat(pData.promedio || pData.precio);
        }
      }
    }
  } catch (e) {
    console.warn("Fallo DolarApi histórico por fecha:", e);
  }

  // 3. Si se obtuvo una tasa válida, calcular derivados y guardar en caché daily_rates
  if (fetchedBcv) {
    const finalUsdt = fetchedUsdt || (fetchedBcv * 1.02);
    const finalEur = fetchedBcv * 1.09;

    supabase.from('daily_rates').upsert({
      date: dateStr,
      rate_bcv: fetchedBcv,
      rate_p2p: finalUsdt,
      rate_eur: finalEur
    }).then(({ error }) => {
      if (error) console.warn("Error guardando en daily_rates:", error);
    });

    return {
      bcv: fetchedBcv,
      usdt: finalUsdt,
      eur: finalEur,
      date: dateStr,
      status: 'live_historical'
    };
  }

  // 4. Fallback si es fin de semana / feriado: buscar la tasa de la fecha más reciente previa
  try {
    const { data } = await supabase
      .from('daily_rates')
      .select('rate_bcv, rate_p2p, rate_eur')
      .lt('date', dateStr)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return {
        bcv: parseFloat(data.rate_bcv),
        usdt: parseFloat(data.rate_p2p),
        eur: parseFloat(data.rate_eur || (parseFloat(data.rate_bcv) * 1.09)),
        date: dateStr,
        status: 'nearest_historical'
      };
    }
  } catch (e) {
    console.warn("Error buscando registro histórico previo:", e);
  }

  // Fallback final: Tasas actuales en vivo
  const liveRates = await fetchExchangeRates();
  return {
    ...liveRates,
    date: dateStr,
    status: 'fallback_live'
  };
}
