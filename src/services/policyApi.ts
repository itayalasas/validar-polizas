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
    const url = 'http://localhost:3001/api/verify-policy';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    // Siempre retornar success true si se obtuvieron datos válidos
    // El estado de vigencia se mostrará en el badge
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
