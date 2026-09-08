import React, { useState } from 'react';
import Home from './Home';
import Calculo from './Calculo';
import Exportacao from './Exportacao';
import Perfil from './Perfil';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') || 'Geregotango'
  );
  const [userAvatar, setUserAvatar] = useState(
    () => localStorage.getItem('userAvatar') || 'https://via.placeholder.com/80'
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-100 flex flex-col justify-between relative shadow-2xl border-x border-gray-200">
      {/* Cabeçalho exibido em todas as telas exceto na Home */}
      {screen !== 'home' && (
        <div>
          <header className="bg-indigo-900 text-white p-4 flex justify-between items-center">
            <button
              onClick={() => setScreen('home')}
              className="font-bold text-sm"
            >
              Olá, {userName}
            </button>
            <img
              src={userAvatar}
              onClick={() => setIsProfileOpen(true)}
              alt="Perfil"
              className="w-8 h-8 rounded-full cursor-pointer border border-white object-cover"
            />
          </header>
        </div>
      )}

      {/* Conteúdo das telas */}
      <main className="flex-1 overflow-y-auto">
        {screen === 'home' && <Home onNext={() => setScreen('calculo')} />}
        {screen === 'calculo' && (
          <Calculo onCalculate={() => setScreen('exportacao')} />
        )}
        {screen === 'exportacao' && (
          <Exportacao onReset={() => setScreen('calculo')} />
        )}
      </main>

      {/* Modal de perfil */}
      {isProfileOpen && (
        <Perfil
          onClose={() => setIsProfileOpen(false)}
          userName={userName}
          setUserName={setUserName}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
        />
      )}
    </div>
  );
}