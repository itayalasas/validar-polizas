import React from 'react';
import { Calendar } from 'lucide-react';
import { PolicyData } from '../types/policy';
import { CheckIcon } from './CheckIcon';
import personaSilueta from '../assets/persona_silueta.svg';

interface PolicyCardProps {
  policy: PolicyData;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({ policy }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isVigente = policy.estadoVigencia === 'VIGENTE';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CheckIcon className="text-green-500" size={24} />
          <h3 className="text-xl font-semibold text-gray-900">Póliza Verificada</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isVigente
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {policy.estadoVigencia}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <img src={personaSilueta} alt="" className="text-gray-400 mt-1 w-5 h-5" />
          <div>
            <p className="text-sm font-medium text-gray-500">Contratante</p>
            <p className="text-lg text-gray-900">{policy.tomador}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <img src={personaSilueta} alt="" className="text-gray-400 mt-1 w-5 h-5" />
          <div>
            <p className="text-sm font-medium text-gray-500">Asegurado</p>
            <p className="text-lg text-gray-900">{policy.asegurado}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Calendar className="text-gray-400 mt-1" size={20} />
          <div>
            <p className="text-sm font-medium text-gray-500">Vigencia</p>
            <p className="text-xs text-blue-700 italic">
              {formatDate(policy.vigencia.inicio)} - {formatDate(policy.vigencia.fin)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
