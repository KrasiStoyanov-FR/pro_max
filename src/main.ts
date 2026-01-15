import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/brand-variables.scss'
import './styles/tailwind.scss'
import { initializeBrand } from './config/brandConfig'

// Initialize brand configuration before mounting app
initializeBrand()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

