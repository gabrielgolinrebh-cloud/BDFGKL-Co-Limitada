import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

/* ─── Chaves de armazenamento ─────────────────────────────────────────────── */

const STORAGE_KEY_RESULT = '@rh_dp:resultado_calculo';
const STORAGE_KEY_FILE   = '@rh_dp:ultimo_arquivo';

/* ─── Utilitário de formatação ────────────────────────────────────────────── */

function formatarHorasMinutos(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/* ─── Tela principal ──────────────────────────────────────────────────────── */

export default function ResultadoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('resultado');
  const [loading, setLoading] = useState(true);

  const [resultado, setResultado] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  useFocusEffect(
    useCallback(() => {
      carregarResultado();
    }, [])
  );

  const carregarResultado = async () => {
    try {
      setLoading(true);
      const [rawResult, rawFile] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_RESULT),
        AsyncStorage.getItem(STORAGE_KEY_FILE),
      ]);
      if (rawResult) setResultado(JSON.parse(rawResult));
      if (rawFile) setFileInfo(JSON.parse(rawFile));
    } catch (e) {
      console.warn('Erro ao carregar resultado:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (id === 'importar') router.push('/importar');
    if (id === 'calculos') router.push('/calculos');
  };

  /* ── Métricas totais ── */

  const totalColaboradores = resultado?.length ?? 0;
  const totalMinutos = resultado?.reduce((acc, r) => acc + r.totalMinutosDevidos, 0) ?? 0;
  const totalOcorrencias = resultado?.reduce((acc, r) => acc + r.ocorrencias, 0) ?? 0;

  /* ── Loading ── */

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Carregando resultado…</Text>
      </View>
    );
  }

  /* ── Exportação ── */

  const exportarCSV = async () => {
    if (!resultado || resultado.length === 0) return;

    // Criar conteúdo do CSV
    // Usamos BOM (\uFEFF) para garantir que Excel abra corretamente caracteres especiais
    let csvContent = '\uFEFFColaborador;Ocorrencias;Horas a Pagar\n';
    resultado.forEach((r) => {
      csvContent += `"${r.nome}";${r.ocorrencias};"${formatarHorasMinutos(r.totalMinutosDevidos)}"\n`;
    });
    csvContent += `TOTAL;${totalOcorrencias};"${formatarHorasMinutos(totalMinutos)}"\n`;

    const fileName = `resultado_interjornada_${Date.now()}.csv`;

    try {
      if (Platform.OS === 'web') {
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
      } else {
        const file = new File(Paths.document, fileName);
        file.write(csvContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert('Aviso', 'O compartilhamento não está disponível neste dispositivo, mas o arquivo foi salvo.');
        }
      }
    } catch (e) {
      console.warn('Erro ao exportar:', e);
      Alert.alert('Erro', 'Não foi possível exportar o arquivo.');
    }
  };

  /* ── Sem resultado ainda ── */

  if (!resultado) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🧮</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8, textAlign: 'center' }}>
            Nenhum cálculo realizado
          </Text>
          <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Importe um arquivo CSV e execute o cálculo na tela de Cálculos.
          </Text>
          <TouchableOpacity style={styles.goCalcBtn} onPress={() => router.push('/calculos')} activeOpacity={0.8}>
            <Text style={styles.goCalcBtnText}>Ir para Cálculos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Resultado ── */

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>

        {/* Info do arquivo */}
        {fileInfo && (
          <View style={styles.fileCard}>
            <Text style={{ fontSize: 20 }}>📋</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fileCardName} numberOfLines={1}>{fileInfo.name}</Text>
              <Text style={styles.fileCardMeta}>Importado: {fileInfo.importedAt}</Text>
            </View>
          </View>
        )}

        {/* Cards de resumo */}
        <Text style={styles.sectionTitle}>Resumo geral</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconBlue]}>
              <Text style={styles.summaryIconText}>👥</Text>
            </View>
            <Text style={styles.summaryValue}>{totalColaboradores}</Text>
            <Text style={styles.summaryLabel}>Colaboradores</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconOrange]}>
              <Text style={styles.summaryIconText}>⚠️</Text>
            </View>
            <Text style={styles.summaryValue}>{totalOcorrencias}</Text>
            <Text style={styles.summaryLabel}>Ocorrências</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconGreen]}>
              <Text style={styles.summaryIconText}>🕐</Text>
            </View>
            <Text style={[styles.summaryValue, styles.summaryValueSm]}>
              {formatarHorasMinutos(totalMinutos)}
            </Text>
            <Text style={styles.summaryLabel}>Total a pagar</Text>
          </View>
        </View>

        {/* Tabela por colaborador */}
        <Text style={styles.sectionTitle}>Resultado por colaborador</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrap}>
          <View>
            {/* Cabeçalho */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 150 }]}>Colaborador</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 80 }]}>Ocorrências</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 110 }]}>Horas a pagar</Text>
            </View>

            {/* Linhas */}
            {resultado.map((row, idx) => (
              <View key={row.nome} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellBold, { width: 150 }]} numberOfLines={1}>
                  {row.nome}
                </Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: 'center' }]}>
                  {row.ocorrencias}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellBlackBold, { width: 110 }]}>
                  {formatarHorasMinutos(row.totalMinutosDevidos)}
                </Text>
              </View>
            ))}

            {/* Linha de total */}
            <View style={[styles.tableRow, styles.tableTotal]}>
              <Text style={[styles.tableCell, styles.tableCellBold, { width: 150 }]}>TOTAL</Text>
              <Text style={[styles.tableCell, styles.tableCellBold, { width: 80, textAlign: 'center' }]}>
                {totalOcorrencias}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellBold, styles.tableCellBlackBold, { width: 110 }]}>
                {formatarHorasMinutos(totalMinutos)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Banner de sucesso */}
        <View style={styles.successBanner}>
          <Text style={styles.successBannerIcon}>✅</Text>
          <View style={styles.successBannerBody}>
            <Text style={styles.successBannerTitle}>Cálculo concluído!</Text>
            <Text style={styles.successBannerDesc}>
              {totalColaboradores} colaborador(es) com interjornada insuficiente.{'\n'}
              Total de {formatarHorasMinutos(totalMinutos)} a serem compensados.
            </Text>
          </View>
        </View>

        {/* Ações */}
        <TouchableOpacity
          style={styles.actionOutline}
          onPress={() => router.push('/calculos')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionOutlineText}>🧮  Refazer cálculo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionFilled}
          onPress={exportarCSV}
          activeOpacity={0.8}
        >
          <Text style={styles.actionFilledText}>⬇️  Exportar relatório CSV</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ─── Estilos ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  fileCardName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  fileCardMeta: { fontSize: 13, color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  summaryCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  summaryIconBlue: { backgroundColor: '#dbeafe' },
  summaryIconGreen: { backgroundColor: '#dcfce7' },
  summaryIconOrange: { backgroundColor: '#fef3c7' },
  summaryIconText: { fontSize: 20 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
  summaryValueSm: { fontSize: 16 },
  summaryLabel: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, fontWeight: '500' },
  tableWrap: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginBottom: 32 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableHeader: { backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableTotal: { backgroundColor: '#f8fafc', borderTopWidth: 2, borderTopColor: '#cbd5e1' },
  tableCell: { paddingHorizontal: 10, paddingVertical: 12, fontSize: 13, color: '#1e293b' },
  tableCellHeader: { fontWeight: '700', color: '#475569', fontSize: 12, textTransform: 'uppercase' },
  tableCellBold: { fontWeight: '700', color: '#0f172a' },
  tableCellBlackBold: { fontWeight: '800', color: '#000000' },
  successBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  successBannerIcon: { fontSize: 24, marginTop: 2 },
  successBannerBody: { flex: 1 },
  successBannerTitle: { fontSize: 15, fontWeight: '800', color: '#166534', marginBottom: 4 },
  successBannerDesc: { fontSize: 14, color: '#15803d', lineHeight: 20 },
  actionOutline: { borderWidth: 1.5, borderColor: '#1e40af', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  actionOutlineText: { color: '#1e40af', fontSize: 15, fontWeight: '700' },
  actionFilled: { backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  actionFilledText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  goCalcBtn: { backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  goCalcBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});