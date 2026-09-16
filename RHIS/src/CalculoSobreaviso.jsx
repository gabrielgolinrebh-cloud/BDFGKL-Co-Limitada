import React, { useState, useRef, useEffect } from 'react';
import styles from './CalculoSobreaviso.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CalculoSobreaviso({ onBack }) {
  const [rows, setRows] = useState([
    { id: Date.now(), nome: '', sabado: '', domingo: '' }
  ]);

  // Estado do popup de colagem
  const [pastePopup, setPastePopup] = useState(null); // { rowIndex, field }
  const [pasteInput, setPasteInput] = useState('');
  const [parsedTimes, setParsedTimes] = useState([null, null, null, null]);
  const pasteInputRef = useRef(null);

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), nome: '', sabado: '', domingo: '' }]);
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleRemoveRow = (index) => {
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const parseTimeToMinutes = (val) => {
    if (!val) return 0;
    let str = val.toString().toLowerCase().trim();

    // Permite uso de vírgula para decimais (ex: 2,5 -> 2.5)
    str = str.replace(',', '.');

    if (str.includes(':')) {
      const [h, m] = str.split(':');
      return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
    }

    let h = 0;
    let m = 0;

    const hMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
    if (hMatch) h = parseFloat(hMatch[1]) || 0;

    const mMatch = str.match(/(\d+)\s*m/);
    if (mMatch) m = parseInt(mMatch[1]) || 0;

    if (hMatch || mMatch) {
      return Math.round(h * 60 + m);
    }

    // Se for apenas um número sem letras (ex: "2"), assumimos que é em HORAS (2h)
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return Math.round(num * 60);
    }

    return 0;
  };

  const detectFormat = (val1, val2) => {
    const v1 = (val1 || '').toString().toLowerCase();
    const v2 = (val2 || '').toString().toLowerCase();

    const isV1Colon = v1.includes(':');
    const isV2Colon = v2.includes(':');
    const isV1H = v1.includes('h');
    const isV2H = v2.includes('h');

    // Se forem diferentes, como pedido, prefira o colon (8:30)
    if ((isV1Colon && isV2H) || (isV1H && isV2Colon)) {
      return 'colon';
    }

    if (isV1Colon || isV2Colon) return 'colon';

    if (v1.includes('min') || v2.includes('min')) return 'hmin';
    if (v1.includes('m') || v2.includes('m') || isV1H || isV2H) return 'hm';

    return 'colon'; // fallback padrão se só digitarem números inteiros
  };

  const formatResult = (minutos, formatType) => {
    if (minutos === 0) return '0:00';

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    const mm = m.toString().padStart(2, '0');

    if (formatType === 'colon') {
      return `${h}:${mm}`;
    } else if (formatType === 'hmin') {
      if (h > 0 && m > 0) return `${h}h${mm}min`;
      if (h > 0) return `${h}h`;
      return `${m}min`;
    } else {
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    }
  };

  // --- Lógica do Popup de Colagem ---

  // Parseia um horário no formato HH:MM (ex: "08:30", "17:45")
  const parseClockTime = (str) => {
    if (!str) return null;
    str = str.trim();
    // Aceita formatos: 8:30, 08:30, 8h30, 08h30
    let match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return { h: parseInt(match[1]), m: parseInt(match[2]), raw: str };
    }
    match = str.match(/^(\d{1,2})h(\d{2})$/i);
    if (match) {
      return { h: parseInt(match[1]), m: parseInt(match[2]), raw: str };
    }
    // Aceita formato sem separador: 0830 -> 08:30
    match = str.match(/^(\d{2})(\d{2})$/);
    if (match) {
      return { h: parseInt(match[1]), m: parseInt(match[2]), raw: `${match[1]}:${match[2]}` };
    }
    return null;
  };

  const clockTimeToMinutes = (t) => {
    if (!t) return 0;
    return t.h * 60 + t.m;
  };

  const formatMinutesToClock = (totalMin) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Identifica os 4 horários a partir do texto colado
  const parsePastedText = (text) => {
    if (!text) return [null, null, null, null];
    // Separa por espaço, traço, tab, ponto-e-vírgula, ou vírgula
    const parts = text.trim().split(/[\s\-\t;,]+/).filter(Boolean);
    if (parts.length < 4) {
      // Tenta preencher o que tiver
      const result = [null, null, null, null];
      parts.forEach((p, i) => { if (i < 4) result[i] = parseClockTime(p); });
      return result;
    }
    return [
      parseClockTime(parts[0]),
      parseClockTime(parts[1]),
      parseClockTime(parts[2]),
      parseClockTime(parts[3]),
    ];
  };

  // Abre o popup ao clicar 2x na célula
  const handleDoubleClick = (index, field) => {
    setPastePopup({ rowIndex: index, field });
    setPasteInput('');
    setParsedTimes([null, null, null, null]);
  };

  // Quando o input do popup muda (ao colar)
  const handlePasteInputChange = (text) => {
    setPasteInput(text);
    setParsedTimes(parsePastedText(text));
  };

  // Calcula o resultado: (saida1 - entrada1) + (saida2 - entrada2)
  const calcPasteResult = () => {
    const [e1, s1, e2, s2] = parsedTimes;
    if (!e1 || !s1 || !e2 || !s2) return null;

    const diff1 = clockTimeToMinutes(s1) - clockTimeToMinutes(e1);
    const diff2 = clockTimeToMinutes(s2) - clockTimeToMinutes(e2);
    const total = diff1 + diff2;
    return total;
  };

  // Confirma e devolve o resultado à célula
  const handlePasteConfirm = () => {
    const totalMin = calcPasteResult();
    if (totalMin !== null && pastePopup) {
      const formatted = formatMinutesToClock(totalMin);
      handleRowChange(pastePopup.rowIndex, pastePopup.field, formatted);
    }
    setPastePopup(null);
    setPasteInput('');
    setParsedTimes([null, null, null, null]);
  };

  const handlePopupKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePasteConfirm();
    }
    if (e.key === 'Escape') {
      setPastePopup(null);
    }
  };

  // Foca o input do popup quando ele abre
  useEffect(() => {
    if (pastePopup && pasteInputRef.current) {
      pasteInputRef.current.focus();
    }
  }, [pastePopup]);

  const pasteResultMin = calcPasteResult();
  const allParsed = parsedTimes.every(t => t !== null);

  // --- Exportação CSV ---
  const exportCSV = () => {
    if (rows.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,NOME;SABADO;DOMINGO;RESULTADO\n';

    rows.forEach((row) => {
      const sabMin = parseTimeToMinutes(row.sabado);
      const domMin = parseTimeToMinutes(row.domingo);
      const diff = 720 - (sabMin + domMin);
      const fmt = detectFormat(row.sabado, row.domingo);
      const resultado = formatResult(diff, fmt);
      csvContent += `${row.nome || ''};${row.sabado || ''};${row.domingo || ''};${resultado}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sobreaviso.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Exportação PDF ---
  const exportPDF = () => {
    if (rows.length === 0) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(3, 105, 161);
    doc.text('Relatório de Sobreaviso', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data de geração: ${dataAtual}`, 14, 30);

    const tableColumn = ['Nome', 'Sábado (4h)', 'Domingo (8h)', 'Resultado'];
    const tableRows = [];

    rows.forEach((row) => {
      const sabMin = parseTimeToMinutes(row.sabado);
      const domMin = parseTimeToMinutes(row.domingo);
      const diff = 720 - (sabMin + domMin);
      const fmt = detectFormat(row.sabado, row.domingo);
      const resultado = formatResult(diff, fmt);
      tableRows.push([row.nome || '', row.sabado || '', row.domingo || '', resultado]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199] },
      styles: { fontSize: 10, cellPadding: 4 },
      alternateRowStyles: { fillColor: [240, 247, 255] },
      didDrawPage: function (data) {
        const str = 'Página ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });

    doc.save('sobreaviso.pdf');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.screenTitle}>Cálculo de Sobreaviso</h2>
      </div>

      <p className={styles.description}>
        Preencha as horas trabalhadas (ex: <strong>8h30min</strong>, <strong>8:30</strong>, ou <strong>2</strong> para 2 horas). Clique 2x na célula para colar horários de ponto. O cálculo faz a diferença entre 12 horas e exibe o resultado no mesmo formato.
      </p>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Sábado (4h)</th>
              <th>Domingo (8h)</th>
              <th>Resultado</th>
              <th>Excluir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const sabadoNum = parseTimeToMinutes(row.sabado);
              const domingoNum = parseTimeToMinutes(row.domingo);
              const somaMinutos = sabadoNum + domingoNum;
              const diferencaMinutos = 720 - somaMinutos;

              const rowFormat = detectFormat(row.sabado, row.domingo);
              const resultadoFormatado = formatResult(diferencaMinutos, rowFormat);

              return (
                <tr key={row.id}>
                  <td>
                    <input
                      type="text"
                      className={styles.inputTable}
                      placeholder="Nome do colaborador"
                      value={row.nome}
                      onChange={(e) => handleRowChange(index, 'nome', e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(index, 'sabado')}>
                    <input
                      type="text"
                      className={styles.inputTable}
                      placeholder="Ex: 8h30min ou 8:30"
                      value={row.sabado}
                      onChange={(e) => handleRowChange(index, 'sabado', e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </td>
                  <td onDoubleClick={() => handleDoubleClick(index, 'domingo')}>
                    <input
                      type="text"
                      className={styles.inputTable}
                      placeholder="Ex: 8h30min ou 8:30"
                      value={row.domingo}
                      onChange={(e) => handleRowChange(index, 'domingo', e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </td>
                  <td className={styles.resultCell}>
                    {resultadoFormatado}
                  </td>
                  <td>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemoveRow(index)}
                      title="Remover linha"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        <button className={styles.addBtn} onClick={handleAddRow}>
          + Adicionar Linha
        </button>
      </div>

      <div className={styles.exportActions}>
        <button onClick={exportCSV} className={styles.btnExportar}>
          <span>📊</span> Exportar CSV
        </button>
        <button onClick={exportPDF} className={styles.btnExportarPDF}>
          <span>📄</span> Exportar PDF
        </button>
      </div>

      {/* Popup de Colagem */}
      {pastePopup && (
        <div className={styles.popupOverlay} onClick={() => setPastePopup(null)}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.popupTitle}>
              Colar Horários de Ponto — {pastePopup.field === 'sabado' ? 'Sábado' : 'Domingo'}
            </h3>
            <p className={styles.popupDesc}>
              Cole os 4 horários separados por espaço ou traço (Entrada - Saída - Entrada - Saída). Pressione <strong>Enter</strong> para confirmar.
            </p>

            <input
              ref={pasteInputRef}
              type="text"
              className={styles.popupInput}
              placeholder="Ex: 08:00 12:00 13:00 17:00"
              value={pasteInput}
              onChange={(e) => handlePasteInputChange(e.target.value)}
              onKeyDown={handlePopupKeyDown}
            />

            {/* Tabela de prévia */}
            <div className={styles.popupTableContainer}>
              <table className={styles.popupTable}>
                <thead>
                  <tr>
                    <th>Entrada 1</th>
                    <th>Saída 1</th>
                    <th>Entrada 2</th>
                    <th>Saída 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {parsedTimes.map((t, i) => (
                      <td key={i} className={t ? styles.popupParsedOk : styles.popupParsedEmpty}>
                        {t ? t.raw : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Resultado calculado */}
            {allParsed && pasteResultMin !== null && (
              <div className={styles.popupResult}>
                Total trabalhado: <strong>{formatMinutesToClock(pasteResultMin)}</strong>
              </div>
            )}

            <div className={styles.popupActions}>
              <button className={styles.popupCancelBtn} onClick={() => setPastePopup(null)}>
                Cancelar
              </button>
              <button
                className={styles.popupConfirmBtn}
                onClick={handlePasteConfirm}
                disabled={!allParsed}
              >
                Confirmar (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}