import React, { createContext, useState } from "react";

export const AdminUIContext = createContext({
  searchTerm: "",
  setSearchTerm: () => {},
});

export const AdminUIProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <AdminUIContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
      }}
    >
      {children}
    </AdminUIContext.Provider>
  );
};
