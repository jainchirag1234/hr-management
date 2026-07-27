/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null,
  );
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  // user change hote hi socket connect/disconnect
  useEffect(() => {
    if (!user) {
      // logout ho gaya toh purana socket band karo
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // already connected hai toh dobara connect mat karo
    if (socketRef.current) return;

    const s = io(import.meta.env.VITE_API_URL, {
      withCredentials: true,
    });

    s.on("connect", () => {
      s.emit("register", user._id); // personal room join
      if ((user.role || "").toLowerCase() === "admin") {
        s.emit("registerAdmin"); // admin room join
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); // isse useEffect trigger hoga aur socket disconnect ho jayega
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        socket, // ab yeh kahin bhi useContext(AuthContext) se milega
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
