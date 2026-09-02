import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─── Chaves de armazenamento (mesmas do importar.tsx) ───────────────────── */

const STORAGE_KEY_ROWS    = '@rh_dp:csv_rows';
const STORAGE_KEY_FILE    = '@rh_dp:ultimo_arquivo';
const STORAGE_KEY_RESULT  = '@rh_dp:resultado_calculo'; // resultado gravado para resultado.tsx

/* ─── Motor de cálculo ───────────────────────────────────────────────────── */

const LIMITE_MINUTOS = 11 * 60; // 11 horas em minutos

/**
 * Converte valor de interjornada para minutos.
 * Aceita: "8", "08:35", "7:15", "10:30", "08:35:00" (HH:MM:SS)
 */
function parsearMinutos(valor) {
  // Remove BOM residual e limpa espaços
  const v = valor.trim().replace(/^\uFEFF/, '').replace(',', '.');
  if (!v || v === '-') return 0;

  if (v.includes(':')) {
    const partes = v.split(':');
    const h = parseInt(partes[0], 10) || 0;
    const m = parseInt(partes[1], 10) || 0;
    // partes[2] são segundos — ignorados
    return h * 60 + m;
  }
  // Apenas número (ex: "8" ou "9.5")
  const h = parseFloat(v);
  if (isNaN(h)) {
    console.warn('[CALC] Valor de interjornada não reconhecido:', JSON.stringify(valor));
    return 0;
  }
  return Math.round(h * 60);
}

/**
 * Formata minutos como "Xh Ym" (ex: "2h 25m")
 */
export function formatarHorasMinutos(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Executa o cálculo de interjornada insuficiente:
 * - Para cada linha, calcula a diferença: 11h − interjornada
 * - Agrupa por colaborador, somando os minutos devidos
 */
function calcularInterjornada(rows) {
  const mapa = {};

  for (const row of rows) {
    const mins = parsearMinutos(row.interjornada);
    const diferenca = LIMITE_MINUTOS - mins; // sempre positivo pois já são < 11h

    if (!mapa[row.nome]) {
      mapa[row.nome] = { nome: row.nome, ocorrencias: 0, totalMinutosDevidos: 0 };
    }
    mapa[row.nome].ocorrencias         += 1;
    mapa[row.nome].totalMinutosDevidos += diferenca > 0 ? diferenca : 0;
  }

  // Ordenar por maior débito
  return Object.values(mapa).sort((a, b) => b.totalMinutosDevidos - a.totalMinutosDevidos);
}

/* ─── Tela principal ──────────────────────────────────────────────────────── */

export default function CalculosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('calculos');
  const [loading, setLoading]     = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);

  const [rows, setRows]         = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [resultado, setResultado] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [rawRows, rawFile, rawHistory] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_ROWS),
        AsyncStorage.getItem(STORAGE_KEY_FILE),
        AsyncStorage.getItem('@rh_dp:importacoes_recentes'),
      ]);
      if (rawRows) {
        setRows(JSON.parse(rawRows));
        setCurrentPage(1); // Reseta a paginação ao carregar
      }
      if (rawFile)    setFileInfo(JSON.parse(rawFile));
      if (rawHistory) setHistoryRecords(JSON.parse(rawHistory));
    } catch (e) {
      console.warn('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (id === 'importar')  router.push('/importar');
    if (id === 'resultado') router.push('/resultado');
  };

  const handleCalcular = async () => {
    if (rows.length === 0) {
      Alert.alert('Sem dados', 'Importe um arquivo CSV primeiro.');
      return;
    }
    setCalculando(true);

    // Pequeno delay para dar feedback visual
    await new Promise((r) => setTimeout(r, 400));

    const res = calcularInterjornada(rows);
    setResultado(res);

    // Salvar resultado para a tela de resultado
    try {
      await AsyncStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(res));
    } catch (e) { console.warn(e); }

    setCalculando(false);
    router.push('/resultado');
  };

  const handleSelectHistory = async (item) => {
    setHistoryModalVisible(false);
    if (!item.rows) {
      Alert.alert('Indisponível', 'Esta planilha foi importada em uma versão anterior do aplicativo e não possui os dados brutos salvos no histórico.\nPor favor, importe-a novamente.');
      return;
    }
    setRows(item.rows);
    const newFileInfo = { name: item.name, importedAt: item.date, records: item.records };
    setFileInfo(newFileInfo);
    setResultado(null);
    setCurrentPage(1);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ROWS, JSON.stringify(item.rows));
      await AsyncStorage.setItem(STORAGE_KEY_FILE, JSON.stringify(newFileInfo));
    } catch (e) { console.warn(e); }
  };

  /* ── Renderização ── */

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Carregando dados…</Text>
      </View>
    );
  }

  const semDados = rows.length === 0;

  /* ── Lógica de Paginação ── */
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
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>

        {/* Arquivo importado */}
        {fileInfo ? (
          <View style={styles.fileCard}>
            <View style={styles.fileCardIcon}>
              <Text style={{ fontSize: 24 }}>📋</Text>
            </View>
            <View style={styles.fileCardInfo}>
              <Text style={styles.fileCardName} numberOfLines={1}>{fileInfo.name}</Text>
              <Text style={styles.fileCardMeta}>Importado em: {fileInfo.importedAt} · {fileInfo.records.toLocaleString('pt-BR')} registros</Text>
            </View>
            <TouchableOpacity onPress={() => setHistoryModalVisible(true)} style={styles.btnTrocar}>
              <Text style={styles.trocarIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyFileCard} onPress={() => router.push('/importar')} activeOpacity={0.7}>
            <Text style={styles.emptyFileIcon}>📂</Text>
            <Text style={styles.emptyFileText}>Nenhum arquivo importado</Text>
            <Text style={styles.emptyFileLink}>Toque aqui para importar →</Text>
          </TouchableOpacity>
        )}

        {/* Tabela de dados brutos importados */}
        {!semDados && (
          <>
            <Text style={styles.sectionTitle}>Dados importados ({rows.length} linhas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrap}>
              <View>
                {/* Cabeçalho */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 130 }]}>Nome</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 60 }]}>Data</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 110 }]}>Interjornada</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 100 }]}>Diferença (11h−)</Text>
                </View>
                {/* Linhas */}
                {paginatedRows.map((row, idx) => {
                  const mins = parsearMinutos(row.interjornada);
                  const diff = LIMITE_MINUTOS - mins;
                  const isMenorQue8h = mins < 480; // 8 horas = 480 minutos
                  return (
                    <View key={`${currentPage}-${idx}`} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                      <Text style={[styles.tableCell, styles.tableCellBold, { width: 130 }]} numberOfLines={1}>
                        {row.nome}
                      </Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{row.data}</Text>
                      <Text style={[styles.tableCell, { width: 110 }, isMenorQue8h && { color: '#ef4444', fontWeight: 'bold' }]}>
                        {row.interjornada}
                      </Text>
                      <Text style={[styles.tableCell, styles.tableCellBlackBold, { width: 100 }]}>
                        {formatarHorasMinutos(diff > 0 ? diff : 0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity 
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, currentPage === 1 && { color: '#94a3b8' }]}>‹</Text>
                </TouchableOpacity>

                <View style={styles.pageNumbersWrap}>
                  {getPageNumbers().map((p, index) => {
                    if (p === '...') {
                      return <Text key={`ellipsis-${index}`} style={styles.pageEllipsis}>...</Text>;
                    }
                    return (
                      <TouchableOpacity 
                        key={`page-${p}`} 
                        onPress={() => setCurrentPage(p)}
                        style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]}
                      >
                        <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity 
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && { color: '#94a3b8' }]}>›</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Resultado pré-visualização (se já calculou) */}
        {resultado && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
              Resultado do cálculo — por colaborador
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrap}>
              <View>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 140 }]}>Colaborador</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 80 }]}>Ocorrências</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { width: 110 }]}>Total a pagar</Text>
                </View>
                {resultado.map((r, idx) => (
                  <View key={r.nome} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, styles.tableCellBold, { width: 140 }]} numberOfLines={1}>
                      {r.nome}
                    </Text>
                    <Text style={[styles.tableCell, { width: 80, textAlign: 'center' }]}>
                      {r.ocorrencias}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellHighlight, { width: 110 }]}>
                      {formatarHorasMinutos(r.totalMinutosDevidos)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Card de configuração e botão calcular */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Configuração do cálculo</Text>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Tipo</Text>
            <View style={styles.configBadge}>
              <Text style={styles.configBadgeText}>⏱ Interjornada insuficiente</Text>
            </View>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Limite aplicado</Text>
            <View style={styles.configBadge}>
              <Text style={styles.configBadgeText}>11 horas</Text>
            </View>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Registros</Text>
            <View style={styles.configBadge}>
              <Text style={styles.configBadgeText}>{rows.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.calcBtn, (semDados || calculando) && styles.calcBtnDisabled]}
            onPress={handleCalcular}
            disabled={semDados || calculando}
            activeOpacity={0.8}
          >
            {calculando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.calcBtnText}>
                  {semDados ? 'Importe um arquivo primeiro' : 'Calcular'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* Info: como funciona */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Como funciona o cálculo</Text>
            <Text style={styles.infoDesc}>
              Para cada linha do CSV, calcula-se a diferença entre 11h e o valor de
              interjornada registrado. Por exemplo: 8:35 → diferença = 2h 25m.{'\n\n'}
              Os valores de cada colaborador são somados, gerando um total de horas
              que a empresa deve compensar.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Histórico */}
      <Modal visible={historyModalVisible} transparent={true} animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={modalStyles.title}>Planilhas Recentes</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Text style={{ fontSize: 20, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {historyRecords.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>Nenhum histórico encontrado.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {historyRecords.map(item => (
                  <TouchableOpacity key={item.id} style={modalStyles.historyItem} onPress={() => handleSelectHistory(item)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 13, color: '#64748b' }}>{item.date} · {item.records} linhas</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={modalStyles.newImportBtn} onPress={() => { setHistoryModalVisible(false); router.push('/importar'); }} activeOpacity={0.8}>
              <Text style={modalStyles.newImportBtnText}>+ Nova importação</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ─── Estilos ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#ffffff' },
  content:             { flex: 1 },
  contentInner:        { padding: 24, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  fileCard:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  fileCardIcon:        { width: 44, height: 44, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  fileCardInfo:        { flex: 1 },
  fileCardName:        { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  fileCardMeta:        { fontSize: 13, color: '#64748b' },
  btnTrocar:           { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  trocarIcon:          { fontSize: 16 },
  emptyFileCard:       { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyFileIcon:       { fontSize: 32, marginBottom: 8 },
  emptyFileText:       { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  emptyFileLink:       { fontSize: 14, color: '#1e40af', fontWeight: '700' },
  sectionTitle:        { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  tableWrap:           { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginBottom: 24 },
  tableRow:            { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeader:         { backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRowAlt:         { backgroundColor: '#fafafa' },
  tableCell:           { paddingHorizontal: 10, paddingVertical: 12, fontSize: 13, color: '#1e293b' },
  tableCellHeader:     { fontWeight: '700', color: '#475569', fontSize: 12, textTransform: 'uppercase' },
  tableCellBold:       { fontWeight: '600', color: '#0f172a' },
  tableCellBlackBold:  { fontWeight: 'bold', color: '#000000' },
  paginationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -12, marginBottom: 24, gap: 12 },
  pageBtn:             { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  pageBtnDisabled:     { backgroundColor: '#ffffff', opacity: 0.5 },
  pageBtnText:         { fontSize: 18, color: '#1e40af', fontWeight: '800', marginTop: -2 },
  pageNumbersWrap:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageNumBtn:          { minWidth: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pageNumBtnActive:    { backgroundColor: '#1e40af' },
  pageNumText:         { fontSize: 14, fontWeight: '700', color: '#475569' },
  pageNumTextActive:   { color: '#ffffff' },
  pageEllipsis:        { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginHorizontal: 2 },
  configCard:          { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 },
  configTitle:         { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  configRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  configLabel:         { fontSize: 14, fontWeight: '600', color: '#475569' },
  configBadge:         { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  configBadgeText:     { fontSize: 13, color: '#1e40af', fontWeight: '700' },
  calcBtn:             { marginTop: 12, backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  calcBtnDisabled:     { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  calcBtnText:         { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  infoCard:            { flexDirection: 'row', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, gap: 12 },
  infoIcon:            { fontSize: 20, marginTop: 2 },
  infoBody:            { flex: 1 },
  infoTitle:           { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  infoDesc:            { fontSize: 14, color: '#475569', lineHeight: 22 },
});

const modalStyles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:           { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  title:          { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  historyItem:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  newImportBtn:   { marginTop: 16, backgroundColor: '#1e40af', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  newImportBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});