// ResultadoPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './styles';

const STORAGE_KEY_RESULT = '@rh_dp:resultado_calculo';
const STORAGE_KEY_FILE = '@rh_dp:ultimo_arquivo';

function formatarHorasMinutos(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function ResultadoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    carregarResultado();
  }, []);

  const carregarResultado = () => {
    try {
      setLoading(true);
      const rawResult = localStorage.getItem(STORAGE_KEY_RESULT);
      const rawFile = localStorage.getItem(STORAGE_KEY_FILE);
      if (rawResult) setResultado(JSON.parse(rawResult));
      if (rawFile) setFileInfo(JSON.parse(rawFile));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const totalColaboradores = resultado?.length ?? 0;
  const totalMinutos = resultado?.reduce((acc, r) => acc + r.totalMinutosDevidos, 0) ?? 0;
  const totalOcorrencias = resultado?.reduce((acc, r) => acc + r.ocorrencias, 0) ?? 0;

  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <div>Carregando resultado…</div>
      </div>
    );
  }

  const exportarCSV = () => {
    if (!resultado || resultado.length === 0) return;
    let csvContent = '\uFEFFColaborador;Ocorrencias;Horas a Pagar\n';
    resultado.forEach((r) => {
      csvContent += `"${r.nome}";${r.ocorrencias};"${formatarHorasMinutos(r.totalMinutosDevidos)}"\n`;
    });
    csvContent += `TOTAL;${totalOcorrencias};"${formatarHorasMinutos(totalMinutos)}"\n`;
    const fileName = `resultado_interjornada_${Date.now()}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!resultado) {
    return (
      <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 32, maxWidth: 800, width: '100%', margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧮</div>
          <div style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>Nenhum cálculo realizado</div>
          <div style={{ fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: '20px', marginBottom: 24 }}>Importe um arquivo CSV e execute o cálculo.</div>
          <button style={styles.goCalcBtn} onClick={() => navigate('/calculos')}>
            <span style={styles.goCalcBtnText}>Ir para Cálculos</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.contentInner}>
          {fileInfo && (
            <div style={styles.fileCard}>
              <div style={{ fontSize: 20 }}>📋</div>
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={styles.fileCardName}>{fileInfo.name}</div>
                <div style={styles.fileCardMeta}>Importado: {fileInfo.importedAt}</div>
              </div>
            </div>
          )}
          <div style={styles.sectionTitle}>Resumo geral</div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, ...styles.summaryIconBlue }}><span style={styles.summaryIconText}>👥</span></div>
              <div style={styles.summaryValue}>{totalColaboradores}</div>
              <div style={styles.summaryLabel}>Colaboradores</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, ...styles.summaryIconOrange }}><span style={styles.summaryIconText}>⚠️</span></div>
              <div style={styles.summaryValue}>{totalOcorrencias}</div>
              <div style={styles.summaryLabel}>Ocorrências</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryIcon, ...styles.summaryIconGreen }}><span style={styles.summaryIconText}>🕐</span></div>
              <div style={{ ...styles.summaryValue, ...styles.summaryValueSm }}>{formatarHorasMinutos(totalMinutos)}</div>
              <div style={styles.summaryLabel}>Total a pagar</div>
            </div>
          </div>
          <div style={styles.sectionTitle}>Resultado por colaborador</div>
          <div style={{ overflowX: 'auto', ...styles.tableWrap }}>
            <div style={{ minWidth: '100%' }}>
              <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
                <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 150 }}>Colaborador</div>
                <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 80 }}>Ocorrências</div>
                <div style={{ ...styles.tableCell, ...styles.tableCellHeader, width: 110 }}>Horas a pagar</div>
              </div>
              {resultado.map((row, idx) => (
                <div key={row.nome} style={{ ...styles.tableRow, ...(idx % 2 === 1 ? styles.tableRowAlt : {}) }}>
                  <div style={{ ...styles.tableCell, ...styles.tableCellBold, width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.nome}</div>
                  <div style={{ ...styles.tableCell, width: 80, textAlign: 'center' }}>{row.ocorrencias}</div>
                  <div style={{ ...styles.tableCell, ...styles.tableCellBlackBold, width: 110 }}>{formatarHorasMinutos(row.totalMinutosDevidos)}</div>
                </div>
              ))}
              <div style={{ ...styles.tableRow, ...styles.tableTotal }}>
                <div style={{ ...styles.tableCell, ...styles.tableCellBold, width: 150 }}>TOTAL</div>
                <div style={{ ...styles.tableCell, ...styles.tableCellBold, width: 80, textAlign: 'center' }}>{totalOcorrencias}</div>
                <div style={{ ...styles.tableCell, ...styles.tableCellBold, ...styles.tableCellBlackBold, width: 110 }}>{formatarHorasMinutos(totalMinutos)}</div>
              </div>
            </div>
          </div>
          <div style={styles.successBanner}>
            <div style={styles.successBannerIcon}>✅</div>
            <div style={styles.successBannerBody}>
              <div style={styles.successBannerTitle}>Cálculo concluído!</div>
              <div style={styles.successBannerDesc}>{totalColaboradores} colaborador(es) com interjornada insuficiente.<br />Total de {formatarHorasMinutos(totalMinutos)} a serem compensados.</div>
            </div>
          </div>
          <button style={styles.actionOutline} onClick={() => navigate('/calculos')}>
            <span style={styles.actionOutlineText}>🧮 Refazer cálculo</span>
          </button>
          <button style={styles.actionFilled} onClick={exportarCSV}>
            <span style={styles.actionFilledText}>⬇️ Exportar relatório CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}