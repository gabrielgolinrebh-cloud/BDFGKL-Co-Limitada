// LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './styles';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !senha) {
      alert('Preencha todos os campos.');
      return;
    }
    localStorage.setItem('@rh_dp:usuario', JSON.stringify({ email }));
    navigate('/calculos');
  };

  return (
    <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ ...styles.contentInner, maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
          <div style={{ fontSize: 22, fontWeight: '800', color: '#1e293b' }}>RH / DP - Login</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Acesse o sistema de cálculo de interjornada</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: '700', color: '#475569', display: 'block', marginBottom: 6 }}>E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu.email@empresa.com" 
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'solid', boxSizing: 'border-box', fontSize: 14 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: '700', color: '#475569', display: 'block', marginBottom: 6 }}>Senha</label>
            <input 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="••••••••" 
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'solid', boxSizing: 'border-box', fontSize: 14 }}
            />
          </div>
          <button type="submit" style={{ ...styles.actionFilled, marginTop: 8 }}>
            <span style={styles.actionFilledText}>Entrar</span>
          </button>
        </form>
      </div>
    </div>
  );
}