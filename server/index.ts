import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

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

  const tokenUrl = process.env.VITE_AUTH_TOKEN_URL;
  const clientId = process.env.VITE_CLIENT_ID;
  const clientSecret = process.env.VITE_CLIENT_SECRET;
  const grantType = process.env.VITE_GRANT_TYPE || 'client_credentials';
  const scope = process.env.VITE_SCOPE;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error('Missing required environment variables for authentication');
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', grantType);
  params.append('scope', scope);

  if (!isProduction) {
    console.log('=== Token Request Debug ===');
    console.log('URL:', tokenUrl);
    console.log('client_id:', clientId);
    console.log('grant_type:', grantType);
    console.log('scope:', scope);
  }

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

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Código de verificación requerido',
      });
    }

    const cleanCode = code.trim();
    const codeWithoutSpaces = cleanCode.replace(/\s/g, '');

    if (!/^\d{12}$/.test(codeWithoutSpaces)) {
      return res.status(400).json({
        success: false,
        message: 'El código debe contener exactamente 12 dígitos',
      });
    }

    const token = await getAccessToken();
    const apiBaseUrl = process.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    const codigoWithQuotes = `"${cleanCode}"`;
    const encodedCodigo = encodeURIComponent(codigoWithQuotes);
    const url = `${apiBaseUrl}?codigo=${encodedCodigo}`;

    if (!isProduction) {
      console.log('Verificando póliza con código:', code.replace(/\d/g, '*'));
      console.log('Request URL configured');
    }

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
