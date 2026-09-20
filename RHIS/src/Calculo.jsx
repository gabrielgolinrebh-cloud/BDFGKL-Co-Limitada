import React, { useState, useRef } from 'react';
import styles from './Calculo.module.css';

export default function Calculo({ onCalculate }) {
  const [imported, setImported] = useState(() => !!localStorage.getItem('csvData'));
  const [fileName, setFileName] = useState(
    () => localStorage.getItem('csvFileName') || 'planilha_interjornada.csv'
  );
  const [recordCount, setRecordCount] = useState(() => {
    const d = localStorage.getItem('csvData');
    return d ? JSON.parse(d).length : 0;
  });
  const [csvDataState, setCsvDataState] = useState(() => {
    const d = localStorage.getItem('csvData');
    return d ? JSON.parse(d) : [];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const [editIndex, setEditIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({ nome: '', interjornada: '' });

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
        setCsvDataState(data);
        setImported(true);
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = (index) => {
    const newData = [...csvDataState];
    newData.splice(index, 1);
    setCsvDataState(newData);
    setRecordCount(newData.length);
    localStorage.setItem('csvData', JSON.stringify(newData));

    const newTotalPages = Math.ceil(newData.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  const handleEditOpen = (index) => {
    setEditIndex(index);
    setEditFormData(csvDataState[index]);
  };

  const handleEditSave = () => {
    const newData = [...csvDataState];
    newData[editIndex] = { ...newData[editIndex], ...editFormData };
    setCsvDataState(newData);
    localStorage.setItem('csvData', JSON.stringify(newData));
    setEditIndex(null);
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

      {/* Planilha */}
      {imported && csvDataState.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Planilha Importada</div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Horas (Interjornada)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {csvDataState
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((row, idx) => {
                    const originalIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                    return (
                      <tr key={originalIndex}>
                        <td>{row.nome}</td>
                        <td>{row.interjornada}</td>
                        <td className={styles.actions}>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleEditOpen(originalIndex)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleDelete(originalIndex)}
                            title="Excluir"
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

          {/* Controles de Paginação */}
          {Math.ceil(csvDataState.length / ITEMS_PER_PAGE) > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={styles.pageBtn}
              >
                Anterior
              </button>

              <div className={styles.pageNumbers}>
                {Array.from(
                  { length: Math.ceil(csvDataState.length / ITEMS_PER_PAGE) },
                  (_, i) => i + 1
                ).map((page) => {
                  const total = Math.ceil(csvDataState.length / ITEMS_PER_PAGE);
                  if (
                    page === 1 ||
                    page === total ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`${styles.pageNumber} ${
                          currentPage === page ? styles.pageNumberActive : ''
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 3 ||
                    page === currentPage + 3
                  ) {
                    return (
                      <span key={page} style={{ color: '#94a3b8' }}>
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                disabled={
                  currentPage === Math.ceil(csvDataState.length / ITEMS_PER_PAGE)
                }
                onClick={() => setCurrentPage((p) => p + 1)}
                className={styles.pageBtn}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

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

      {/* Modal de Edição */}
      {editIndex !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Editar Registro</h3>
            <div className={styles.inputGroup}>
              <label>Nome</label>
              <input
                value={editFormData.nome}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, nome: e.target.value })
                }
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Horas (Interjornada)</label>
              <input
                value={editFormData.interjornada}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    interjornada: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setEditIndex(null)}
                className={styles.btnCancel}
              >
                Cancelar
              </button>
              <button onClick={handleEditSave} className={styles.btnSave}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}