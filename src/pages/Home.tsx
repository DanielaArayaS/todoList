// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';

import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonInput, IonButton, IonImg, IonIcon
} from '@ionic/react';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';

import { imageOutline, locateOutline } from 'ionicons/icons';

import './Home.css';

type Task = {
  id: string;
  title: string;
  description: string;
  image?: string;
  location?: { lat: number; lng: number };
  createdAt: string;
  synced?: boolean;
};

const STORAGE_KEY = 'tasks_cached';

const Home: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();

  // ============================
  // 📌 1) Cargar tareas de Storage al iniciar
  // ============================
  useEffect(() => {
    const loadData = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    };
    loadData();
  }, []);

  // ============================
  // 📌 2) Guardar tareas en Storage cada vez que cambian
  // ============================
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // ============================
  // 📡 3) Listener de red (CORREGIDO)
  // ============================
  useEffect(() => {
    const setupListener = async () => {
      const listener = await Network.addListener('networkStatusChange', status => {
        console.log('Estado de red cambió:', status);

        // Si vuelve el internet → intentar sincronizar
        if (status.connected) {
          syncTasks();
        }
      });

      return () => {
        listener.remove(); // ← aquí ya no da error
      };
    };

    setupListener();
  }, []);

  // ============================
  // 🔄 Simula sincronización con servidor
  // ============================
  const syncTasks = () => {
    console.log('🔄 Sincronizando tareas...');

    const updated = tasks.map(t => ({
      ...t,
      synced: true, // simula que ya se sincronizó
    }));

    setTasks(updated);
  };

  // ============================
  // 📸 Tomar foto
  // ============================
  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      quality: 70,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    setImage(photo.dataUrl!);
  };

  // ============================
  // 📍 Obtener ubicación actual
  // ============================
  const getLocation = async () => {
    const pos = await Geolocation.getCurrentPosition();
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
  };

  // ============================
  // ➕ Añadir tarea
  // ============================
  const addTask = () => {
    if (title.trim() === '') return;

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      image,
      location,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    setTasks([...tasks, newTask]);

    // limpiar campos
    setTitle('');
    setDescription('');
    setImage(undefined);
    setLocation(undefined);
  };

  // ============================
  // ❌ Eliminar tarea
  // ============================
  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>ToDo List Avanzada</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">

        {/* Inputs */}
        <IonInput
          placeholder="Título"
          value={title}
          onIonChange={e => setTitle(e.detail.value!)}
        />
        <IonInput
          placeholder="Descripción"
          value={description}
          onIonChange={e => setDescription(e.detail.value!)}
        />

        {/* Foto */}
        <IonButton expand="block" onClick={takePhoto}>
          <IonIcon slot="start" icon={imageOutline} />
          Tomar Foto
        </IonButton>

        {image && (
          <IonImg src={image} style={{ marginTop: 10, borderRadius: 8 }} />
        )}

        {/* Ubicación */}
        <IonButton expand="block" onClick={getLocation}>
          <IonIcon slot="start" icon={locateOutline} />
          Obtener Ubicación
        </IonButton>

        {location && (
          <p>📍 Lat: {location.lat}, Lng: {location.lng}</p>
        )}

        {/* Lista */}
        <IonList>
          {tasks.map((task, index) => (
            <IonItem key={task.id}>
              <IonLabel>
                <h2>{task.title}</h2>
                <p>{task.description}</p>
                <p>Sincronizada: {task.synced ? '✔️ Sí' : '❌ No'}</p>
              </IonLabel>

              <IonButton color="danger" onClick={() => removeTask(index)}>
                Eliminar
              </IonButton>
            </IonItem>
          ))}
        </IonList>

      </IonContent>
    </IonPage>
  );
};

export default Home;
