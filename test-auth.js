import dotenv from 'dotenv';
dotenv.config();

const tokenUrl = process.env.VITE_AUTH_TOKEN_URL;
const clientId = process.env.VITE_CLIENT_ID;
const clientSecret = process.env.VITE_CLIENT_SECRET;
const grantType = process.env.VITE_GRANT_TYPE;
const scope = process.env.VITE_SCOPE;

console.log('Testing authentication...');
console.log('Token URL:', tokenUrl);
console.log('Client ID:', clientId);
console.log('Grant Type:', grantType);
console.log('Scope:', scope);

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

  console.log('\nResponse status:', response.status);

  const text = await response.text();
  console.log('Response body:', text);

  if (response.ok) {
    const data = JSON.parse(text);
    console.log('\n✅ Authentication successful!');
    console.log('Token type:', data.token_type);
    console.log('Expires in:', data.expires_in, 'seconds');
  } else {
    console.log('\n❌ Authentication failed');
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
