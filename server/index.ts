import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import https from 'https';
import http from 'http';

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

  console.log('🔐 [AUTH] Iniciando solicitud de token...');

  const bodyParts = [
    `client_id=${clientId}`,
    `client_secret=${clientSecret}`,
    `grant_type=${grantType}`,
    `scope=${encodeURIComponent(scope)}`
  ];
  const body = bodyParts.join('&');

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(tokenUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('🔐 [AUTH] Respuesta recibida - Status:', res.statusCode);

        if (res.statusCode === 200) {
          try {
            const jsonData: TokenResponse = JSON.parse(data);
            console.log('✅ [AUTH] Token obtenido exitosamente');

            cachedToken = jsonData.access_token;
            tokenExpiration = Date.now() + (jsonData.expires_in * 1000) - 60000;

            resolve(jsonData.access_token);
          } catch (e) {
            console.error('❌ [AUTH] Error parseando respuesta:', e);
            reject(new Error('Error al parsear respuesta del servidor'));
          }
        } else {
          console.error('❌ [AUTH] Token response error:', res.statusCode, data);
          reject(new Error('Error al obtener el token de autenticación'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ [AUTH] Error en request:', error);
      reject(new Error('No se pudo autenticar con el servicio'));
    });

    req.write(body);
    req.end();
  });
};

app.post('/api/verify-policy', async (req: Request, res: Response) => {
  try {
    console.log('📋 [VERIFY] Nueva solicitud de verificación de póliza');
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      console.log('❌ [VERIFY] Código de verificación no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'Código de verificación requerido',
      });
    }

    const cleanCode = code.trim();
    const codeWithoutSpaces = cleanCode.replace(/\s/g, '');

    console.log('📋 [VERIFY] Código recibido (oculto):', code.replace(/\d/g, '*'));
    console.log('📋 [VERIFY] Código limpio (sin espacios, oculto):', codeWithoutSpaces.replace(/\d/g, '*'));
    console.log('📋 [VERIFY] Longitud del código:', codeWithoutSpaces.length);

    if (!/^\d{12}$/.test(codeWithoutSpaces)) {
      console.log('❌ [VERIFY] Código inválido - No tiene 12 dígitos');
      return res.status(400).json({
        success: false,
        message: 'El código debe contener exactamente 12 dígitos',
      });
    }

    console.log('📋 [VERIFY] Código válido, obteniendo token de acceso...');
    const token = await getAccessToken();
    console.log('✅ [VERIFY] Token obtenido, procediendo a verificar póliza');
    const apiBaseUrl = process.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      console.error('❌ [VERIFY] API base URL no configurada');
      throw new Error('API base URL not configured');
    }

    const codigoWithQuotes = `"${cleanCode}"`;
    const encodedCodigo = encodeURIComponent(codigoWithQuotes);
    const url = `${apiBaseUrl}?codigo=${encodedCodigo}`;

    console.log('🌐 [VERIFY] API Base URL:', apiBaseUrl);
    console.log('🌐 [VERIFY] URL completa (código oculto):', url.replace(/codigo=.*/, 'codigo=***'));
    console.log('🌐 [VERIFY] Enviando petición GET a API de Sura...');

    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // @ts-ignore
      agent: (_parsedURL: URL) => {
        if (_parsedURL.protocol === 'http:') {
          return httpAgent;
        } else {
          return httpsAgent;
        }
      }
    });

    console.log('🌐 [VERIFY] Respuesta de API Sura - Status:', response.status);
    console.log('🌐 [VERIFY] Response OK:', response.ok);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('❌ [VERIFY] Póliza no encontrada (404)');
        return res.status(404).json({
          success: false,
          message: 'Código de verificación no encontrado. Verifique que el código sea correcto.',
        });
      }
      const errorText = await response.text();
      console.error('❌ [VERIFY] API response error:', response.status, errorText);
      throw new Error('Error al verificar la póliza');
    }

    const policyData: ApiPolicyResponse = await response.json();
    console.log('✅ [VERIFY] Póliza encontrada exitosamente');
    console.log('✅ [VERIFY] Nombre tomador:', policyData.nombreTomador);
    console.log('✅ [VERIFY] Estado vigencia:', policyData.estadoVigencia);

    return res.status(200).json({
      success: true,
      data: policyData,
    });
  } catch (error) {
    console.error('❌ [VERIFY] Error verificando póliza:', error);
    console.error('❌ [VERIFY] Error stack:', error instanceof Error ? error.stack : 'unknown');
    return res.status(500).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Error al verificar la póliza. Inténtelo nuevamente.',
    });
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('📍 Environment Variables Status:');
  console.log('   - VITE_AUTH_TOKEN_URL:', process.env.VITE_AUTH_TOKEN_URL ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_CLIENT_ID:', process.env.VITE_CLIENT_ID ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_CLIENT_SECRET:', process.env.VITE_CLIENT_SECRET ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_GRANT_TYPE:', process.env.VITE_GRANT_TYPE ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_SCOPE:', process.env.VITE_SCOPE ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL ? '✅ Configurado' : '❌ NO configurado');
  console.log('='.repeat(60));
});
