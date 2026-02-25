import React, { createContext, useContext, useState } from "react";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX"];

const SectionContext = createContext();

export const SectionProvider = ({ children }) => {
    const [selectedSection, setSelectedSection] = useState(() => {
        const stored = localStorage.getItem("selectedSection");
        return stored ? parseInt(stored, 10) : null;
    });

    const changeSection = (val) => {
        setSelectedSection(val);
        if (val === null) {
            localStorage.removeItem("selectedSection");
        } else {
            localStorage.setItem("selectedSection", String(val));
        }
    };

    return (
        <SectionContext.Provider value={{ selectedSection, changeSection, ROMAN }}>
            {children}
        </SectionContext.Provider>
    );
};

export const useSection = () => useContext(SectionContext);
