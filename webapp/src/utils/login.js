import axios from "axios";
import { getSubdomain } from "./utils";

const COLLA = getSubdomain();
const PRODUCTION = process.env.REACT_APP_PRODUCTION || true;
const url = PRODUCTION === true ? `https://${COLLA}-api.tenimaleta.com:4001` : `http://localhost:4001`;

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL: url,
});

function setCookie(name, value, days) {
  let date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  let expires = "expires=" + date.toUTCString();
  let sameSite = "SameSite=Lax";
  document.cookie = name + "=" + value + ";" + expires + ";path=/;" + sameSite;
}

function getCookie(name) {
  let cookieName = name + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let cookieArray = decodedCookie.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let c = cookieArray[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookieName) === 0) {
      return c.substring(cookieName.length, c.length);
    }
  }
  return "";
}

export async function loginUser(userId, password) {
  try {
    const response = await api.post("/auth/login", { userId, password });
    const token = response?.data?.token;
    if (token) {
      setCookie("token", token, 365);
      return true;
    } else {
      console.error("LOGIN ERROR: No token received");
      return false;
    }
  } catch (error) {
    console.error("LOGIN ERROR:", error?.response?.data);
    return false;
  }
}

export function logoutUser() {
  const token = getCookie("token");

  if (token) {
    try {
      // TODO
      // await api.post("/auth/logout", { token });
      setCookie("token", "", -1);
      window.location.reload();
      return true;
    } catch (error) {
      console.error("LOGOUT ERROR:", error?.response?.data);
      return false;
    }
  }
}

export async function isLoggedIn() {
  const token = getCookie("token");

  if (token) {
    try {
      const response = await api.post("/auth/isLoggedIn", { token });

      return {
        isLogged: !!response.data.isLoggedIn,
        userId: response.data.userId,
      }
    } catch (error) {
      return {
        isLogged: false,
        userId: -1,
      }
    }
  }

  return {
    isLogged: false,
    userId: -1,
  }
}