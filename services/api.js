// services/api.js
const API_BASE_URL = "https://educore-be.vercel.app"; // Ganti dengan URL backend Anda

// Helper untuk mendapatkan token dari localStorage
export const getToken = () => {
  return localStorage.getItem("token");
};

// Helper untuk menyimpan token
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

// Helper untuk menghapus token (logout)
export const removeToken = () => {
  localStorage.removeItem("token");
};

// Fungsi login
export const login = async (email, password, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    if (data.token) {
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", role);
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Fungsi register siswa
export const registerSiswa = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/siswa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

// Fungsi register guru
export const registerGuru = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register/guru`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

// Fungsi untuk mendapatkan profile berdasarkan role
export const getProfile = async (role) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No token found");
    }

    const endpoint = role === "siswa" ? "/siswa/profile" : "/guru/profile";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        window.location.href = "/login";
      }
      throw new Error("Failed to fetch profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Profile fetch error:", error);
    throw error;
  }
};
