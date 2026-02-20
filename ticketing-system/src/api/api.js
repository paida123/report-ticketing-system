import axios from "axios";

const api = 'http://localhost:5002/api/v1/';

export const apiUrl = axios.create({
  baseURL: api,
  timeout: 300000,
  withCredentials: true, // Important: sends cookies with requests
});

// Create a separate instance for public endpoints (login, etc.)
export const apiPublic = axios.create({
  baseURL: api,
  timeout: 300000,
  withCredentials: true,
});