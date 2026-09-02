import React, { useState, useEffect } from 'react';
import {
  Tabs,
  useGlobalSearchParams,
} from 'expo-router';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Image,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

const TABS = [
  { name: 'importar', label: 'Importar', emoji: '📥' },
  { name: 'calculos', label: 'Cálculos', emoji: '🧮' },
  { name: 'resultado', label: 'Resultado', emoji: '📊' },
  { name: 'relatorios', label: 'Relatórios', emoji: '📄' },
  { name: 'config', label: 'Config.', emoji: '⚙️' },
];

function CustomHeader({ options, route }) {
  const { email } = useGlobalSearchParams();

  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedName = await AsyncStorage.getItem(
          '@rh_dp:profile_name'
        );

        const storedPhoto = await AsyncStorage.getItem(
          '@rh_dp:profile_photo'
        );

        if (storedName) {
          setUserName(storedName);
        } else {
          const defaultName =
            typeof email === 'string'
              ? email.split('@')[0]
              : 'Usuário';

          setUserName(defaultName);
        }

        if (storedPhoto) {
          setUserPhoto(storedPhoto);
        }
      } catch (e) {
        console.warn(e);
      }
    };

    loadProfile();
  }, [email]);

  const handleSaveProfile = async () => {
    try {
      if (tempName.trim()) {
        setUserName(tempName);

        await AsyncStorage.setItem(
          '@rh_dp:profile_name',
          tempName
        );
      }

      if (userPhoto) {
        await AsyncStorage.setItem(
          '@rh_dp:profile_photo',
          userPhoto
        );
      }

      setModalVisible(false);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: 'image/*',
        });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        setUserPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleOpenModal = () => {
    setTempName(userName);
    setModalVisible(true);
  };

  return (
    <>
      <View style={headerStyles.navbar}>

        {/* Saudação */}
        <View style={headerStyles.leftWrap}>
          <View style={headerStyles.greetingWrap}>
            <Text style={headerStyles.greetingText}>
              Olá, {userName}
            </Text>
          </View>
        </View>

        {/* Título */}
        <Text style={headerStyles.navTitle}>
          {options.title || route.name}
        </Text>

        {/* Perfil */}
        <View style={headerStyles.rightWrap}>
          <TouchableOpacity
            onPress={handleOpenModal}
            style={headerStyles.navIconBtn}
            activeOpacity={0.7}
          >
            {userPhoto ? (
              <Image
                source={{ uri: userPhoto }}
                style={headerStyles.avatarIcon}
              />
            ) : (
              <Text style={headerStyles.navIcon}>
                👤
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </View>

      {/* Modal de edição de perfil */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View style={modalStyles.overlay}>

          <View style={modalStyles.card}>

            <Text style={modalStyles.title}>
              Editar Perfil
            </Text>

            <TouchableOpacity
              style={modalStyles.photoContainer}
              onPress={handleSelectPhoto}
              activeOpacity={0.8}
            >
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  style={modalStyles.photo}
                />
              ) : (
                <View
                  style={modalStyles.photoPlaceholder}
                >
                  <Text
                    style={
                      modalStyles.photoPlaceholderText
                    }
                  >
                    👤
                  </Text>
                </View>
              )}

              <Text
                style={modalStyles.photoChangeText}
              >
                Alterar foto
              </Text>
            </TouchableOpacity>

            <Text style={modalStyles.label}>
              Seu nome
            </Text>

            <TextInput
              style={modalStyles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Digite seu nome"
              placeholderTextColor="#94a3b8"
            />

            <View style={modalStyles.btnRow}>

              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() =>
                  setModalVisible(false)
                }
              >
                <Text
                  style={modalStyles.cancelBtnText}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleSaveProfile}
              >
                <Text
                  style={modalStyles.saveBtnText}
                >
                  Salvar
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>
      </Modal>
    </>
  );
}

function CustomTabBar({
  state,
  descriptors,
  navigation,
}) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map(
        (route, index) => {
          const { options } =
            descriptors[route.key];

          const tabInfo = TABS.find(
            t => t.name === route.name
          );

          if (!tabInfo) return null;

          const isFocused =
            state.index === index;

          const onPress = () => {
            const event =
              navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

            if (
              !isFocused &&
              !event.defaultPrevented
            ) {
              navigation.navigate(
                route.name,
                route.params
              );
            }
          };

          return (
            <TouchableOpacity
              key={route.name}
              style={tabStyles.item}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Text style={tabStyles.emoji}>
                {tabInfo.emoji}
              </Text>

              <Text
                style={[
                  tabStyles.label,
                  isFocused &&
                    tabStyles.labelActive,
                ]}
              >
                {tabInfo.label}
              </Text>

              {isFocused && (
                <View
                  style={tabStyles.indicator}
                />
              )}
            </TouchableOpacity>
          );
        }
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => (
        <CustomTabBar {...props} />
      )}
      screenOptions={{
        header: props => (
          <CustomHeader {...props} />
        ),

        animation: 'shift',

        sceneStyle: {
          backgroundColor: '#0f172a',
        },
      }}
    >
      <Tabs.Screen
        name="importar"
        options={{
          title: 'Importar Tabela',
        }}
      />

      <Tabs.Screen
        name="calculos"
        options={{
          title: 'Cálculos',
        }}
      />

      <Tabs.Screen
        name="resultado"
        options={{
          title: 'Resultado',
        }}
      />
    </Tabs>
  );
}

const headerStyles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1e40af',
  },

  navIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },

  navIcon: {
    fontSize: 20,
    color: '#f8fafc',
  },

  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },

  leftWrap: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  rightWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  greetingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },

  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  photoPlaceholderText: {
    fontSize: 36,
  },

  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#1e40af',
  },

  photoChangeText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '700',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 32,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },

  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#1e40af',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },

  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 8,
  },

  item: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },

  emoji: {
    fontSize: 20,
    marginBottom: 2,
  },

  label: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  labelActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  indicator: {
    marginTop: 3,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },
});