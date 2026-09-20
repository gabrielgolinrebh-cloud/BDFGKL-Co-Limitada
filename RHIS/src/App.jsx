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
//aaaaaaaa
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f7ff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Cabeçalho do Site */}
      <header style={{ backgroundColor: '#f0f7ff', padding: '0.67rem 1.33rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e3a8a', fontWeight: 'bold' }}>RHIS</h1>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button
              onClick={() => setScreen('home')}
              aria-current={screen === 'home' ? 'page' : undefined}
              style={{ background: 'none', border: 'none', color: screen === 'home' ? '#0284c7' : '#000000', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
            >
              home
            </button>
            <button
              onClick={() => setScreen('calculo')}
              aria-current={screen === 'calculo' || screen === 'exportacao' ? 'page' : undefined}
              style={{ background: 'none', border: 'none', color: screen === 'calculo' || screen === 'exportacao' ? '#0284c7' : '#000000', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
            >
              interjornada
            </button>
            <button
              onClick={() => setScreen('sobreaviso')}
              aria-current={screen === 'sobreaviso' ? 'page' : undefined}
              style={{ background: 'none', border: 'none', color: screen === 'sobreaviso' ? '#0284c7' : '#000000', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
            >
              sobreaviso
            </button>
          </nav>
        </div>

        {/* Área do Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.67rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#374151' }}>
            Olá, {userName}
          </span>
          <img
            src={userAvatar}
            onClick={() => setIsProfileOpen(true)}
            alt="Perfil"
            style={{ width: '2rem', height: '2rem', borderRadius: '50%', cursor: 'pointer', border: '2px solid #0284c7', objectFit: 'cover', backgroundColor: '#fff' }}
          />
        </div>
      </header>

      {/* Conteúdo das telas */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {screen === 'home' && <Home />}
          
          {screen === 'calculo' && (
            <Calculo 
              onCalculate={() => setScreen('exportacao')}
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