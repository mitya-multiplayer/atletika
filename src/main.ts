import '@fontsource-variable/oswald';
import '@fontsource-variable/roboto-condensed';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { requestPersistentStorage } from './lib/db/db';

requestPersistentStorage();

export default mount(App, { target: document.getElementById('app')! });
