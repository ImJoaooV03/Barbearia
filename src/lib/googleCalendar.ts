// Environment variables are the fallback
const ENV_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ENV_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Config state (can be set dynamically)
let dynamicConfig = {
  clientId: '',
  apiKey: ''
};

export const setGoogleConfig = (config: { clientId: string, apiKey: string }) => {
  dynamicConfig = config;
};

const getClientId = () => {
  // Prefer dynamic config (DB), fallback to Env
  if (dynamicConfig.clientId) return dynamicConfig.clientId;
  if (ENV_CLIENT_ID && ENV_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID") return ENV_CLIENT_ID;
  return null;
};

const getApiKey = () => {
  if (dynamicConfig.apiKey) return dynamicConfig.apiKey;
  if (ENV_API_KEY && ENV_API_KEY !== "YOUR_GOOGLE_API_KEY") return ENV_API_KEY;
  return null;
};

// Helper to manage local storage safely
const STORAGE_KEY = 'barber_os_google_token';

const saveToken = (token: any) => {
  const expiry = new Date().getTime() + (token.expires_in * 1000);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...token, expiry_date: expiry }));
};

const getToken = () => {
  const tokenStr = localStorage.getItem(STORAGE_KEY);
  if (!tokenStr) return null;
  
  const token = JSON.parse(tokenStr);
  if (new Date().getTime() > token.expiry_date) {
    localStorage.removeItem(STORAGE_KEY);
    return null; // Token expired
  }
  return token;
};

export const clearToken = () => {
  localStorage.removeItem(STORAGE_KEY);
  if (window.gapi?.client) {
    window.gapi.client.setToken(null);
  }
};

export const isGoogleConfigured = () => {
  return !!getClientId() && !!getApiKey();
};

export const initGoogleAPI = async () => {
  const apiKey = getApiKey();
  const clientId = getClientId();

  if (!apiKey || !clientId) return false;
  
  // If already initialized with the SAME client ID, return true
  if (gapiInited && gisInited && tokenClient) return true;

  return new Promise<boolean>((resolve) => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: apiKey,
              discoveryDocs: [DISCOVERY_DOC],
            });
            
            // Check for cached token and restore session
            const cachedToken = getToken();
            if (cachedToken) {
              window.gapi.client.setToken(cachedToken);
            }
            
            gapiInited = true;
            if (gisInited) resolve(true);
          } catch (e) {
            console.error("GAPI Init Error", e);
            resolve(false);
          }
        });
      }
    };
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
      if (window.google) {
        try {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '', // defined dynamically
            error_callback: (err: any) => {
                console.error("GSI Error", err);
            }
          });
          gisInited = true;
          if (gapiInited) resolve(true);
        } catch (e) {
          console.error("GIS Init Error", e);
          resolve(false);
        }
      }
    };
    document.body.appendChild(script2);
  });
};

export const checkConnection = () => {
  return !!getToken();
};

export const handleGoogleLogin = async (): Promise<boolean> => {
  if (!isGoogleConfigured()) {
    throw new Error("Google Client ID não configurado no sistema.");
  }

  // If tokenClient is missing, try to init, but this might block popups if it takes too long
  if (!tokenClient) {
    await initGoogleAPI();
  }

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("API do Google ainda não inicializada. Aguarde alguns segundos e tente novamente."));
      return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
      }
      saveToken(resp); // Persist token
      resolve(true);
    };

    try {
      // Request new token
      if (window.gapi?.client?.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (e) {
      reject(new Error("Pop-up bloqueado pelo navegador. Por favor, permita pop-ups para este site."));
    }
  });
};

// --- API WRAPPERS ---

const ensureAuth = async () => {
  if (!gapiInited) {
    const initialized = await initGoogleAPI();
    if (!initialized) throw new Error("Google API não disponível.");
  }
  
  if (!getToken()) {
    throw new Error("Sessão do Google expirada. Por favor, reconecte.");
  }
  // Ensure gapi has the token set (in case of page reload)
  if (window.gapi?.client && !window.gapi.client.getToken()) {
    window.gapi.client.setToken(getToken());
  }
};

export const listUpcomingEvents = async () => {
  await ensureAuth();
  try {
    const response = await window.gapi.client.calendar.events.list({
      'calendarId': 'primary',
      'timeMin': (new Date()).toISOString(),
      'showDeleted': false,
      'singleEvents': true,
      'maxResults': 100, // Increased limit
      'orderBy': 'startTime',
    });
    return response.result.items;
  } catch (err: any) {
    if (err.status === 401) {
      clearToken();
      throw new Error("Sessão expirada");
    }
    throw err;
  }
};

export const createGoogleEvent = async (event: {
  summary: string;
  description: string;
  start: string;
  end: string;
}) => {
  await ensureAuth();
  try {
    const eventPayload = {
      'summary': event.summary,
      'description': event.description,
      'start': {
        'dateTime': event.start,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      'end': {
        'dateTime': event.end,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const request = window.gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': eventPayload,
    });

    const response = await request;
    return response.result;
  } catch (err: any) {
    if (err.status === 401) clearToken();
    throw err;
  }
};

export const updateGoogleEvent = async (eventId: string, event: {
  start: string;
  end: string;
}) => {
  await ensureAuth();
  try {
    const getRequest = window.gapi.client.calendar.events.get({
      'calendarId': 'primary',
      'eventId': eventId,
    });
    const existingEvent = (await getRequest).result;

    const eventPayload = {
      ...existingEvent,
      'start': {
        'dateTime': event.start,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      'end': {
        'dateTime': event.end,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const request = window.gapi.client.calendar.events.update({
      'calendarId': 'primary',
      'eventId': eventId,
      'resource': eventPayload,
    });

    const response = await request;
    return response.result;
  } catch (err: any) {
    if (err.status === 401) clearToken();
    throw err;
  }
};

export const deleteGoogleEvent = async (eventId: string) => {
  await ensureAuth();
  try {
    await window.gapi.client.calendar.events.delete({
      'calendarId': 'primary',
      'eventId': eventId,
    });
  } catch (err) {
    console.warn("Event already deleted or not found");
  }
};
