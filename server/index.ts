import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ApiPolicyResponse {
  id: number;
  codigoVerificacion: string;
  nombreTomador: string;
  nombreAsegurado: string;
  fechaInicioVigencia: string;
  fechaFinVigencia: string;
  fechaCreacion: string;
  estadoVigencia: string;
}

let cachedToken: string | null = null;
let tokenExpiration: number = 0;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  const tokenUrl = process.env.VITE_AUTH_TOKEN_URL || 'https://login.microsoftonline.com/3c0bd4fe-1111-4d13-8e0c-7c33b9eb7581/oauth2/v2.0/token';
  const clientId = process.env.VITE_CLIENT_ID || '1fc6ca42-b37d-457b-a0d9-e0b5bf416f98';
  const clientSecret = process.env.VITE_CLIENT_SECRET || 'k158Q~6AjT.p9gXhYzryGYkL-0XSCloRYSFcobIO';
  const grantType = process.env.VITE_GRANT_TYPE || 'client_credentials';
  const scope = process.env.VITE_SCOPE || 'api://1fc6ca42-b37d-457b-a0d9-e0b5bf416f98/.default';

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
      const errorText = await response.text();
      console.error('Token response error:', response.status, errorText);
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

app.post('/api/verify-policy', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de verificación requerido',
      });
    }

    const token = await getAccessToken();
    const apiBaseUrl = process.env.VITE_API_BASE_URL || 'https://sura-portales-xapi-4o6opf.u1lglj.bra-s1.cloudhub.io/api/portales/valida-poliza';
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
        return res.status(404).json({
          success: false,
          message: 'Código de verificación no encontrado. Verifique que el código sea correcto.',
        });
      }
      const errorText = await response.text();
      console.error('API response error:', response.status, errorText);
      throw new Error('Error al verificar la póliza');
    }

    const policyData: ApiPolicyResponse = await response.json();

    return res.status(200).json({
      success: true,
      data: policyData,
    });
  } catch (error) {
    console.error('Error verificando póliza:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Error al verificar la póliza. Inténtelo nuevamente.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
