import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { verifyPolicyCode } from './services/policyApi';
import { PolicyData } from './types/policy';
import { Captcha } from './components/Captcha';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PolicyCard } from './components/PolicyCard';
import { SearchIcon } from './components/SearchIcon';
import BotonInactivo from './assets/boton-inactivo-validar.svg';
import BotonCargando from './assets/boton-cargando.svg';

function App() {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);
  const [lastVerifiedCode, setLastVerifiedCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Por favor ingrese un código de verificación');
      return;
    }

    if (!isCaptchaValid) {
      setError('Por favor complete la verificación anti-robot');
      return;
    }

    setIsLoading(true);
    setError('');
    setPolicyData(null);

    try {
      const response = await verifyPolicyCode(verificationCode);
      
      if (response.success && response.data) {
        setPolicyData(response.data);
        setLastVerifiedCode(verificationCode);
      } else {
        setError(response.message || 'Error al verificar el código');
      }
    } catch (err) {
      setError('Error de conexión. Por favor intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setVerificationCode('');
    setPolicyData(null);
    setError('');
    setIsCaptchaValid(false);
    setCaptchaResetTrigger(prev => prev + 1);
    setLastVerifiedCode('');
  };

  const handleCodeChange = (newCode: string) => {
    // Solo permitir números
    const numbersOnly = newCode.replace(/\D/g, '');

    // Limitar a 12 dígitos
    const limited = numbersOnly.slice(0, 12);

    // Formatear como XXXX XXXX XXXX
    let formatted = '';
    for (let i = 0; i < limited.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += limited[i];
    }

    setVerificationCode(formatted);

    // Si ya hay una póliza consultada y el código cambió, resetear captcha
    if (policyData && lastVerifiedCode && formatted !== lastVerifiedCode) {
      setIsCaptchaValid(false);
      setCaptchaResetTrigger(prev => prev + 1);
      setPolicyData(null);
      setError('');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DFEAFF' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-16 mb-6">
            <img
              src="/Descriptor Seguros azul.png"
              alt="SEGUROS"
              className="h-14"
            />
            <img
              src="https://www.segurossura.com.uy/wp-content/themes/sura/assets/images/logo-sura.svg"
              alt="SURA"
              className="h-16"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#0033a0' }}>
            Sistema de verificación de pólizas
          </h1>
          <p className="text-gray-600">
            Ingrese su código de verificación para consultar la información de su póliza de seguros
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Code Input */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-sura-blue mb-2">
                  Código de Verificación
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="code"
                    value={verificationCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="Ingrese su código de verificación"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-all duration-200 text-lg"
                    disabled={isLoading}
                    inputMode="numeric"
                  />
                  <SearchIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </div>

              {/* Captcha */}
              <Captcha onValidation={setIsCaptchaValid} resetTrigger={captchaResetTrigger} />

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center">
                {!verificationCode.trim() || !isCaptchaValid ? (
                  <button
                    type="button"
                    disabled
                    className="relative h-14 rounded-full overflow-hidden cursor-not-allowed"
                  >
                    <img
                      src={BotonInactivo}
                      alt="Validar póliza"
                      className="h-full object-contain"
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-8 rounded-full transition-colors duration-200 flex items-center justify-center space-x-2 min-w-[163px]"
                    style={{ backgroundColor: '#2D6DF6' }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span>Validar póliza</span>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          {policyData && <PolicyCard policy={policyData} />}

         
      </div>
    </div>
  );
}

export default App;