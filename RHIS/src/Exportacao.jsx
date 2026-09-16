import React, { useState, useEffect } from 'react';
import styles from './Exportacao.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Exportacao({ onReset }) {
  const [results, setResults] = useState([]);
  const [exportFileName, setExportFileName] = useState('relatorio_interjornada');
  const [summary, setSummary] = useState({
    totalColabs: 0,
    occurrences: 0,
    totalMinutes: 0,
  });

  useEffect(() => {
    const raw = localStorage.getItem('csvData');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      const parseToMin = (val) => {
        if (!val) return 0;
        const str = String(val).trim().toLowerCase();

        if (str.includes('h')) {
          const parts = str.split('h');
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1], 10) || 0;
          return h * 60 + m;
        }

        if (str.includes(',') || (str.includes('.') && !str.includes(':'))) {
          const num = parseFloat(str.replace(',', '.'));
          if (!isNaN(num)) {
            return Math.round(num * 60);
          }
        }

        const parts = str.split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parts[1] ? parseInt(parts[1], 10) || 0 : 0;
        return h * 60 + m;
      };

      const map = {};
      let totalOcc = 0;
      let grandTotalMin = 0;

      data.forEach((item) => {
        const workedMin = parseToMin(item.interjornada);
        const diffMin = workedMin < 660 ? 660 - workedMin : 0;

        if (!map[item.nome]) {
          map[item.nome] = { nome: item.nome, occurrences: 0, diffMin: 0 };
        }

        if (diffMin > 0) {
          map[item.nome].occurrences += 1;
          map[item.nome].diffMin += diffMin;
          totalOcc += 1;
          grandTotalMin += diffMin;
        }
      });

      const list = Object.values(map);
      setResults(list);
      setSummary({
        totalColabs: list.length,
        occurrences: totalOcc,
        totalMinutes: grandTotalMin,
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const formatMin = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0 && min === 0) return '0m';
    if (min === 0) return `${h}h`;
    if (h === 0) return `${min}m`;
    return `${h}h ${min}m`;
  };

  const exportCSV = () => {
    if (results.length === 0) return;

    let csvContent =
      'data:text/csv;charset=utf-8,COLABORADOR;OCORRENCIAS;HORAS A PAGAR\n';

    results.forEach((r) => {
      csvContent += `${r.nome};${r.occurrences};${formatMin(r.diffMin)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${exportFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (results.length === 0) return;

    const doc = new jsPDF();

    // Título do Documento
    doc.setFontSize(18);
    doc.setTextColor(3, 105, 161);
    doc.text('Relatório de Interjornada', 14, 22);

    // Subtítulo e data
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data de geração: ${dataAtual}`, 14, 30);

    // Resumo Geral
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo Geral:', 14, 42);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Colaboradores analisados: ${summary.totalColabs}`, 14, 48);
    doc.text(`Total de ocorrências: ${summary.occurrences}`, 14, 54);
    doc.text(`Total de horas a pagar: ${formatMin(summary.totalMinutes)}`, 14, 60);

    // Preparar dados para a tabela
    const tableColumn = ["Colaborador", "Ocorrências", "Horas a Pagar"];
    const tableRows = [];

    results.forEach(r => {
      const rowData = [
        r.nome,
        r.occurrences.toString(),
        formatMin(r.diffMin)
      ];
      tableRows.push(rowData);
    });

    // Configurar a tabela (autotable)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 68,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      margin: { top: 20 },
      didDrawPage: function (data) {
        // Footer com número da página
        const str = 'Página ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });

    doc.save(`${exportFileName}.pdf`);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.screenTitle}>Resultado</h2>

      {/* Resumo Geral */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Resumo geral</h3>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>👥</span>
            <span className={styles.summaryValue}>{summary.totalColabs}</span>
            <span className={styles.summaryLabel}>Colaboradores</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>⚠️</span>
            <span className={styles.summaryValue}>{summary.occurrences}</span>
            <span className={styles.summaryLabel}>Ocorrências</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>⏱️</span>
            <span className={styles.summaryValue}>
              {formatMin(summary.totalMinutes)}
            </span>
            <span className={styles.summaryLabel}>Total a pagar</span>
          </div>
        </div>
      </div>

      {/* Tabela por Colaborador */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Resultado por colaborador</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>COLABORADOR</th>
              <th className={`${styles.th} ${styles.center}`}>OCORRÊNCIAS</th>
              <th className={styles.th}>HORAS A PAGAR</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => (
              <tr key={idx}>
                <td className={styles.td}>{r.nome}</td>
                <td className={`${styles.td} ${styles.center}`}>
                  {r.occurrences}
                </td>
                <td className={styles.td}>
                  <span
                    className={
                      r.diffMin > 180
                        ? styles.valRed
                        : r.diffMin > 0
                          ? styles.valYellow
                          : styles.valGreen
                    }
                  >
                    {formatMin(r.diffMin)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alerta Informativo */}
      <div className={styles.alertBox}>
        <p className={styles.alertText}>
          <strong>✅ Cálculo concluído!</strong>
          <br />
          {summary.totalColabs} colaborador(es) analisado(s). Total de{' '}
          {formatMin(summary.totalMinutes)} a serem compensados.
        </p>
      </div>

      {/* Configuração de Exportação */}
      <div className={styles.exportConfig}>
        <label className={styles.exportLabel}>Nome do arquivo:</label>
        <input 
          type="text" 
          className={styles.exportInput} 
          value={exportFileName} 
          onChange={(e) => setExportFileName(e.target.value)} 
          placeholder="Nome do arquivo..."
        />
      </div>

      {/* Ações */}
      <button onClick={onReset} className={styles.btnRefazer}>
        Refazer cálculo
      </button>
      <button onClick={exportCSV} className={styles.btnExportar}>
        <span>📊</span> Exportar relatório CSV
      </button>
      <button onClick={exportPDF} className={styles.btnExportarPDF}>
        <span>📄</span> Exportar relatório PDF
      </button>
    </div>
  );
}