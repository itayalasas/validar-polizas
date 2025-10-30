import { ApiResponse, ApiPolicyResponse, PolicyData } from '../types/policy';

const transformApiResponse = (apiData: ApiPolicyResponse): PolicyData => {
  return {
    id: apiData.codigoVerificacion,
    tomador: apiData.nombreTomador,
    asegurado: apiData.nombreAsegurado,
    vigencia: {
      inicio: apiData.fechaInicioVigencia,
      fin: apiData.fechaFinVigencia,
    },
    estadoVigencia: apiData.estadoVigencia,
  };
};

export const verifyPolicyCode = async (code: string): Promise<ApiResponse> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuración de Supabase no encontrada');
    }

    const url = `${supabaseUrl}/functions/v1/verify-policy`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        message: result.message || 'Error al verificar la póliza',
      };
    }

    const apiData: ApiPolicyResponse = result.data;
    const policyData = transformApiResponse(apiData);

    if (apiData.estadoVigencia !== 'VIGENTE') {
      return {
        success: false,
        message: `La póliza no está vigente. Estado actual: ${apiData.estadoVigencia}`,
        data: policyData,
      };
    }

    return {
      success: true,
      data: policyData,
    };
  } catch (error) {
    console.error('Error verificando póliza:', error);
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Error al verificar la póliza. Inténtelo nuevamente.',
    };
  }
};
