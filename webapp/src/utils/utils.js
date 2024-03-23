export const COLLES = [
    'demo',
    'sarri',
    'esquerdats',
    'berga',
    'matossers',
    'ganapies',
    'trempats',
    'arreplegats',
    'bergants',
    'falconsbcn',
    'pataquers',
    'santpedor',
    '8m',
    'llunatics',
]

export const getSubdomain = (defaultValue="demo") => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check if the hostname has at least 3 parts (subdomain, domain, and TLD)
    if (parts.length >= 3) {
      // Return the first part as the subdomain
      const subdomain = parts[0].toLowerCase();
      if (COLLES.includes(subdomain)) {
        return subdomain;
      } else {
        return defaultValue;
      }
    } else {
      // If there's no subdomain, return the default value
      return defaultValue;
    }
}

export const postAPI = (endpoint, data, callback=undefined) => {
  const headers = {
      "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557",
      "Content-Type": "application/json"
  };

  const COLLA = getSubdomain()

  fetch(`https://${COLLA}-api.tenimaleta.com:4001/api${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
  })
      .then(response => {
          if (!response.ok) {
              throw new Error(`${endpoint} - ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          callback(data);
      })
}

export const fetchAPI = (endpoint, callback, withCache=true) => {
  const headers = {
    "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557"
  };

  const COLLA = getSubdomain()
  const PRODUCTION = process.env.REACT_APP_PRODUCTION || true;
  const url = PRODUCTION === true ? `https://${COLLA}-api.tenimaleta.com:4001/api${endpoint}` : `http://localhost:4001/api${endpoint}`;
  
  // Check if withCache is true and data for the endpoint is in the cache
  if (withCache && 'caches' in window) {
    caches.open('api-cache').then(cache => {
      cache.match(url).then(response => {
        if (response) {
          // If in cache, get the cached data first
          response.json().then(data => callback(data));
        }
      });
    });
  }

  // Fetch from API and store in cache
  fetchAndCacheData(url, headers, callback);
}

export const fetchAPIquery = (endpoint, callback, withCache=true, saveCache=true, query={}) => {
  const headers = {
      "x-api-key": "453dabb4-7645-4626-a1bb-477dff3aa557"
  };

  const COLLA = getSubdomain()
  const PRODUCTION = process.env.REACT_APP_PRODUCTION || true;
  const queryString = Object.keys(query).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join('&');
  const url = PRODUCTION === true ? `https://${COLLA}-api.tenimaleta.com:4001/api${endpoint}?${queryString}` : `http://localhost:4001/api${endpoint}`;

  // Check if withCache is true and data for the endpoint is in the cache
  if (withCache && 'caches' in window) {
    caches.open('api-cache').then(cache => {
      cache.match(url).then(response => {
        if (response) {
          response.json().then(data => callback(data));
        } else {
          // If not in cache, fetch from API and store in cache
          fetchAndCacheData(url, headers, callback);
        }
      });
    });
  } else {
    // If withCache is false, fetch from API without caching
    fetchAndCacheData(url, headers, callback);
  }
}

// Helper function to fetch data from API and optionally cache it
const fetchAndCacheData = (url, headers, callback) => {
  fetch(url, { headers })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.status + ' ' + response.statusText);
      }
      return response.clone().json();
    })
    .then(data => {
      callback(data);
      if ('caches' in window) {
        caches.open('api-cache').then(cache => {
          cache.put(url, new Response(JSON.stringify(data)));
        });
      }
    })
    .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
    });
}
