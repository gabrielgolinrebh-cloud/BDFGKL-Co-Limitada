// CalculosPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles, modalStyles } from './styles';

const STORAGE_KEY_ROWS = '@rh_dp:csv_rows';
const STORAGE_KEY_FILE = '@rh_dp:ultimo_arquivo';
const STORAGE_KEY_RESULT = '@rh_dp:resultado_calculo';
const STORAGE_KEY_HISTORY = '@rh_dp:importacoes_recentes';
const LIMITE_MINUTOS = 11 * 60;

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

function formatarHorasMinutos(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calcularInterjornada(rows) {
  const mapa = {};
  for (const row of rows) {
    const mins = parsearMinutos(row.interjornada);
    const diferenca = LIMITE_MINUTOS - mins;
    if (!mapa[row.nome]) {
      mapa[row.nome] = { nome: row.nome, ocorrencias: 0, totalMinutosDevidos: 0 };
    }
    mapa[row.nome].ocorrencias += 1;
    mapa[row.nome].totalMinutosDevidos += diferenca > 0 ? diferenca : 0;
  }
  return Object.values(mapa).sort((a, b) => b.totalMinutosDevidos - a.totalMinutosDevidos);
}

export function CalculosPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [rows, setRows] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    try {
      setLoading(true);
      const rawRows = localStorage.getItem(STORAGE_KEY_ROWS);
      const rawFile = localStorage.getItem(STORAGE_KEY_FILE);
      const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (rawRows) {
        setRows(JSON.parse(rawRows));
        setCurrentPage(1);
      }
      if (rawFile) setFileInfo(JSON.parse(rawFile));
      if (rawHistory) setHistoryRecords(JSON.parse(rawHistory));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalcular = async () => {
    if (rows.length === 0) {
      alert('Importe um arquivo CSV primeiro.');
      return;
    }
    setCalculando(true);
    await new Promise((r) => setTimeout(r, 400));
    const res = calcularInterjornada(rows);
    setResultado(res);
    try {
      localStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(res));
    } catch (e) {
      console.warn(e);
    }
    setCalculando(false);
    navigate('/resultado');
  };

  const handleSelectHistory = (item) => {
    setHistoryModalVisible(false);
    if (!item.rows) {
      alert('Esta planilha não possui os dados brutos salvos.');
      return;
    }
    setRows(item.rows);
    const newFileInfo = { name: item.name, importedAt: item.date, records: item.records };
    setFileInfo(newFileInfo);
    setResultado(null);
    setCurrentPage(1);
    try {
      localStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(item.rows));
      localStorage.setItem(STORAGE_KEY_FILE, JSON.stringify(newFileInfo));
    } catch (e) {
      console.warn(e);
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
        <div>Carregando dados…</div>
      </div>
    );
  }

  const semDados = rows.length === 0;
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  const paginatedRows = rows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.contentInner}>
          {fileInfo ? (
            <div style={styles.fileCard}>
              <div style={styles.fileCardIcon}><div style={{ fontSize: 24 }}>📋</div></div>
              <div style={styles.fileCardInfo}>
                <div style={styles.fileCardName}>{fileInfo.name}</div>
                <div style={styles.fileCardMeta}>Importado em: {fileInfo.importedAt} · {fileInfo.records} registros</div>
              </div>
              <button onClick={() => setHistoryModalVisible(true)} style={styles.btnTrocar}><div style={styles.trocarIcon}>🔄</div></button>
            </div>
          ) : (
            <div style={styles.emptyFileCard} onClick={() => navigate('/importar')}>
              <div style={styles.emptyFileIcon}>📂</div>
              <div style={styles.emptyFileText}>Nenhum arquivo importado</div>
              <div style={styles.emptyFileLink}>Clique aqui para importar →</div>
            </div>
          )}

          {!semDados && (
            <>
              <div style={styles.sectionTitle}>Dados importados ({rows.length} linhas)</div>
              <div style={{ overflowX: 'auto', ...styles.tableWrap }}>
                <div style={{ minWidth: '100%' }}>
                  <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 130 }}>Nome</div>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 60 }}>Data</div>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 110 }}>Interjornada</div>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 100 }}>Diferença (11h−)</div>
                  </div>
                  {paginatedRows.map((row, idx) => {
                    const mins = parsearMinutos(row.interjornada);
                    const diff = LIMITE_MINUTOS - mins;
                    const isMenorQue8h = mins < 480;
                    return (
                      <div key={`${currentPage}-${idx}`} style={{ ...styles.tableRow, ...(idx % 2 === 1 ? styles.tableRowAlt : {}) }}>
                        <div style={{ ...styles.tableCell, ...styles.tableCellBold, width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nome}</div>
                        <div style={{ ...styles.tableCell, width: 60 }}>{row.data}</div>
                        <div style={{ ...styles.tableCell, width: 110, ...(isMenorQue8h ? { color: '#ef4444', fontWeight: 'bold' } : {}) }}>{row.interjornada}</div>
                        <div style={{ ...styles.tableCell, ...styles.tableCellBlackBold, width: 100 }}>{formatarHorasMinutos(diff > 0 ? diff : 0)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {totalPages > 1 && (
                <div style={styles.paginationContainer}>
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}>
                    <span style={{ ...(currentPage === 1 ? { color: '#94a3b8' } : {}) }}>‹</span>
                  </button>
                  <div style={styles.pageNumbersWrap}>
                    {getPageNumbers().map((p, index) => {
                      if (p === '...') return <span key={`ellipsis-${index}`} style={styles.pageEllipsis}>...</span>;
                      return (
                        <button key={`page-${p}`} onClick={() => setCurrentPage(p)} style={{ ...styles.pageNumBtn, ...(currentPage === p ? styles.pageNumBtnActive : {}) }}>
                          <span style={{ ...(currentPage === p ? styles.pageNumTextActive : styles.pageNumText) }}>{p}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}>
                    <span style={{ ...(currentPage === totalPages ? { color: '#94a3b8' } : {}) }}>›</span>
                  </button>
                </div>
              )}
            </>
          )}

          {resultado && (
            <>
              <div style={{ ...styles.sectionTitle, marginTop: 8 }}>Resultado do cálculo — por colaborador</div>
              <div style={{ overflowX: 'auto', ...styles.tableWrap }}>
                <div style={{ minWidth: '100%' }}>
                  <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 140 }}>Colaborador</div>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 80 }}>Ocorrências</div>
                    <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 110 }}>Total a pagar</div>
                  </div>
                  {resultado.map((r, idx) => (
                    <div key={r.nome} style={{ ...styles.tableRow, ...(idx % 2 === 1 ? styles.tableRowAlt : {}) }}>
                      <div style={{ ...styles.tableCell, ...styles.tableCellBold, width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                      <div style={{ ...styles.tableCell, width: 80, textAlign: 'center' }}>{r.ocorrencias}</div>
                      <div style={{ ...styles.tableCell, ...styles.tableCellBlackBold, width: 110 }}>{formatarHorasMinutos(r.totalMinutosDevidos)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={styles.configCard}>
            <div style={styles.configTitle}>Configuração do cálculo</div>
            <div style={styles.configRow}>
              <div style={styles.configLabel}>Tipo</div>
              <div style={styles.configBadge}><span style={styles.configBadgeText}>⏱ Interjornada insuficiente</span></div>
            </div>
            <div style={styles.configRow}>
              <div style={styles.configLabel}>Limite aplicado</div>
              <div style={styles.configBadge}><span style={styles.configBadgeText}>11 horas</span></div>
            </div>
            <div style={styles.configRow}>
              <div style={styles.configLabel}>Registros</div>
              <div style={styles.configBadge}><span style={styles.configBadgeText}>{rows.length}</span></div>
            </div>
            <button style={{ ...styles.calcBtn, ...((semDados || calculando) ? styles.calcBtnDisabled : {}) }} onClick={handleCalcular} disabled={semDados || calculando}>
              {calculando ? <div>Calculando...</div> : <span style={styles.calcBtnText}>{semDados ? 'Importe um arquivo primeiro' : 'Calcular'}</span>}
            </button>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>ℹ️</div>
            <div style={styles.infoBody}>
              <div style={styles.infoTitle}>Como funciona o cálculo</div>
              <div style={styles.infoDesc}>Para cada linha do CSV, calcula-se a diferença entre 11h e o valor de interjornada registrado.<br/><br/>Os valores de cada colaborador são somados.</div>
            </div>
          </div>
        </div>
      </div>

      {historyModalVisible && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={modalStyles.title}>Planilhas Recentes</div>
              <button onClick={() => setHistoryModalVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', fontWeight: 'bold' }}>✕</button>
            </div>
            {historyRecords.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>Nenhum histórico encontrado.</div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {historyRecords.map(item => (
                  <div key={item.id} style={modalStyles.historyItem} onClick={() => handleSelectHistory(item)}>
                    <div style={{ fontSize: 20, marginRight: 12 }}>📋</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{item.date} · {item.records} linhas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button style={modalStyles.newImportBtn} onClick={() => { setHistoryModalVisible(false); navigate('/importar'); }}>
              <span style={modalStyles.newImportBtnText}>+ Nova importação</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}