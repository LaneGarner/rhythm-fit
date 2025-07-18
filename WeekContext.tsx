import React, { createContext, useContext, useState } from 'react';

interface WeekContextType {
  weekOffset: number;
  setWeekOffset: (offset: number) => void;
}

const WeekContext = createContext<WeekContextType>({
  weekOffset: 0,
  setWeekOffset: () => {},
});

export const useWeekContext = () => useContext(WeekContext);

export const WeekProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [weekOffset, setWeekOffset] = useState(0);

  return (
    <WeekContext.Provider value={{ weekOffset, setWeekOffset }}>
      {children}
    </WeekContext.Provider>
  );
};
