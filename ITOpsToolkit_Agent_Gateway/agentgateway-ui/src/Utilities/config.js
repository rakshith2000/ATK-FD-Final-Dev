
// src/features/Utilities/config.js
import Api from "../../api/api.json";

let apiConfig = null;

/**
 * Loads config.json from public folder and merges with api.json.
 * Supports multiple base URLs (QA + Analytics).
 */
export const loadApiConfig = async () => {
  if (apiConfig) return apiConfig;

  try {
    const configResponse = await fetch("/config.json");
    const config = await configResponse.json();

    apiConfig = {
      ...config,
     };

   
  } catch (error) {
    console.error("Failed to load API configuration:", error);

    // fallback config
    // apiConfig = {
    //   qa_api_baseurl: Api.qa_api_baseurl || "",
    //   analytics_api_baseurl: Api.analytics_api_baseurl || "",
    // };
  }

  return apiConfig;
};

/**
 * Get the loaded API config
 */
export const getApiConfig = () => apiConfig;

/**
 * Build complete URL using base URL and route
 * @param {string} routeKey - Key from api.json (e.g., 'users', 'products')
 * @param {string} base - Which base to use: 'qa' (default) or 'analytics'
 */
export const buildUrl = async (routeKey, base = "qa") => {
  const config = await loadApiConfig();
  const route = config[routeKey];

  if (!route) {
    console.warn(`Route '${routeKey}' not found in api.json`);
    return config[`${base}_api_baseurl`];
  }

  if(base == "serviceNow"){
    return `${route}`
  }

  if(base == "test"){
    return `${config['qa_api_baseurl']}${route}`
  }
  if(base == "maf"){
    return `${config['new_apis_url']}${route}`
  }

  return `${config[`${base}_api_baseurl`]}${route}`;
};

export default {
  loadApiConfig,
  getApiConfig,
  buildUrl,
};

