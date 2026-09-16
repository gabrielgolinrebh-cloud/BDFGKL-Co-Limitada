import React, { useState, useRef } from 'react';
import styles from './CalculoSobreaviso.module.css';

export default function CalculoSobreaviso({ onBack }) {
  const [imported, setImported] = useState(() => !!localStorage.getItem('csvData'));
  const [fileName, setFileName] = useState(
    () => localStorage.getItem('csvFileName') || 'planilha_interjornada.csv'
  );
  const [recordCount, setRecordCount] = useState(() => {
    const d = localStorage.getItem('csvData');
    return d ? JSON.parse(d).length : 0;
  });

  const [horarioSabado, setHorarioSabado] = useState('');
  const [horarioDomingo, setHorarioDomingo] = useState('');
  const [valorHora, setValorHora] = useState('');
  const [resultado, setResultado] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

      if (lines.length > 1) {
        const data = lines
          .slice(1)
          .map((line) => {
            const cols = line
              .split(/[,;]/)
              .map((c) => c.trim().replace(/^"|"$/g, ''));
            return {
              nome: cols[0] || '',
              data: cols[1] || '',
              interjornada: cols[2] || '0',
            };
          })
          .filter((item) => item.nome);

        localStorage.setItem('csvData', JSON.stringify(data));
        localStorage.setItem('csvFileName', file.name);
        setFileName(file.name);
        setRecordCount(data.length);
        setImported(true);
      }
    };
    reader.readAsText(file);
  };

  const calcularSobreaviso = () => {
    const hSab = parseFloat(horarioSabado) || 0;
    const hDom = parseFloat(horarioDomingo) || 0;
    const valor = parseFloat(valorHora) || 0;

    // O valor da hora de sobreaviso é 1/3 (33.33%) da hora normal pela CLT
    const taxaSobreaviso = 1 / 3;
    const valorSabado = hSab * valor * taxaSobreaviso;
    const valorDomingo = hDom * valor * taxaSobreaviso;
    const valorTotal = valorSabado + valorDomingo;

    setResultado({
      horasSabado: hSab,
      horasDomingo: hDom,
      valorSabado,
      valorDomingo,
      valorTotal,
    });
  };

  const baixarCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Nome,Hora de Sabado,Hora de Domingo,Total a Pagar\n' +
      `Geral,${horarioSabado || 0},${horarioDomingo || 0},${resultado ? resultado.valorTotal.toFixed(2) : 0}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'calculo_sobreaviso.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.screenTitle}>Cálculo de Sobreaviso</h2>

      {/* Input de arquivo oculto */}
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Área de Seleção de Arquivo */}
      {!imported ? (
        <div className={styles.dropzone}>
          <span className={styles.uploadIcon}>☁️</span>
          <p className={styles.dropzoneTitle}>
            Toque para selecionar seu arquivo .CSV
          </p>
          <p className={styles.dropzoneDesc}>
            Selecione o arquivo direto do seu dispositivo
          </p>
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`${styles.calcButton} ${styles.btnActive}`}
          >
            Selecionar Arquivo
          </button>
        </div>
      ) : (
        <div
          className={styles.fileCard}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.uploadIcon}>📁</span>
          <div>
            <p className={styles.fileTitle}>{fileName}</p>
            <p className={styles.fileSubtitle}>
              Importado com sucesso - {recordCount} registros
            </p>
          </div>
        </div>
      )}

      {/* Configurações do Cálculo */}
      <div className={styles.sectionTitle}>Horários de Sobreaviso</div>
      <div className={styles.configCard}>
        <div className={styles.inputGroup}>
          <label className={styles.configLabel}>Horas no Sábado</label>
          <input
            type="number"
            placeholder="Ex: 8 (horas)"
            value={horarioSabado}
            onChange={(e) => setHorarioSabado(e.target.value)}
            className={styles.inputField}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.configLabel}>Horas no Domingo</label>
          <input
            type="number"
            placeholder="Ex: 12 (horas)"
            value={horarioDomingo}
            onChange={(e) => setHorarioDomingo(e.target.value)}
            className={styles.inputField}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.configLabel}>Valor da Hora Normal (R$)</label>
          <input
            type="number"
            placeholder="Ex: 25.00"
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
            className={styles.inputField}
          />
        </div>
      </div>

      <button
        onClick={calcularSobreaviso}
        disabled={!horarioSabado && !horarioDomingo}
        className={`${styles.calcButton} ${
          horarioSabado || horarioDomingo ? styles.btnActive : styles.btnDisabled
        }`}
      >
        Calcular Sobreaviso
      </button>

      {/* Exibição dos Resultados */}
      {resultado && (
        <div className={styles.resultCard}>
          <div className={styles.sectionTitle}>Resultado do Cálculo</div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>Valor Sábado:</span>
            <span>R$ {resultado.valorSabado.toFixed(2)}</span>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>Valor Domingo:</span>
            <span>R$ {resultado.valorDomingo.toFixed(2)}</span>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>Total a Pagar:</span>
            <span className={styles.typeHighlight}>
              R$ {resultado.valorTotal.toFixed(2)}
            </span>
          </div>

          <button onClick={baixarCSV} className={`${styles.calcButton} ${styles.btnActive}`}>
            Baixar Planilha CSV
          </button>
        </div>
      )}
    </div>
  );
}