import React from 'react';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.logoCircle}>🕒</div>
        <h2 className={styles.title}>Interjornada &amp; Sobreaviso</h2>
        <p className={styles.subtitle}>Cálculo de Horas a Pagar</p>
      </div>

      {/* Cartão principal */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Bem-vindo!</h3>
        <p className={styles.cardDesc}>
          Simplifique o cálculo de horas de interjornada e sobreaviso
        </p>

        {/* Lista de passos */}
        <div className={styles.stepsGroup}>
          <div className={styles.stepItem}>
            <span className={styles.stepIcon}>📥</span>
            <div>
              <p className={styles.stepTitle}>1. Importe seus dados</p>
              <p className={styles.stepText}>
                Selecione sua planilha em formato CSV
              </p>
            </div>
          </div>

          <div className={styles.stepItem}>
            <span className={styles.stepIcon}>🧮</span>
            <div>
              <p className={styles.stepTitle}>2. Realize os cálculos</p>
              <p className={styles.stepText}>
                O sistema identifica e calcula as horas devidas automaticamente
              </p>
            </div>
          </div>

          <div className={styles.stepItem}>
            <span className={styles.stepIcon}>📊</span>
            <div>
              <p className={styles.stepTitle}>3. Consulte os resultados</p>
              <p className={styles.stepText}>
                Visualize os resultados por colaborador e exporte o relatório
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}