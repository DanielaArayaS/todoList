// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonList, IonItem, IonLabel, IonInput, IonButton, IonImg, IonIcon, IonToast
} from '@ionic/react';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';

import { imageOutline, locateOutline, cloudUploadOutline, downloadOutline } from 'ionicons/icons';

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

const API_ENDPOINT = 'http://192.168.1.51:3000'; 
const STORAGE_KEY = 'tasks_cached_v2';

const Home: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [toastMsg, setToastMsg] = useState('');

  // ---------- Cargar desde localStorage al iniciar ----------
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // ---------- Guardar en localStorage cada vez que tasks cambie ----------
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // ---------- Listener de red (cuando vuelve, intenta sincronizar) ----------
  useEffect(() => {
    const setup = async () => {
      const status = await Network.getStatus();
      if (status.connected) {
        await syncTasks(); // intenta al iniciar si hay conexión
      }
      const listener = await Network.addListener('networkStatusChange', async (s) => {
        if (s.connected) {
          setToastMsg('Conexión disponible — sincronizando...');
          await syncTasks();
        }
      });
      return () => {
        listener.remove();
      };
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]); // re-evaluamos cuando tasks cambia para que sync vea la última lista

  // ---------- Helper: POST con reintentos simples ----------
  const postWithRetry = async (url: string, body: any, retries = 3) => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp;
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000 * (4 - retries))); // espera 1s, 2s, 3s
        return postWithRetry(url, body, retries - 1);
      }
      throw err;
    }
  };

  // ---------- Sincronizar tareas no sincronizadas (real) ----------
  const syncTasks = async () => {
    const unsynced = tasks.filter(t => !t.synced);
    if (unsynced.length === 0) {
      setToastMsg('No hay tareas por sincronizar');
      return;
    }

    for (const t of unsynced) {
      try {
        const body = {
          clientId: t.id,
          title: t.title,
          description: t.description,
          image: t.image,
          location: t.location,
          createdAt: t.createdAt
        };

        // POST a /tasks (tu servidor)
        await postWithRetry(`${API_ENDPOINT}/tasks`, body, 3);

        // si llegamos aquí, fue exitoso: marcar como sincronizada
        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, synced: true } : x));
      } catch (err) {
        console.error('Error sincronizando tarea', t.id, err);
        // la tarea permanecerá con synced: false y se reintentará más tarde
      }
    }

    setToastMsg('Sincronización finalizada (intentos realizados)');
  };

  // ---------- Importar tareas desde servidor (GET) ----------
  const importTasksFromServer = async () => {
    try {
      const resp = await fetch(`${API_ENDPOINT}/tasks`);
      if (!resp.ok) throw new Error('API error ' + resp.status);
      const data = await resp.json();

      // Mapear formato server -> Task local
      const imported: Task[] = data.map((d: any) => ({
        id: d.clientId || ('srv-' + (d.serverId || d.id || Date.now())),
        title: d.title || 'Sin título',
        description: d.description || '',
        image: d.image || undefined,
        location: d.location || undefined,
        createdAt: d.createdAt || new Date().toISOString(),
        synced: true
      }));

      // Merge sin duplicados (por id)
      const merged = [...tasks];
      for (const it of imported) {
        if (!merged.some(t => t.id === it.id)) merged.push(it);
      }

      setTasks(merged);
      setToastMsg('Tareas importadas desde servidor');
    } catch (err) {
      console.error('Import error', err);
      setToastMsg('Error al importar tareas');
    }
  };

  // ---------- Cámara ----------
  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      setImage(photo.dataUrl!);
      setToastMsg('Foto tomada');
    } catch (err) {
      console.error('Camera error', err);
      setToastMsg('No se pudo tomar la foto');
    }
  };

  // ---------- Ubicación ----------
  const getLocation = async () => {
    try {
      const pos = await Geolocation.getCurrentPosition();
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setToastMsg('Ubicación obtenida');
    } catch (err) {
      console.error('Geo error', err);
      setToastMsg('No se pudo obtener la ubicación');
    }
  };

  // ---------- Crear tarea local ----------
  const addTask = () => {
    if (title.trim() === '') { setToastMsg('Título requerido'); return; }

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      image,
      location,
      createdAt: new Date().toISOString(),
      synced: false
    };

    setTasks(prev => [...prev, newTask]);

    // limpiar campos
    setTitle('');
    setDescription('');
    setImage(undefined);
    setLocation(undefined);
    setToastMsg('Tarea creada localmente (pendiente sync)');
  };

  // ---------- Eliminar ----------
  const removeTask = (index: number) => {
    setTasks(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setToastMsg('Tarea eliminada');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>ToDo List - Sync Real</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding home-content">
        <IonInput placeholder="Título" value={title} onIonChange={e => setTitle(e.detail.value!)} />
        <IonInput placeholder="Descripción" value={description} onIonChange={e => setDescription(e.detail.value!)} />

        <div className="controls-row">
          <IonButton onClick={takePhoto} color="medium"><IonIcon icon={imageOutline} /> Foto</IonButton>
          <IonButton onClick={getLocation} color="medium"><IonIcon icon={locateOutline} /> Ubicación</IonButton>
          <IonButton onClick={syncTasks} color="primary"><IonIcon icon={cloudUploadOutline} /> Sincronizar</IonButton>
          <IonButton onClick={importTasksFromServer} color="tertiary"><IonIcon icon={downloadOutline} /> Importar</IonButton>
        </div>

        {image && <div className="preview"><IonImg src={image} /></div>}
        {location && <p>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}

        <IonButton expand="block" onClick={addTask}>Agregar Tarea</IonButton>

        <IonList>
          {tasks.map((task, index) => (
            <IonItem key={task.id}>
              <IonLabel>
                <h2>{task.title}</h2>
                <p>{task.description}</p>
                {task.location && <small>📍 {task.location.lat.toFixed(5)}, {task.location.lng.toFixed(5)}</small>}
                {task.image && <IonImg src={task.image} style={{ maxWidth: 120, marginTop: 6 }} />}
                <p>Estado: {task.synced ? '✔️ Sincronizada' : '⏳ Pendiente'}</p>
              </IonLabel>
              <IonButton color="danger" onClick={() => removeTask(index)}>Eliminar</IonButton>
            </IonItem>
          ))}
        </IonList>

        <IonToast isOpen={!!toastMsg} message={toastMsg} duration={1800} onDidDismiss={() => setToastMsg('')} />
      </IonContent>
    </IonPage>
  );
};

export default Home;
