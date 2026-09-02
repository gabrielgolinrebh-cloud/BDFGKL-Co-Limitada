// ImportarPage.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './styles';

const STORAGE_KEY_ROWS = '@rh_dp:csv_rows';
const STORAGE_KEY_FILE = '@rh_dp:ultimo_arquivo';
const STORAGE_KEY_HISTORY = '@rh_dp:importacoes_recentes';

export function ImportarPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (rawHistory) {
      try {
        setHistoryRecords(JSON.parse(rawHistory));
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  const openFileDialog = () => inputRef.current?.click();

  const processarArquivo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length < 2) {
          alert('O arquivo parece estar vazio ou sem linhas suficientes.');
          return;
        }
        const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
        const findIndex = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        const idxNome = findIndex(['nome', 'colaborador', 'funcionario', 'empregado']);
        const idxData = findIndex(['data', 'dia', 'competencia']);
        const idxInter = findIndex(['interjornada', 'intervalo', 'jornada', 'descanso']);

        if (idxNome === -1 || idxInter === -1) {
          alert('Não foi possível identificar as colunas de "Nome" e "Interjornada" no CSV.');
          return;
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

        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const fileInfo = { name: file.name, importedAt: dateStr, records: rows.length };

        const newHistoryItem = {
          id: Date.now(),
          name: file.name,
          date: dateStr,
          records: rows.length,
          rows: rows
        };

        const updatedHistory = [newHistoryItem, ...historyRecords.slice(0, 9)];

        localStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(rows));
        localStorage.setItem(STORAGE_KEY_FILE, JSON.stringify(fileInfo));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

        navigate('/calculos');
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFiles = (fileList) => {
    const file = fileList?.[0];
    if (file) processarArquivo(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDownloadTemplate = () => {
    const csvContent = '\uFEFFColaborador;Data;Interjornada\nJoão Silva;01/05/2024;09:30\nMaria Santos;02/05/2024;10:15\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_interjornada.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.contentInner}>
          <div style={styles.sectionTitle}>Importar Tabela de Ponto</div>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
            Importe sua planilha de interjornada em formato CSV para realizar os cálculos.
          </p>

          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              backgroundColor: dragActive ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
              marginBottom: 16,
              transition: 'background-color 0.2s'
            }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>
              Arraste e solte sua planilha aqui
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>ou</div>
            <button
              type="button"
              style={{ ...styles.actionFilled, display: 'inline-block', width: 'auto', padding: '10px 20px' }}
              onClick={(e) => { e.stopPropagation(); openFileDialog(); }}
            >
              <span style={styles.actionFilledText}>Selecionar Arquivo</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center' }}>
            Formatos aceitos: .csv (separado por vírgula ou ponto e vírgula)
          </div>

          <div style={{ ...styles.fileCard, cursor: 'pointer', backgroundColor: '#f1f5f9' }} onClick={handleDownloadTemplate}>
            <div style={{ fontSize: 20 }}>📥</div>
            <div style={{ flex: 1, marginLeft: 10 }}>
              <div style={styles.fileCardName}>Baixar modelo de planilha</div>
              <div style={styles.fileCardMeta}>Arquivo CSV modelo para preenchimento correto</div>
            </div>
          </div>

          {historyRecords.length > 0 && (
            <>
              <div style={{ ...styles.sectionTitle, marginTop: 24 }}>Importações recentes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historyRecords.slice(0, 3).map((item) => (
                  <div key={item.id} style={styles.fileCard}>
                    <div style={{ fontSize: 20 }}>📋</div>
                    <div style={{ flex: 1, marginLeft: 10 }}>
                      <div style={styles.fileCardName}>{item.name}</div>
                      <div style={styles.fileCardMeta}>{item.date} · {item.records} registros</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}