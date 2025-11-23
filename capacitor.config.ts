import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'todoList',
  webDir: 'dist',

  server: {
    androidScheme: 'https'
  },

  plugins: {
    Camera: {
      allowEditing: false,
      saveToGallery: false,
      resultType: 'dataUrl'
    },
    Geolocation: {
      backgroundPermissionRationale: {
        title: "Permitir ubicación en segundo plano",
        message: "La app necesita la ubicación para adjuntarla a las tareas.",
        buttonPositive: "Aceptar",
        buttonNegative: "Cancelar"
      }
    }
  }
};

export default config;
