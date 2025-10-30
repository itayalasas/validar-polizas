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
  const grantType = import.meta.env.VITE_GRANT_TYPE || 'client_credentials';
  const scope = import.meta.env.VITE_SCOPE;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error('Missing required environment variables for authentication');
  }

  const bodyParts = [
    `client_id=${clientId}`,
    `client_secret=${clientSecret}`,
    `grant_type=${grantType}`,
    `scope=${encodeURIComponent(scope)}`
  ];
  const body = bodyParts.join('&');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token response error:', response.status, errorText);
    throw new Error('Error al obtener el token de autenticación');
  }

  const data: TokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;

  return data.access_token;
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
    const cleanCode = code.trim();
    const codeWithoutSpaces = cleanCode.replace(/\s/g, '');

    if (!/^\d{12}$/.test(codeWithoutSpaces)) {
      return {
        success: false,
        message: 'El código debe contener exactamente 12 dígitos',
      };
    }

    const token = await getAccessToken();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    const codigoWithQuotes = `"${cleanCode}"`;
    const encodedCodigo = encodeURIComponent(codigoWithQuotes);
    const url = `${apiBaseUrl}?codigo=${encodedCodigo}`;

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
      const errorText = await response.text();
      console.error('API response error:', response.status, errorText);
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
