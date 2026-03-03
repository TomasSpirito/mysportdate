import { createContext, useContext, ReactNode } from "react";

const FacilityContext = createContext<string | null>(null);

export const FacilityProvider = ({ facilityId, children }: { facilityId: string; children: ReactNode }) => (
  <FacilityContext.Provider value={facilityId}>{children}</FacilityContext.Provider>
);

export const useFacilityId = () => useContext(FacilityContext);
