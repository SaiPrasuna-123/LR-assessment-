import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const login = (credentials) => API.post("/login", credentials);
