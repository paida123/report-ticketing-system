import axios from "axios";

const api = 'http://localhost:5002/api/v1/';

export const apiUrl = axios.create({
  baseURL: api,
  timeout: 300000,
 
});


W