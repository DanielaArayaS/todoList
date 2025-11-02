import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonInput, IonButton } from '@ionic/react';
import './Home.css';



const Home: React.FC = () => {
  const [tasks, setTasks] = useState<{title: string, description: string}[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const addTask = () => {
    if (title.trim() === '') return;
    setTasks([...tasks, { title, description }]);
    setTitle('');
    setDescription('');
  };

  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>ToDo List</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
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
        <IonButton expand="block" onClick={addTask}>Agregar Tarea</IonButton>

        <IonList>
          {tasks.map((task, index) => (
            <IonItem key={index}>
              <IonLabel>
                <h2>{task.title}</h2>
                <p>{task.description}</p>
              </IonLabel>
              <IonButton color="danger" onClick={() => removeTask(index)}>Eliminar</IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
