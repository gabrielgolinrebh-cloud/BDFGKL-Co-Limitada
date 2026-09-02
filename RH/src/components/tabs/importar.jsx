// ImportarPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './styles';

const STORAGE_KEY_ROWS = '@rh_dp:csv_rows';
const STORAGE_KEY_FILE = '@rh_dp:ultimo_arquivo';
const STORAGE_KEY_HISTORY = '@rh_dp:importacoes_recentes';

function parsearMinutos(valor) {
  const v = String(valor || '').trim().replace(/^\uFEFF/, '').replace(',', '.');
  if (!v || v === '-') return 0;
  if (v.includes(':')) {
    const partes = v.split(':');
    const h = parseInt(partes[0], 10) || 0;
    const m = parseInt(partes[1], 10) || 0;
    return h * 60 + m;
  }
  const h = parseFloat(v);
  if (isNaN(h)) return 0;
  return Math.round(h * 60);
}

function parseCSVRows(text) {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
  const findIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
  const idxNome = findIndex(['nome', 'colaborador', 'funcionario', 'empregado']);
  const idxData = findIndex(['data', 'dia', 'competencia']);
  const idxInter = findIndex(['interjornada', 'intervalo', 'jornada', 'descanso']);
  if (idxNome === -1 || idxInter === -1) {
    throw new Error('Não foi possível identificar as colunas de "Nome" e "Interjornada" no CSV.');
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const nome = cols[idxNome] || '';
    const data = idxData !== -1 ? (cols[idxData] || '') : '';
    const interjornada = cols[idxInter] || '';
    if (nome) {
      rows.push({ nome, data, interjornada });
    }
  }
  return rows;
}

export function ImportarPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.warn(e);
    }
  };

  const processarTextoCSV = async (text, fileName) => {
    try {
      setLoading(true);
      const rows = parseCSVRows(text);
      if (rows.length === 0) {
        alert('O arquivo CSV parece estar vazio ou em formato inválido.');
        setLoading(false);
        return;
      }
      const fileInfo = { name: fileName, importedAt: new Date().toLocaleDateString('pt-BR'), records: rows.length };
      const novoHistoricoItem = { id: Date.now().toString(), name: fileName, date: new Date().toLocaleDateString('pt-BR'), records: rows.length, rows };
      const novoHistorico = [novoHistoricoItem, ...history.filter(h => h.name !== fileName)].slice(0, 10);
      
      localStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(rows));
      localStorage.setItem(STORAGE_KEY_FILE, JSON.stringify(fileInfo));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(novoHistorico));
      setHistory(novoHistorico);
      setLoading(false);
      navigate('/calculos');
    } catch (e) {
      setLoading(false);
      alert(e.message || 'Não foi possível processar o arquivo.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      processarTextoCSV(event.target.result, file.name);
    };
    reader.readAsText(file);
  };

  const limparHistorico = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      setHistory([]);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.contentInner}>
          <label style={styles.dropzone}>
            {loading ? (
              <div>Carregando...</div>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                <div style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 }}>Importar arquivo CSV</div>
                <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>Clique para selecionar o arquivo de espelho de ponto</div>
                <input type="file" accept=".csv,text/plain" onChange={handleFileChange} style={{ display: 'none' }} />
              </>
            )}
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={styles.sectionTitle}>Importações recentes</div>
            {history.length > 0 && (
              <button onClick={limparHistorico} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontWeight: '700' }}>Limpar histórico</button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Nenhum histórico recente.</div>
          ) : (
            history.map(item => (
              <div key={item.id} style={styles.historyItem} onClick={() => processarTextoCSV(JSON.stringify(item.rows), item.name)}>
                <div style={{ fontSize: 18, marginRight: 10 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{item.date} · {item.records} registros</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}