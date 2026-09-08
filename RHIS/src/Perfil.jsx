import React, { useState, useRef } from 'react';
import styles from './Perfil.module.css';

export default function Perfil({
  onClose,
  userName,
  setUserName,
  userAvatar,
  setUserAvatar,
}) {
  const [name, setName] = useState(
    () => localStorage.getItem('userName') || userName || 'Geregotango'
  );
  const [avatar, setAvatar] = useState(
    () =>
      localStorage.getItem('userAvatar') ||
      userAvatar ||
      'https://via.placeholder.com/80'
  );

  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatar(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userAvatar', avatar);
    if (setUserName) setUserName(name);
    if (setUserAvatar) setUserAvatar(avatar);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Editar Perfil</h3>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          style={{ display: 'none' }}
        />

        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            <img src={avatar} alt="Foto de perfil" className={styles.avatar} />
          </div>
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={styles.changePhotoBtn}
          >
            Alterar foto
          </button>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Seu nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelBtn}>
            Cancelar
          </button>
          <button onClick={handleSave} className={styles.saveBtn}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}