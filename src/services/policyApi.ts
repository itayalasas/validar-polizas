import { ApiResponse, ApiPolicyResponse, PolicyData } from '../types/policy';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiration: number = 0;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  const tokenUrl = import.meta.env.VITE_AUTH_TOKEN_URL;
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_CLIENT_SECRET;
  const grantType = import.meta.env.VITE_GRANT_TYPE;
  const scope = import.meta.env.VITE_SCOPE;

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', grantType);
  params.append('scope', scope);

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Error al obtener el token de autenticación');
    }

    const data: TokenResponse = await response.json();
    cachedToken = data.access_token;
    tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;

    return data.access_token;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    throw new Error('No se pudo autenticar con el servicio');
  }
};

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
    const token = await getAccessToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const url = `${apiBaseUrl}/polizas?codigo="${code}"`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: 'Código de verificación no encontrado. Verifique que el código sea correcto.',
        };
      }
      throw new Error('Error al verificar la póliza');
    }

    const apiData: ApiPolicyResponse = await response.json();
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
