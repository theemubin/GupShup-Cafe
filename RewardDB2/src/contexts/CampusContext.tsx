import { createContext, useContext, useState, type ReactNode } from 'react';

interface CampusContextValue {
  campusLevel: number; // 0-4 (4 = max)
  setCampusLevel: (lvl:number)=>void;
}

const CampusContext = createContext<CampusContextValue | undefined>(undefined);

export const useCampus = () => {
  const ctx = useContext(CampusContext);
  if(!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
};

export const CampusProvider = ({ children }: { children: ReactNode }) => {
  // Simulated campus level; in future fetch from Etiocracy API
  const [campusLevel, setCampusLevel] = useState<number>(2);
  return <CampusContext.Provider value={{ campusLevel, setCampusLevel }}>{children}</CampusContext.Provider>;
};
