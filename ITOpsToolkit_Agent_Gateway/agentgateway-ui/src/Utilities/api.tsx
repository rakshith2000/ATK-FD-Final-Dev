
import axios from 'axios'
export const Api = {

  // Dedicated function for ServiceNow authentication
  serviceNowAuth: async function (url, options = {}) {
    // Use raw axios to avoid interference from apiClient interceptors
    const response = await axios.request({
      url,
      method: "GET",
      timeout: 30000,
      ...options,
    });
    return response;
  },
  keyCloakSSOPost: async function (endPoint: any, postbody: any, token: any) {
    const response = await axios.request({
      url: `${endPoint}`,
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      data: postbody,
    })
    return await response
  },
  keyCloakSSOGet: async function (endPoint: any, token: any) {
    const response = await axios.request({
      url: `${endPoint}`,
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },

    })
    return await response
  },
  keyCloakSSODelete: async function (endPoint: any, token: any) {
    const response = await axios.request({
      url: `${endPoint}`,
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    return await response
  }
}
