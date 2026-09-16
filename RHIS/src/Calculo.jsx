import React, { useState, useRef } from 'react';
import styles from './Calculo.module.css';

export default function Calculo({ onCalculate, onCalculateSobreaviso }) {
  const [imported, setImported] = useState(() => !!localStorage.getItem('csvData'));
  const [fileName, setFileName] = useState(
    () => localStorage.getItem('csvFileName') || 'planilha_interjornada.csv'
  );
  const [recordCount, setRecordCount] = useState(() => {
    const d = localStorage.getItem('csvData');
    return d ? JSON.parse(d).length : 0;
  });

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

  return (
    <div className={styles.container}>
      <h2 className={styles.screenTitle}>Cálculos</h2>

      {/* Input de arquivo oculto */}
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Área de Seleção ou Exibição do Arquivo */}
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
      <div className={styles.sectionTitle}>Configuração do cálculo</div>
      <div className={styles.configCard}>
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Tipo</span>
          <span className={styles.typeHighlight}>
            Interjornada insuficiente
          </span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Limite aplicado</span>
          <span>11 horas</span>
        </div>
        <div className={styles.configRow}>
          <span className={styles.configLabel}>Registros</span>
          <span>{recordCount}</span>
        </div>
      </div>

      {/* Botões de Disparo */}
      <button
        onClick={onCalculate}
        disabled={!imported}
        className={`${styles.calcButton} ${
          imported ? styles.btnActive : styles.btnDisabled
        }`}
      >
        Calcular Interjornada
      </button>

      <button
        onClick={onCalculateSobreaviso}
        disabled={false}
        className={`${styles.calcButton} ${styles.btnActive}`}
      >
        Calcular Sobreaviso
      </button>
    </div>
  );
}