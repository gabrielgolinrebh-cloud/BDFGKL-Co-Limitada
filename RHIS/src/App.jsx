import React, { useState } from 'react';
import Home from './Home';
import Calculo from './Calculo';
import CalculoSobreaviso from './CalculoSobreaviso';
import Exportacao from './Exportacao';
import Perfil from './Perfil';
import './App.css';

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      
      {/* Cabeçalho do Site */}
      <header style={{ backgroundColor: '#ffffff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div>
          {/* Espaço para logo ou título, se necessário, ou apenas um botão voltar */}
          {screen !== 'home' ? (
            <button 
              onClick={() => setScreen('home')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              &larr; Voltar para Home
            </button>
          ) : (
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#1e3a8a', fontWeight: 'bold' }}>RHIS</h1>
          )}
        </div>

        {/* Área do Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#374151' }}>
            Olá, {userName}
          </span>
          <img
            src={userAvatar}
            onClick={() => setIsProfileOpen(true)}
            alt="Perfil"
            style={{ width: '3rem', height: '3rem', borderRadius: '50%', cursor: 'pointer', border: '2px solid #0284c7', objectFit: 'cover', backgroundColor: '#fff' }}
          />
        </div>
      </header>

      {/* Conteúdo das telas */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {screen === 'home' && <Home onNext={() => setScreen('calculo')} />}
          
          {screen === 'calculo' && (
            <Calculo 
              onCalculate={() => setScreen('exportacao')} 
              onCalculateSobreaviso={() => setScreen('sobreaviso')}
            />
          )}

          {screen === 'sobreaviso' && (
            <CalculoSobreaviso onBack={() => setScreen('calculo')} />
          )}

          {screen === 'exportacao' && (
            <Exportacao onReset={() => setScreen('calculo')} />
          )}
        </div>
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