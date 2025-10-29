import React, { useState, useEffect } from 'react';
import CheckIcon from '../assets/check-circulo.svg';
import EquisCiruloIcon from '../assets/equis-circulo.svg';
import FlechasCirculando from '../assets/Flechas_circulando.svg';

interface CaptchaProps {
  onValidation: (isValid: boolean) => void;
  resetTrigger?: number;
}

export const Captcha: React.FC<CaptchaProps> = ({ onValidation, resetTrigger }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isValid, setIsValid] = useState(false);
  
  const generateNewProblem = () => {
    const newNum1 = Math.floor(Math.random() * 20) + 1;
    const newNum2 = Math.floor(Math.random() * 20) + 1;
    setNum1(newNum1);
    setNum2(newNum2);
    setUserAnswer('');
    setIsValid(false);
    onValidation(false);
  };

  useEffect(() => {
    generateNewProblem();
  }, []);

  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      generateNewProblem();
    }
  }, [resetTrigger]);

  useEffect(() => {
    const correctAnswer = num1 + num2;
    const valid = parseInt(userAnswer) === correctAnswer && userAnswer !== '';
    setIsValid(valid);
    onValidation(valid);
  }, [userAnswer, num1, num2, onValidation]);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-sura-blue">Verificación Anti-Robot</span>
        <button
          type="button"
          onClick={generateNewProblem}
          className="hover:opacity-80 transition-opacity"
          title="Generar nuevo problema"
        >
          <img src={FlechasCirculando} alt="Refrescar" className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="bg-white border border-gray-300 rounded px-3 py-2 font-mono text-lg">
          {num1} + {num2} = ?
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={userAnswer}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d+$/.test(value)) {
              setUserAnswer(value);
            }
          }}
          placeholder="Resultado"
          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:border-gray-400"
          style={{
            MozAppearance: 'textfield',
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
        {userAnswer && (
          <img
            src={isValid ? CheckIcon : EquisCiruloIcon}
            alt={isValid ? 'Correcto' : 'Incorrecto'}
            className="w-6 h-6"
          />
        )}
      </div>
    </div>
  );
};