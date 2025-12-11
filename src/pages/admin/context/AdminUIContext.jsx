import React, { createContext, useState } from "react";

export const AdminUIContext = createContext({
  searchTerm: "",
  setSearchTerm: () => {},
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
});

export const AdminUIProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AdminUIContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        mobileMenuOpen,
        setMobileMenuOpen,
      }}
    >
      {children}
    </AdminUIContext.Provider>
  );
};
